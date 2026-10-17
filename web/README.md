# Critters web

React + Vite site. Currently contains **Digital Fishers 2.0** at `/review`, plus placeholder pages for the landing page (`/`), Interactive Map (`/map`) and Marine collection (`/collection`).

```bash
cd web
npm install
npm run dev     # http://localhost:5173/review
npm test        # consensus + player store tests
```

## Where things plug in

| What | Where | Notes |
|---|---|---|
| AI model output | `public/data/detections.json` | Same fields as `/identify`: `species`, `camera`, `timestamp`, `status` (`Identified` / `Uncertain` / `Needs review`), `confidence`, `box`, `clipUrl`, `frameUrl`. Only `src/lib/detections.js` reads the raw format. |
| Clips to review | `public/data/reviewClips.json` | Wraps a detection with look-alikes, a tip and simulated `priorVotes`. Only Uncertain / Needs review detections are shown. |
| Species | `public/data/species.json` | Add a species here to make it reviewable and collectable. `features` drives the checklist; `hotspots` drives 3D labels. |
| 3D models | `public/3d/<species.model>.glb` | e.g. `public/3d/copper-rockfish.glb`. The viewer switches from placeholder to `<model-viewer>` automatically. Hotspot format: `{ "label", "position": "x y z", "normal": "x y z" }`. |
| Rules | `src/config.js` | Reviews per clip (3), show/hide the AI's guess, points. |
| Player state | `src/lib/useCollection.js` | localStorage key `critters.player.v1`. Digital Fishers writes; the Marine collection reads. Consensus-confirmed detections are in `player.confirmations` for the map. |

All species, clips, votes, scores and leaderboard entries are illustrative sample data. Data: Ocean Networks Canada.
