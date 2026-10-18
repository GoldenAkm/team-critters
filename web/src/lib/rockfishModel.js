// Client for the team's rockfish model: Hugging Face Space Rena-06/rockfish-finder, endpoint /predict.
// The Space returns [annotated image, detections table, result JSON]; we use the result JSON:
//   { status: "Identified" | "Needs review" | "Not rockfish" | "No detection", score, box: [x1, y1, x2, y2],
//     species_hint, all_boxes, thresholds, model_version, seconds }
// Calls go through this site's /api/rockfish (which adds the team's token server-side) and fall back to the
// public Space directly. Never put a Hugging Face token in browser code.

export const ROCKFISH_SPACE = 'Rena-06/rockfish-finder';

let clientPromise = null;

// @gradio/client is loaded on first use so pages that never call the model don't download it.
function getClient() {
  clientPromise ??= import('@gradio/client')
    .then(({ Client }) => Client.connect(ROCKFISH_SPACE))
    .catch((e) => {
      clientPromise = null;
      throw e;
    });
  return clientPromise;
}

// Runs the model on an image (URL on this site, Blob or File).
// Returns the result JSON plus the image size, so pixel boxes can be turned into fractions.
export async function predictRockfish(image) {
  const blob = typeof image === 'string' ? await (await fetch(image)).blob() : image;
  const { width, height } = await imageSize(blob);
  const result = (await viaProxy(blob)) ?? (await viaPublicSpace(blob));
  return { result, width, height, box: toFractionBox(result.box, width, height) };
}

// The dev/preview server's /api/rockfish (web/server/rockfishProxy.js) calls the Space with the team's
// Hugging Face token, kept on the server. Returns null when there is no such server (e.g. static hosting).
async function viaProxy(blob) {
  let res;
  try {
    res = await fetch('/api/rockfish', { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
  } catch {
    return null;
  }
  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!body) return null; // no proxy here: the static host answered instead
  if (!res.ok) throw new Error(body.error ?? `Model proxy error ${res.status}`);
  return body.result;
}

// Anonymous call straight to the public Space (small free GPU quota).
async function viaPublicSpace(blob) {
  const [{ handle_file }, client] = await Promise.all([import('@gradio/client'), getClient()]);
  const job = await client.predict('/predict', { image: handle_file(blob) });
  return job.data[2];
}

// [x1, y1, x2, y2] in pixels -> { x, y, w, h } as fractions of the frame (the format both pages draw).
export function toFractionBox(box, width, height) {
  if (!box) return null;
  const [x1, y1, x2, y2] = box;
  return { x: x1 / width, y: y1 / height, w: (x2 - x1) / width, h: (y2 - y1) / height };
}

async function imageSize(blob) {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

// Plain-language reasons for the errors people actually hit with a free Space.
export function describeModelError(error) {
  const msg = String(error?.message ?? error);
  if (/ZeroGPU|quota|exceeded/i.test(msg)) {
    return 'The model has used up its free GPU time for now. Try again later.';
  }
  if (/sleep|starting|building|503|timeout|Could not resolve|fetch|metadata|could not be loaded|network/i.test(msg)) {
    return "Couldn't reach the model. It may be waking up (this can take a few minutes); try again shortly.";
  }
  return `The model couldn't check this frame: ${msg}`;
}
