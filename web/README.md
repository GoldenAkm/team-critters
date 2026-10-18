# Website

React + Vite. From this folder:

```
npm install
npm run dev
```

- Shared colours, fonts and spacing: `src/index.css`
- One folder per page: `src/pages/` (e.g. `src/pages/Landing/`)
- Pieces used by several pages: `src/components/`

Each page is its own HTML document in its own directory:

| URL | HTML | Code |
| --- | --- | --- |
| `/` | `index.html` | `src/pages/Landing/` |
| `/map/` | `map/index.html` | `src/pages/Map/` |
| `/digital-fishers/` | `digital-fishers/index.html` | `src/pages/DigitalFishers/` |

To add a page, add `<dir>/index.html` and list it in `PAGES` in `vite.config.js`.

Map data lives in `src/data/` and is rebuilt with:

- `npm run sightings` – sightings from the team's labels + ONC annotations (needs the `hack-team` AWS profile)
- `npm run onc-data` – camera coordinates, temperature, oxygen and footage from the ONC API (needs `ONC_TOKEN` in `web/.env.local`, which git ignores)
