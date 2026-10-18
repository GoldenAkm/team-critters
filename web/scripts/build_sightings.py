"""Build web/src/data/detections.json from real labels, most trustworthy first:

  1. data/rockfish_clean/rockfish_clean_manifest.csv  team review: tiers A_clear / B_partial -> identified, excluded -> dropped
  2. manifest.csv                                     corrected labels: positive -> identified, negative -> dropped
  3. ONC SeaTube annotations (hackathon zips on S3)    unverified: kept only if they pass the accuracy rule below

ONC frame-level labels are often wrong (only ~26% of ONC rockfish annotations were confirmed by the corrected
labels). Measured against manifest.csv, annotations made with SeaScribe or counting >= 3 fish were confirmed ~75%
of the time, so only those are kept. The rule is only measured for rockfish: lingcod annotations that pass it are
marked needs_review, never identified. Frames for kept detections are written to web/public/frames/.

Run from the repo root:  .venv/bin/python web/scripts/build_sightings.py
Needs the AWS profile `hack-team` (see DataStreaming.py).
"""
import csv
import io
import json
import zipfile
from pathlib import Path

import s3fs
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT_DATA = ROOT / 'web/src/data'
OUT_FRAMES = ROOT / 'web/public/frames'
DATA_DIR = 'ocean-hackathon-2026/data/critter'
ZIP_SITES = ['campbell_river', 'china_creek', 'hartley_bay']
SITE_TO_CAMERA = {'campbell_river': 'discovery_passage', 'hartley_bay': 'douglas_channel', 'china_creek': 'china_creek'}
RULE = 'annotation_source == SeaScribe OR Count attribute >= 3'
FRAME_WIDTH = 640


def species_for(taxon):
    if 'Sebast' in taxon:
        return 'rockfish'
    if taxon == 'Ophiodon elongatus':
        return 'lingcod'
    if taxon == 'Carcinus maenas':
        return 'green_crab'
    return None


def count_of(ann):
    for attr in json.loads(ann['taxon_attributes_json'] or '[]'):
        if attr.get('name') == 'Count':
            try:
                return int(attr.get('value'))
            except (TypeError, ValueError):
                return None
    return None


def passes_rule(ann):
    return ann['annotation_source'] == 'SeaScribe' or (count_of(ann) or 0) >= 3


def main():
    fs = s3fs.S3FileSystem(profile='hack-team')
    zips, annotations, image_of = {}, {}, {}
    for site in ZIP_SITES:
        z = zipfile.ZipFile(fs.open(f'{DATA_DIR}/{site}_images.zip'))
        zips[site] = z
        for row in csv.DictReader(io.TextIOWrapper(z.open(f'{site}_images/imaged_annotations.csv'), 'utf-8')):
            row['site'] = site
            annotations[row['annotation_id']] = row
        for row in csv.DictReader(io.TextIOWrapper(z.open(f'{site}_images/images_index.csv'), 'utf-8')):
            for aid in filter(None, row['annotation_ids'].split(';')):
                image_of[aid] = row['image_file']

    corrected = {r['image_file']: r for r in csv.DictReader(open(ROOT / 'manifest.csv'))}
    reviewed = {r['image_file']: r for r in csv.DictReader(open(ROOT / 'data/rockfish_clean/rockfish_clean_manifest.csv'))}

    detections, stats = [], {}
    for aid, ann in annotations.items():
        sp = species_for(ann['taxon_display_text'])
        if not sp:
            continue
        image = image_of.get(aid)
        review, label = reviewed.get(image), corrected.get(image)
        if sp == 'rockfish' and review:
            if review['tier'] == 'excluded':
                decision = None
            else:
                decision = ('identified', 'human', 'team_review', review['final_check_note'])
        elif sp == 'rockfish' and label and label['label'] in ('positive', 'negative'):
            decision = ('identified', 'human', 'corrected_label', f"corrected label ({label['label_source']})") \
                if label['label'] == 'positive' else None
        elif passes_rule(ann):
            status = 'identified' if sp == 'rockfish' else 'needs_review'
            decision = (status, 'onc', 'onc_annotation', None)
        else:
            decision = None
        key = (sp, decision[2] if decision else 'dropped')
        stats[key] = stats.get(key, 0) + 1
        if not decision:
            continue
        status, confirmed_by, source, note = decision
        detections.append({
            'id': '', 'speciesId': sp, 'cameraId': SITE_TO_CAMERA[ann['site']],
            'timestamp': ann['annotation_start_utc'].replace('.000Z', 'Z'),
            'status': status, 'confidence': None, 'box': None,
            'clipUrl': ann['contextual_link'] or None,
            'frameUrl': None, 'confirmedBy': confirmed_by,
            'source': source, 'note': note, 'taxon': ann['taxon_display_text'], 'count': count_of(ann),
            'oncAnnotationId': aid, 'oncAnnotator': ann['annotation_source'],
            '_image': image, '_site': ann['site'],
        })

    OUT_FRAMES.mkdir(parents=True, exist_ok=True)
    for old in OUT_FRAMES.glob('*.jpg'):
        old.unlink()
    detections.sort(key=lambda d: d['timestamp'])
    for i, d in enumerate(detections, 1):
        d['id'] = f'd{i}'
        image, site = d.pop('_image'), d.pop('_site')
        if image:
            img = Image.open(io.BytesIO(zips[site].read(f'{site}_images/{image}'))).convert('RGB')
            img.thumbnail((FRAME_WIDTH, FRAME_WIDTH))
            img.save(OUT_FRAMES / image, quality=72, optimize=True)
            d['frameUrl'] = f'/frames/{image}'

    (OUT_DATA / 'detections.json').write_text(json.dumps(detections, indent=2) + '\n')
    (OUT_DATA / 'sightings_meta.json').write_text(json.dumps({
        'rule': RULE,
        'rulePrecision': {'confirmed': 27, 'checked': 36, 'note': 'Rockfish annotations passing the rule vs manifest.csv corrected labels'},
        'baselinePrecision': {'confirmed': 70, 'checked': 274, 'note': 'All ONC rockfish annotations vs manifest.csv corrected labels'},
        'counts': {f'{sp}:{src}': n for (sp, src), n in sorted(stats.items())},
    }, indent=2) + '\n')
    for (sp, src), n in sorted(stats.items()):
        print(f'{sp:10} {src:16} {n}')
    print(f'Wrote {len(detections)} detections, {sum(1 for d in detections if d["frameUrl"])} frames')


if __name__ == '__main__':
    main()
