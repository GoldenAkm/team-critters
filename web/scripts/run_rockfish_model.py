"""Run the team's rockfish model (Hugging Face Space Rena-06/rockfish-finder, endpoint /predict) on real ONC
frames and feed the results to Digital Fishers 2.0.

Frames: the held-out test split of manifest.csv (never used for training or for choosing thresholds), read at
full resolution from the hackathon zips on S3.

Writes:
  web/public/data/modelRuns.json     every frame's raw model result + the corrected label (for evaluation)
  web/public/data/detections.json    model detections first, ids "onc-m…", each with the raw result as "model";
                                     Marko's sample detections are kept after them
  web/public/data/reviewClips.json   one clip per Needs review / Uncertain detection, ids "onc-c…", before the samples
  web/public/frames/model/           960 px copies of the frames those detections point to

"Not rockfish" and "No detection" frames become Uncertain detections (not counted). People review them in case
the AI missed a rockfish; at most --max-uncertain of them (default 20), spread evenly over time, so empty
seafloor doesn't flood the queue. The rest stay in modelRuns.json only.
Real clips start with no prior votes: nobody else has reviewed them yet.

Run from the repo root:  .venv/bin/python web/scripts/run_rockfish_model.py [--force] [--max-uncertain N]
Needs the AWS profile `hack-team`. Results are cached in modelRuns.json, so a run that stops (e.g. the Space's
free GPU quota) continues where it left off. Put HF_TOKEN=... in web/.env.local (gitignored) to use your
own Hugging Face quota.
"""
import csv
import io
import json
import os
import sys
import tempfile
import zipfile
from pathlib import Path

import s3fs
from gradio_client import Client, handle_file
from PIL import Image

SPACE = 'Rena-06/rockfish-finder'
ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'web/public/data'
FRAMES = ROOT / 'web/public/frames/model'
DATA_DIR = 'ocean-hackathon-2026/data/critter'
FRAME_WIDTH = 960
ID_PREFIX = 'onc-'
MODEL_STATUSES = {'Identified': 'Identified', 'Needs review': 'Needs review',
                  'Not rockfish': 'Uncertain', 'No detection': 'Uncertain'}  # model status -> product status

TIP = ('Rockfish have a spiny dorsal fin along most of the back and a large head with big eyes. '
       'Lingcod and greenlings are longer and slimmer. If the fish is too small or blurry to tell, choose "Can\'t tell".')
LOOK_ALIKES = ['lingcod', 'kelp_greenling', 'Other fish']


def hf_token():
    """HF_TOKEN from the environment or the gitignored web/.env.local (never commit it)."""
    if os.environ.get('HF_TOKEN'):
        return os.environ['HF_TOKEN']
    env = ROOT / 'web/.env.local'
    for line in env.read_text().splitlines() if env.exists() else []:
        key, _, value = line.partition('=')
        if key.strip() == 'HF_TOKEN' and value.strip():
            return value.strip()
    return None


def load_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def main(force=False, max_uncertain=20):
    rows = [r for r in csv.DictReader(open(ROOT / 'manifest.csv')) if r['split'] == 'test']
    runs_path = DATA / 'modelRuns.json'
    runs = {} if force else {r['image_file']: r for r in load_json(runs_path, {}).get('frames', [])}

    fs = s3fs.S3FileSystem(profile='hack-team')
    zips = {}
    client = Client(SPACE, token=hf_token(), verbose=False)

    todo = [r for r in rows if r['image_file'] not in runs]
    print(f'{len(rows)} test frames, {len(todo)} to run')
    try:
        for i, r in enumerate(todo, 1):
            site = r['site']
            if site not in zips:
                zips[site] = zipfile.ZipFile(fs.open(f'{DATA_DIR}/{site}_images.zip'))
            raw = zips[site].read(r['image_member'])
            width, height = Image.open(io.BytesIO(raw)).size
            with tempfile.NamedTemporaryFile(suffix='.jpg') as tmp:
                tmp.write(raw)
                tmp.flush()
                _, _, result = client.predict(image=handle_file(tmp.name), api_name='/predict')
            runs[r['image_file']] = {
                'image_file': r['image_file'], 'image_member': r['image_member'], 'site': site,
                'frame_utc': r['frame_utc'], 'width': width, 'height': height,
                'label': r['label'], 'result': result,
            }
            print(f"  {i}/{len(todo)} {r['image_file']}: {result['status']} {result['score']}")
    except Exception as e:  # keep what we have; rerun to continue
        print(f'Stopped early: {e}', file=sys.stderr)
    finally:
        frames = sorted(runs.values(), key=lambda f: f['frame_utc'])
        runs_path.write_text(json.dumps({
            '_note': f'Raw results of {SPACE} /predict on the held-out test split of manifest.csv. '
                     '"label" is the corrected label, for evaluation only.',
            'space': SPACE, 'frames': frames,
        }, indent=2) + '\n')

    write_digital_fishers(frames, zips, fs, max_uncertain)
    summarize(frames)


def evenly(items, n):
    """At most n items, spread evenly over the list."""
    if len(items) <= n:
        return items
    return [items[round(i * (len(items) - 1) / max(n - 1, 1))] for i in range(n)]


def write_digital_fishers(frames, zips, fs, max_uncertain):
    det_path, clip_path = DATA / 'detections.json', DATA / 'reviewClips.json'
    samples = [d for d in load_json(det_path, {})['detections'] if not str(d['id']).startswith(ID_PREFIX)]
    sample_clips = [c for c in load_json(clip_path, {})['clips'] if not str(c['id']).startswith(ID_PREFIX)]

    FRAMES.mkdir(parents=True, exist_ok=True)
    for old in FRAMES.glob('*.jpg'):
        old.unlink()

    uncertain = evenly([f for f in frames if MODEL_STATUSES.get(f['result']['status']) == 'Uncertain'], max_uncertain)
    keep = {f['image_file'] for f in uncertain}
    detections, clips = [], []
    for f in frames:
        res = f['result']
        status = MODEL_STATUSES.get(res['status'])
        if not status or (status == 'Uncertain' and f['image_file'] not in keep):
            continue
        n = len(detections) + 1
        site = f['site']
        if site not in zips:
            zips[site] = zipfile.ZipFile(fs.open(f'{DATA_DIR}/{site}_images.zip'))
        img = Image.open(io.BytesIO(zips[site].read(f['image_member']))).convert('RGB')
        img.thumbnail((FRAME_WIDTH, FRAME_WIDTH))
        img.save(FRAMES / f['image_file'], quality=80, optimize=True)
        det = {
            'id': f'{ID_PREFIX}m{n}', 'species': 'rockfish', 'camera': site,
            'timestamp': f['frame_utc'].replace('.000Z', 'Z'),
            'status': status, 'confidence': res['score'], 'box': fraction_box(res['box'], f),
            'clipUrl': None, 'frameUrl': f'/frames/model/{f["image_file"]}',
            'source': 'model', 'modelVersion': res['model_version'], 'model': res,
        }
        detections.append(det)
        if status != 'Identified':
            clips.append({
                'id': f'{ID_PREFIX}c{len(clips) + 1}', 'detectionId': det['id'],
                'lookAlikes': LOOK_ALIKES, 'tip': TIP,
                'priorVotes': {'yes': 0, 'no': 0, 'unsure': 0},
            })

    note = (f'Ids starting "{ID_PREFIX}" are real output of {SPACE} on ONC frames '
            '(written by web/scripts/run_rockfish_model.py). The rest are illustrative samples.')
    splice(det_path, 'detections', detections, note)
    splice(clip_path, 'clips', clips, note + ' Real clips have no prior votes yet.')
    print(f'Digital Fishers: {len(detections)} model detections, {len(clips)} clips to review '
          f'(+ {len(samples)} sample detections, {len(sample_clips)} sample clips)')


def fraction_box(box, f):
    """[x1, y1, x2, y2] in pixels -> { x, y, w, h } as fractions of the frame; None when nothing was detected."""
    if not box:
        return None
    x1, y1, x2, y2 = box
    return {'x': round(x1 / f['width'], 4), 'y': round(y1 / f['height'], 4),
            'w': round((x2 - x1) / f['width'], 4), 'h': round((y2 - y1) / f['height'], 4)}


def compact(value):
    """One-line JSON in the files' existing style: { "k": v, ... } with spaces inside braces."""
    if isinstance(value, dict):
        return '{ ' + ', '.join(f'{json.dumps(k)}: {compact(v)}' for k, v in value.items()) + ' }'
    if isinstance(value, list):
        return '[' + ', '.join(compact(v) for v in value) + ']'
    return json.dumps(value)


def splice(path, key, items, note):
    """Replace our "onc-" lines at the top of the `key` array, leaving every other line byte-for-byte as it was."""
    lines = path.read_text().split('\n')
    lines = [l for l in lines if not l.lstrip().startswith(f'{{ "id": "{ID_PREFIX}') and '"_modelNote"' not in l]
    start = next(i for i, l in enumerate(lines) if l.strip() == f'"{key}": [')
    end = next(i for i in range(start + 1, len(lines)) if lines[i].strip().startswith(']'))
    body = [l.rstrip().rstrip(',') for l in lines[start + 1:end]]
    body = ['    ' + compact(item) for item in items] + body
    body = [l + (',' if i < len(body) - 1 else '') for i, l in enumerate(body)]
    lines[start + 1:end] = body
    if items:
        lines.insert(1, f'  "_modelNote": {json.dumps(note)},')
    path.write_text('\n'.join(lines))


def summarize(frames):
    table = {}
    for f in frames:
        key = (f['result']['status'], f['label'])
        table[key] = table.get(key, 0) + 1
    print('status vs corrected label:')
    for (status, label), n in sorted(table.items()):
        print(f'  {status:13} {label:9} {n}')


if __name__ == '__main__':
    args = sys.argv[1:]
    cap = int(args[args.index('--max-uncertain') + 1]) if '--max-uncertain' in args else 20
    main(force='--force' in args, max_uncertain=cap)
