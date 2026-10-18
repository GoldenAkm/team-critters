# Digital Fishers 2.0

Page at `/digital-fishers/` (entry `web/digital-fishers/index.html`), part of the site in `web/`. Page code lives in this folder; the 3D viewer is in `src/components/` and the shared data layer and player store in `src/lib/`.

```bash
cd web
npm install
npm run dev     # http://localhost:5173/digital-fishers
npm test        # consensus + player store tests (node --test)
```

## Where things plug in

| What | Where | Notes |
|---|---|---|
| AI model output | `public/data/detections.json` | Same fields as `/identify`: `species`, `camera`, `timestamp`, `status` (`Identified` / `Uncertain` / `Needs review`), `confidence`, `box`, `clipUrl`, `frameUrl`. Only `src/lib/detections.js` reads the raw format. |
| Clips to review | `public/data/reviewClips.json` | Wraps a detection with look-alikes, a tip and simulated `priorVotes`. Only Uncertain / Needs review detections are shown. |
| Species | `public/data/species.json` | Add a species here to make it reviewable and collectable. `features` drives the checklist; `hotspots` drives 3D labels. |
| 3D models | `public/3d/<model>.glb` | e.g. `public/3d/copper-rockfish.glb`. The viewer switches from placeholder to the underwater three.js scene (`src/components/underwater/UnderwaterViewer.js`) automatically. Per species in `species.json`: `modelVariants` (colour switch), `views` (Front/Side/Top as `[theta, phi]` degrees, for the model's orientation) and `hotspots` (`{ "label", "position": "x y z", "normal": "x y z" }` in scene units, after the root node's transform). |
| Rules | `src/pages/DigitalFishers/config.js` | Reviews per clip (3), show/hide the AI's guess. |
| Player state | `src/lib/useCollection.js` | localStorage key `critters.player.v1`. Digital Fishers writes; the Marine collection reads. Consensus-confirmed detections are in `player.confirmations` for the map. |

### Preparing a new rockfish model export

Run every rockfish export through this script before it goes in `public/3d/`. It fixes parts that are inside-out (they render hollow) and leaves the original untouched. Exports with the `_SWIM` vertex attribute swim in the viewer's vertex shader; older exports without it get a baked fallback `Swim` animation.

```bash
python3 web/scripts/prepare_rockfish_glb.py ~/Downloads/copper-rockfish.glb web/public/3d/copper-rockfish.glb
```

Models with `_SWIM` (or the fallback animation) get a Swim button, hidden when the viewer prefers reduced motion.

All species, clips, votes, scores and leaderboard entries are illustrative sample data. Data: Ocean Networks Canada.
