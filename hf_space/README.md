---
title: Rockfish Finder (ONC)
emoji: 🐟
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: 6.30.0
python_version: "3.12"
app_file: app.py
license: agpl-3.0
pinned: false
short_description: Finds rockfish (Sebastes) in ONC coastal camera frames
---

# Rockfish finder — model card

Detects fish in frames from Ocean Networks Canada (ONC) fixed coastal seafloor cameras and decides
whether each one is a **rockfish (genus *Sebastes*)**. Built during the 2026 Victoria Ocean Hackathon
(team critters, challenge VIC02).

## Pipeline

1. **Detection** on a CLAHE-enhanced copy of the frame: Community Fish Detector (YOLOv12x, one class
   "fish"), with MBARI-315k (YOLOv8) as a fallback only when CFD finds nothing.
   Confidence ≥ 0.25, image size 1024, at most 10 boxes per frame.
2. **Crop** each box from the *original* frame with 15% padding; crops under 16 px are dropped.
3. **Classify**: BioCLIP 2.5 (ViT-H/14) with its last 2 transformer blocks fine-tuned on ONC frames,
   plus a linear head → rockfish score in [0, 1].
4. **Status** from two thresholds learned on the validation set
   (Needs review ≥ 0.112, Identified ≥ 0.884).
5. **Species hint** (Identified boxes only): zero-shot BioCLIP over 6 *Sebastes* species, shown only if
   its probability ≥ 0.60. **Not validated**: the training data has no species-level labels.

## Statuses

| status | meaning |
|---|---|
| Identified | rockfish, confident at genus (*Sebastes*) level |
| Needs review | possibly a rockfish; should be checked by a person |
| Not rockfish | something was detected, but it does not look like a rockfish |
| No detection | the detector found nothing |

## Results (held-out test set — preliminary)

Test set: **63 frames, 12 with rockfish**, from camera-days not used in training. Thresholds were picked
on validation, not test.

- **Identified: 6 frames, all correct** — 0 false identifications.
- **All 12 rockfish frames** were either Identified or sent to Needs review (none missed).
- **17 of 51 non-rockfish frames** were sent to Needs review.

This is a small sample (12 positives), so these numbers have wide uncertainty and should be treated
as preliminary.

## Limitations

- Trained and tested only on **3 ONC coastal sites** (Campbell River, Hartley Bay, China Creek) and
  4 fixed cameras; test frames come from the same cameras on different days. Other cameras, lighting,
  aquarium or diver photos may behave differently.
- Labels are frame-level (rockfish present / absent) — mostly AI-assisted labels with partial human
  review, no bounding boxes. Errors in labels carry over into the model.
- **Genus only.** Species hints (e.g. copper vs quillback rockfish) are unvalidated.
- A rockfish the detector misses can never be found; small, distant or partly hidden fish are hardest.
- Scores are not calibrated probabilities. Use the statuses, and keep a person in the loop for
  anything used in research or management.

## Credits

- Data: [Ocean Networks Canada](https://www.oceannetworks.ca/) coastal camera footage.
- [BioCLIP 2.5](https://huggingface.co/imageomics/bioclip-2.5-vith14) — Imageomics (MIT licence).
- [Community Fish Detector](https://github.com/WildHackers/community-fish-detector) — WildHackers
  (AGPL-3.0; this Space is therefore AGPL-3.0).
- [MBARI-315k YOLOv8](https://huggingface.co/FathomNet/MBARI-315k-yolov8) — FathomNet / MBARI
  (CC-BY-4.0).
