"""Rockfish (Sebastes) finder: detector -> crop -> BioCLIP 2.5 (+ fine-tuned head) -> status.

Inference is ported from run_image_ft() in vic02_finetune.ipynb. All model values
(thresholds, detector settings, head, tuned ViT blocks, species prompts) come from
rockfish_model.pt. Everything is loaded once, at import.
"""
import contextlib
import os
import threading
import time
from pathlib import Path

try:
    import spaces   # ZeroGPU; must be imported before torch initialises CUDA
except ImportError:
    spaces = None

import cv2
import numpy as np
import open_clip
import requests
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image

HERE = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("ROCKFISH_MODEL", HERE / "rockfish_model.pt"))
CACHE_DIR = Path(os.environ.get("ROCKFISH_CACHE", Path.home() / ".cache" / "rockfish_space"))
CFD_URL = ("https://github.com/WildHackers/community-fish-detector/"
           "releases/download/cfd-1.00-yolov12x/cfd-yolov12x-1.00.pt")
MBARI_REPO = "FathomNet/MBARI-315k-yolov8"

# CUDA if present (or ZeroGPU, where CUDA is attached per call), else CPU. No MPS on Spaces.
ZERO_GPU = spaces is not None and bool(os.environ.get("SPACES_ZERO_GPU"))
DEVICE = "cuda" if (torch.cuda.is_available() or ZERO_GPU) else "cpu"
YOLO_DEVICE = 0 if DEVICE == "cuda" else "cpu"


def autocast():
    return torch.autocast("cuda") if DEVICE == "cuda" else contextlib.nullcontext()


@contextlib.contextmanager
def trusted_torch_load():
    """weights_only=False ONLY while loading the detector weights (never a global patch)."""
    orig = torch.load
    torch.load = lambda *a, **k: orig(*a, **{**k, "weights_only": False})
    try:
        yield
    finally:
        torch.load = orig


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


# ---------------- exported model ----------------
EXPORT = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)   # our own file
METHOD = EXPORT["method"]
DET = EXPORT["detector"]
DETECTOR_CHAIN = DET["chain"]
CFD_IMGSZ = DET["cfd_imgsz"]
DET_CONF = DET["det_conf"]
MAX_DETS = DET["max_dets"]
CROP_PAD = DET["crop_pad"]
USE_CLAHE = DET["use_clahe"]
MIN_CROP = DET["min_crop"]
MAX_BOX_FRAC = DET["max_box_frac"]
T_LOW = float(EXPORT["thresholds"]["needs_review"])
T_HIGH = float(EXPORT["thresholds"]["identified"])
SEB_SPECIES = [tuple(s) for s in EXPORT["species"]]
SPECIES_MIN = float(EXPORT["species_min"])
TEXT_SP = EXPORT["text_sp"].float().numpy()
LOGIT_SCALE = float(EXPORT["logit_scale"])
assert METHOD in ("fine-tuned", "linear probe"), METHOD


# ---------------- detectors (from the notebook) ----------------
def _download(url, dest):
    tmp = Path(str(dest) + ".part")
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    tmp.rename(dest)


def load_cfd():
    dest = CACHE_DIR / "cfd-yolov12x-1.00.pt"
    if not dest.exists():
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        log("CFD: downloading weights from GitHub ...")
        _download(CFD_URL, dest)
    from ultralytics import YOLO
    with trusted_torch_load():
        m = YOLO(str(dest))

    def detect(img_rgb):
        r = m.predict(Image.fromarray(img_rgb), conf=DET_CONF, imgsz=CFD_IMGSZ, device=YOLO_DEVICE, verbose=False)[0]
        return [(float(x1), float(y1), float(x2), float(y2), float(c), "fish")
                for (x1, y1, x2, y2), c in zip(r.boxes.xyxy.cpu().numpy(), r.boxes.conf.cpu().numpy())]
    return detect


def load_mbari_315k():
    from huggingface_hub import list_repo_files, hf_hub_download
    from ultralytics import YOLO
    pt = sorted(f for f in list_repo_files(MBARI_REPO) if f.endswith(".pt"))[0]
    with trusted_torch_load():
        m = YOLO(hf_hub_download(MBARI_REPO, pt))

    def detect(img_rgb):
        r = m.predict(Image.fromarray(img_rgb), conf=DET_CONF, device=YOLO_DEVICE, verbose=False)[0]
        return [(float(x1), float(y1), float(x2), float(y2), float(cf), r.names[int(c)])
                for (x1, y1, x2, y2), cf, c in zip(r.boxes.xyxy.cpu().numpy(),
                                                   r.boxes.conf.cpu().numpy(), r.boxes.cls.cpu().numpy())]
    return detect


LOADERS = {"cfd": load_cfd, "mbari_315k": load_mbari_315k}
DETECTORS = {}
for _name in DETECTOR_CHAIN:
    try:
        DETECTORS[_name] = LOADERS[_name](); log(f"{_name}: ready")
    except Exception as ex:
        log(f"{_name}: skipped ({type(ex).__name__}: {ex})")
assert DETECTORS, "No detector could be loaded"


def detect(img_rgb):
    for name, fn in DETECTORS.items():
        dets = fn(img_rgb)
        if dets:
            return [d + (name,) for d in dets]
    return []


def clahe(img_rgb):
    lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    lab[..., 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lab[..., 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


def crop(img_rgb, box):
    h, w = img_rgb.shape[:2]
    x1, y1, x2, y2 = box[:4]
    px, py = (x2 - x1) * CROP_PAD, (y2 - y1) * CROP_PAD
    x1, y1 = max(0, int(x1 - px)), max(0, int(y1 - py))
    x2, y2 = min(w, int(x2 + px)), min(h, int(y2 + py))
    return Image.fromarray(img_rgb[y1:y2, x1:x2])


# ---------------- BioCLIP + head ----------------
clip_model, _, clip_pre = open_clip.create_model_and_transforms(EXPORT["bioclip"])
clip_model = clip_model.to(DEVICE).eval()

_params = dict(clip_model.named_parameters())
_missing = [k for k in EXPORT["tuned_state"] if k not in _params]
assert not _missing, f"tuned_state names not in BioCLIP: {_missing[:5]}"
TUNED_STATE = {k: v.to(DEVICE) for k, v in EXPORT["tuned_state"].items()}
BASE_STATE = {k: _params[k].detach().clone() for k in TUNED_STATE}   # frozen values, to restore after scoring

D = TEXT_SP.shape[1]
head = nn.Linear(D, 1).to(DEVICE).eval()
head.load_state_dict(EXPORT["head"])
PROBE_COEF = np.asarray(EXPORT["probe"]["coef"], dtype=np.float32).reshape(-1)
PROBE_INTERCEPT = float(EXPORT["probe"]["intercept"])
_lock = threading.Lock()   # tuned/base weight swapping must not interleave
log(f"model: {METHOD} | {EXPORT['bioclip']} | detectors: {' -> '.join(DETECTORS)} | device: {DEVICE}")


def _load_weights(state):
    res = clip_model.load_state_dict(state, strict=False)
    assert not res.unexpected_keys, res.unexpected_keys


def embed(pil_images, bs=32):
    """Normalized BioCLIP image embeddings with the weights currently loaded."""
    out = []
    for i in range(0, len(pil_images), bs):
        x = torch.stack([clip_pre(im) for im in pil_images[i:i + bs]]).to(DEVICE)
        with torch.no_grad(), autocast():
            f = clip_model.encode_image(x)
        out.append(F.normalize(f.float(), dim=-1))
    return torch.cat(out)


def softmax(z):
    z = z - z.max(axis=1, keepdims=True); e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def status(score, t_low, t_high):
    if np.isnan(score): return "No detection"
    if score >= t_high: return "Identified"
    if score >= t_low:  return "Needs review"
    return "Not rockfish"


def _gpu(fn):
    return spaces.GPU(fn) if spaces is not None else fn


@_gpu
def _infer(img):
    h, w = img.shape[:2]
    dets = detect(clahe(img) if USE_CLAHE else img)
    dets = [d for d in dets if (d[2] - d[0]) * (d[3] - d[1]) <= MAX_BOX_FRAC * w * h]
    dets = sorted(dets, key=lambda d: -d[4])[:MAX_DETS]
    crops = [crop(img, d) for d in dets]
    keep = [i for i, c in enumerate(crops) if min(c.size) >= MIN_CROP]
    if not keep:
        return [dict(status="No detection", score=None, clade_rank=None, clade=None, det_label=None,
                     det_conf=None, det_source=None, box=None, plausible_species=None)]
    crops = [crops[i] for i in keep]; dets = [dets[i] for i in keep]

    with _lock:
        if METHOD == "fine-tuned":
            _load_weights(TUNED_STATE)
            try:
                with torch.no_grad():
                    s = torch.sigmoid(head(embed(crops))).squeeze(1).cpu().numpy()
            finally:
                _load_weights(BASE_STATE)
            f0 = embed(crops).cpu().numpy()              # frozen embedding, for the species hint
        else:
            f0 = embed(crops).cpu().numpy()
            s = 1.0 / (1.0 + np.exp(-(f0 @ PROBE_COEF + PROBE_INTERCEPT)))
        if DEVICE == "cuda":
            torch.cuda.synchronize()

    sp = softmax(LOGIT_SCALE * f0 @ TEXT_SP.T)
    out = []
    for i in np.argsort(-s):
        st = status(float(s[i]), T_LOW, T_HIGH); d = dets[i]
        r = dict(status=st, score=round(float(s[i]), 3),
                 clade_rank="genus" if st != "Not rockfish" else None,
                 clade="Sebastes" if st != "Not rockfish" else None,
                 det_label=d[5], det_conf=round(d[4], 2), det_source=d[6], box=[round(v) for v in d[:4]],
                 plausible_species=None)
        k = int(sp[i].argmax())
        if st == "Identified" and sp[i, k] >= SPECIES_MIN:   # hint only when confident at genus level
            r["plausible_species"] = {"name": SEB_SPECIES[k][0], "common": SEB_SPECIES[k][1],
                                      "prob": round(float(sp[i, k]), 2), "validated": False}
        out.append(r)
    return out


def run(image):
    """image: HxWx3 RGB uint8 array (grayscale / RGBA are converted). Returns (records, seconds)."""
    img = np.asarray(image)
    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)
    img = np.ascontiguousarray(img[..., :3]).astype(np.uint8, copy=False)
    t0 = time.time()
    recs = _infer(img)
    return recs, round(time.time() - t0, 2)
