"""Gradio UI for the ONC rockfish finder. The 'Detect' button is also the API endpoint /predict."""
from pathlib import Path

import gradio as gr
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont

import pipeline

HERE = Path(__file__).resolve().parent
STATUS_COLOR = {"Identified": "lime", "Needs review": "gold",
                "Not rockfish": "deepskyblue", "No detection": "gray"}
COLS = ["status", "score", "clade", "species_hint", "det_conf", "det_source", "box"]

HEADER = """# Rockfish finder (Ocean Networks Canada coastal cameras)

Finds fish in an underwater frame and says whether each one is a **rockfish (genus *Sebastes*)**.
Built for frames from ONC's fixed coastal seafloor cameras.

- **Identified** means confident at the **genus** level (*Sebastes*), not the species.
- The species shown after "~" is an **unvalidated hint**: our data has no verified species labels.
- Trained and tested only on frames from **3 ONC coastal sites** (Campbell River, Hartley Bay, China Creek).
  Other cameras, aquarium or diver photos may behave differently.

Credits: data from [Ocean Networks Canada](https://www.oceannetworks.ca/) ·
[BioCLIP 2.5](https://huggingface.co/imageomics/bioclip-2.5-vith14) (Imageomics) ·
[Community Fish Detector](https://github.com/WildHackers/community-fish-detector) (AGPL-3.0) ·
[MBARI-315k](https://huggingface.co/FathomNet/MBARI-315k-yolov8) (FathomNet)
"""

LEGEND = """**Statuses**
- 🟩 **Identified** — rockfish (*Sebastes*), confident at genus level.
- 🟨 **Needs review** — might be a rockfish; a person should check.
- 🟦 **Not rockfish** — a fish (or other object) was found, but it does not look like a rockfish.
- ⬜ **No detection** — the detector found nothing in the frame.
"""


def _font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:   # Pillow < 10.1
        return ImageFont.load_default()


def box_label(r):
    if r["status"] in ("Identified", "Needs review"):
        s = f"{r['status']}: Sebastes {r['score']:.2f}"
        if r.get("plausible_species"):
            s += f"\n~ {r['plausible_species']['common']}?"
        return s
    return f"Not rockfish {r['score']:.2f}"


def draw(img, recs):
    im = Image.fromarray(img).convert("RGB")
    d = ImageDraw.Draw(im)
    scale = max(1.0, max(im.size) / 1000)
    font, lw = _font(int(14 * scale)), max(2, int(2 * scale))
    for r in recs:
        if r["box"] is None:
            bb = d.multiline_textbbox((10, 10), "No detection", font=font)
            d.rectangle([bb[0] - 4, bb[1] - 4, bb[2] + 4, bb[3] + 4], fill="gray")
            d.multiline_text((10, 10), "No detection", fill="white", font=font)
            continue
        x1, y1, x2, y2 = r["box"]; c = STATUS_COLOR[r["status"]]
        d.rectangle([x1, y1, x2, y2], outline=c, width=lw)
        text = box_label(r)
        tb = d.multiline_textbbox((0, 0), text, font=font)
        th = tb[3] - tb[1] + 4
        ty = y1 - th - 2 if y1 - th - 2 >= 0 else min(y2 + 2, im.height - th)   # keep the label inside the image
        bb = d.multiline_textbbox((x1, ty), text, font=font)
        d.rectangle([bb[0] - 2, bb[1] - 2, bb[2] + 2, bb[3] + 2], fill=c)
        d.multiline_text((x1, ty), text, fill="black", font=font)
    return np.array(im)


def predict(image):
    if image is None:
        raise gr.Error("Upload an image first.")
    recs, seconds = pipeline.run(image)
    rows = []
    for r in recs:
        sp = r.get("plausible_species")
        rows.append({"status": r["status"], "score": r["score"], "clade": r["clade"],
                     "species_hint": f"{sp['common']} ({sp['prob']:.2f}, unvalidated)" if sp else None,
                     "det_conf": r["det_conf"], "det_source": r["det_source"],
                     "box": str(r["box"]) if r["box"] is not None else None})
    print(f"predict: {len(recs)} record(s) in {seconds} s", flush=True)
    return draw(image, recs), pd.DataFrame(rows, columns=COLS)


EXAMPLES = sorted(p for ext in ("*.jpg", "*.jpeg", "*.png") for p in (HERE / "examples").glob(ext))

with gr.Blocks(title="Rockfish finder (ONC)") as demo:
    gr.Markdown(HEADER)
    with gr.Row():
        with gr.Column():
            img_in = gr.Image(type="numpy", label="Underwater frame")
            btn = gr.Button("Detect", variant="primary")
            gr.Markdown(LEGEND)
        with gr.Column():
            img_out = gr.Image(type="numpy", label="Result")
    table = gr.Dataframe(headers=COLS, label="Detections", wrap=True)
    if EXAMPLES:
        gr.Examples(examples=[[str(p)] for p in EXAMPLES], inputs=img_in, cache_examples=False)
    # one request at a time: the fine-tuned weights are swapped in and out of the shared model
    btn.click(predict, inputs=img_in, outputs=[img_out, table], api_name="predict", concurrency_limit=1)

if __name__ == "__main__":
    demo.queue().launch()
