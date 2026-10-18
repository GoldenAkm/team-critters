# Build Brief: Interactive Map

Hand this file to a new Claude / Claude Code session. It contains everything needed to build the **Interactive Map** feature of the Critters hackathon prototype. Other teammates are building the landing page and the Marine Pokédex in parallel; everything here is designed so the pieces connect later without rewrites.

---

## 1. Project context (read first)

- **Project:** an AI-powered coastal marine species identification and conservation-awareness website using **Ocean Networks Canada (ONC)** data only. Hackathon prototype.
- **What the AI does:** identifies a target species in ONC fixed-camera footage. Each identification is **Identified** (enough visual evidence), **Uncertain** (not enough evidence, not counted) or **Needs review** (waiting for people in Digital Fishers 2.0).
- **What the map is for:** showing **confirmed sightings at ONC's fixed cameras over time**, alongside water temperature, dissolved oxygen and how usable each camera's footage was, so people can see where and when a species shows up and what conditions were like.
- **Core principle:** an uncertain prediction is never shown as a confirmed observation. The map shows only Identified detections by default. Gaps caused by murky or missing footage must never look like the species is absent.
- **Target species is not chosen yet.** Use the placeholder species below; keep everything data-driven so swapping species means editing JSON, not code.
- **Scope boundary:** you build how AI results are delivered and shown. Model training and confidence thresholds belong to other teammates.

## 2. Tech stack and repo layout (team-agreed)

- **React + Vite**, plain JavaScript or TypeScript (match the repo).
- **Map:** Leaflet (`react-leaflet`) or MapLibre GL. Use real lat/lon. Tiles need internet; keep a simple fallback (e.g. a plain background + coastline GeoJSON) in case venue Wi-Fi fails.
- **Charts:** Recharts (or similar small library).
- **No backend for this feature.** All data is static JSON in `src/data/`.
- **Routes:** `/` landing (teammate), `/map` (**you**), `/review` Digital Fishers (teammate or you), `/pokedex` and `/pokedex/:speciesId` (teammate).
- **Your folder:** `src/features/map/`. Do not edit other features' folders; shared code goes in `src/shared/` and must be agreed.

```
src/
  data/            species.json, cameras.json, detections.json, env.json, footage.json
  shared/          types, status labels + symbols, useCollection(), SpeciesCard (owner TBD)
  features/
    map/           <- you
    review/        Digital Fishers 2.0
    pokedex/
    landing/
```

## 3. Shared data contracts (identical across all handover files — do not change without telling the team)

All files live in `src/data/`. Sample data must follow these shapes exactly so real data can replace it later.

### species.json
```json
[
  { "id": "green_crab", "name": "European green crab", "sci": "Carcinus maenas",
    "tag": "Invasive", "shape": "square", "model": "green-crab",
    "features": ["Five spines on each side of the shell edge, behind the eyes", "Three rounded bumps between the eyes"],
    "blurb": "Invasive on both the Pacific and Atlantic coasts of Canada. Competes with native crabs and damages eelgrass habitat." }
]
```
`shape` is the map symbol: `square | circle | triangle`. Placeholder species: `green_crab` (square), `rockfish` (circle, "Some species at risk", *Sebastes* spp.), `lingcod` (triangle, "Species of interest", *Ophiodon elongatus*).

### cameras.json
```json
[ { "id": "saanich_inlet", "name": "Saanich Inlet", "region": "Pacific", "area": "Salish Sea", "lat": 48.65, "lon": -123.49 } ]
```

### detections.json (also the shape returned by the live `/identify` endpoint)
```json
[
  { "id": "d1", "speciesId": "green_crab", "cameraId": "saanich_inlet",
    "timestamp": "2025-06-12T14:03:00Z", "status": "identified", "confidence": 0.91,
    "box": { "x": 0.38, "y": 0.44, "w": 0.20, "h": 0.24 },
    "clipUrl": null, "frameUrl": null, "confirmedBy": "ai" }
]
```
- `status`: `identified | uncertain | needs_review`.
- `box`: fractions of frame width/height (0–1).
- `confirmedBy`: `ai | consensus | null` (consensus = confirmed in Digital Fishers).
- One record = one detection event. Weekly "sightings" counts are derived by grouping these by camera + week.

### env.json (weekly sensor averages per camera)
```json
{ "weekStart": "2025-01-01", "weeks": 52,
  "cameras": { "saanich_inlet": { "tempC": [9.1, 9.0], "oxygenMgL": [3.2, 3.1] } } }
```
Arrays have one value per week (length = `weeks`); `null` where no data.

### footage.json (weekly usable-footage status per camera)
```json
{ "weekStart": "2025-01-01", "weeks": 52,
  "cameras": { "saanich_inlet": ["clear", "clear", "murky", "none"] } }
```
Values: `clear | murky | none`.

### Shared UI vocabulary
| Status | Label | Map styling |
| --- | --- | --- |
| identified | Identified | filled symbol |
| uncertain | Uncertain | dashed outline, not counted as confirmed |
| needs_review | Needs review | outline with "?" |

Footage on camera dots: **solid** outline = usable, **dashed** = murky, **dotted grey** = no footage.

## 4. Camera list (14 ONC fixed cameras)

Coordinates are **approximate placeholders — verify with ONC before the demo.**

| id | name | region | area | lat | lon |
| --- | --- | --- | --- | --- | --- |
| cambridge_bay | Cambridge Bay | Arctic | Arctic | 69.11 | -105.06 |
| minas_passage | Minas Passage | Atlantic | Bay of Fundy | 45.37 | -64.40 |
| conception_bay | Conception Bay | Atlantic | Atlantic | 47.50 | -53.00 |
| chatham_sound | Chatham Sound | Pacific | BC North Coast | 54.30 | -130.40 |
| douglas_channel | Douglas Channel | Pacific | BC North Coast | 53.70 | -129.10 |
| barkley_canyon | Barkley Canyon | Pacific | Northeast Pacific Ocean | 48.31 | -126.06 |
| barkley_sound | Barkley Sound | Pacific | Northeast Pacific Ocean | 48.85 | -125.25 |
| cascadia_basin | Cascadia Basin | Pacific | Northeast Pacific Ocean | 47.76 | -127.76 |
| clayoquot_slope | Clayoquot Slope | Pacific | Northeast Pacific Ocean | 48.67 | -126.85 |
| endeavour | Endeavour | Pacific | Northeast Pacific Ocean | 47.95 | -129.10 |
| discovery_passage | Discovery Passage | Pacific | Salish Sea | 50.04 | -125.27 |
| saanich_inlet | Saanich Inlet | Pacific | Salish Sea | 48.65 | -123.49 |
| strait_of_georgia | Strait of Georgia | Pacific | Salish Sea | 49.04 | -123.42 |
| china_creek | China Creek | Pacific | Vancouver Island | 49.20 | -124.80 |

ONC's own hierarchy (use for the sidebar tree):
```
Arctic › Cambridge Bay
Atlantic › Bay of Fundy › Minas Passage
Atlantic › Conception Bay
Pacific › BC North Coast › Chatham Sound, Douglas Channel
Pacific › Northeast Pacific Ocean › Barkley Canyon, Barkley Sound, Cascadia Basin, Clayoquot Slope, Endeavour
Pacific › Salish Sea › Discovery Passage, Saanich Inlet, Strait of Georgia
Pacific › Vancouver Island › China Creek
```

## 5. Feature spec (from the approved wireframe)

Full-window page: **filter sidebar on the left, map on the right, timeline floating at the bottom.** Stacks to one column on phones (map ~70% of screen height).

### 5.1 Map views
- Default view frames all of Canada's ONC cameras (Pacific to Atlantic, up to the Arctic).
- At low zoom, nearby cameras cluster into area bubbles (BC North Coast, Southern BC, Arctic, Atlantic) showing the count of matching detections; clicking a bubble zooms to that area.
- Zoomed in: each camera is a labelled dot; detection markers sit beside/above their camera, one per species, using the species symbol and status styling. Multiple species at one camera spread side by side.
- Zoom/pan: standard map controls (scroll/pinch/drag, +/−, a Fit button). Markers and labels stay a constant on-screen size.
- A small breadcrumb/toolbar shows the current area ("All camera sites › Southern BC").

### 5.2 Sidebar
1. **Search** (species or camera; can be a stub).
2. **Species detected:** checkbox per species with its symbol, name, tag and count.
3. **Identification status:** Identified (on by default), Uncertain (off), Needs review (off), each with its styling and a one-line hint.
4. **Environmental data:** radio — Off / Water temperature / Dissolved oxygen.
5. **Camera locations:** collapsible tree (section 4) with detection counts per row; clicking a row flies the map there and opens that camera's trends panel. Legend for footage outlines.
6. Footer: "N detections shown" + Reset filters.

### 5.3 Timeline (always visible)
- Slim floating bar: play/pause, period label ("Apr 30 – Jul 30" + "13 weeks · Southern BC"), a **two-handle range slider** over 52 weeks, month labels, a "Whole year" reset.
- A thin **usable-footage strip** under the slider: per week, darker = more cameras in view had clear footage; blank = no footage.
- Play slides the selected period forward one week at a time (use a 4-week window if the whole year was selected); dragging a handle pauses.
- The selected period filters everything: markers shown (a species/camera appears only if detected in the period), bubble and tree counts, environmental averages, trends-panel highlight.

### 5.4 Environmental layer (only when Environmental data ≠ Off)
- Camera dots shaded by the period's average value, with a halo sized by value and the value printed under the camera name.
- Two small floating tiles at top-left: **Water temp** and **Oxygen** — average for the area in view over the period, a tiny year sparkline with the period shaded, and a dashed hypoxic line (2 mg/L) on oxygen. Clicking a tile switches which measure shades the map; clicking the active one turns the layer off.

### 5.5 Footage status
- Each camera dot's outline reflects footage quality over the selected period: `clear` majority → solid; mostly murky → dashed with "murky N% of period"; mostly none → dotted grey with "no footage in period".

### 5.6 Site trends panel
Opens from a camera dot, a tree row, or the species card. Bottom drawer above the timeline.
- Three stacked small charts on **one shared 12-month x-axis**: water temperature, dissolved oxygen (dashed "hypoxic below 2 mg/L" line), sightings per week for the current species/status filters (bars).
- Murky weeks shaded light; no-footage weeks hatched. The selected period outlined.
- Hover shows the week: temp, oxygen, sightings, footage status.
- Toggles to hide temperature or oxygen; placeholder "Range" select and "Download this data" link.
- Auto-summary in plain words (e.g. "Sightings were higher in warmer weeks"), computed **only from clear-footage weeks**, plus a permanent note: *"Patterns here are correlations, not proof of cause."*

### 5.7 Species card
Clicking a marker opens a card (top-right): frame/thumbnail placeholder, common + scientific name, conservation tag, status badge + one-line meaning, blurb, camera site, area, timestamp, model confidence; buttons: **Open species profile** (link to `/pokedex/:speciesId`), **Temperature & oxygen at {camera}** (opens trends panel), **Watch source clip** (`clipUrl`).

## 6. Build order (work in demo-able slices)

1. Page shell at `/map`: sidebar + map with the 14 camera dots from `cameras.json`.
2. Detection markers from `detections.json` with species symbols and status styling; species + status filters (Identified only by default).
3. Species card on marker click.
4. Area bubbles at low zoom + camera tree in the sidebar.
5. Timeline with two-handle range filtering markers and counts.
   **— Minimum demo cut line —**
6. Environmental layer + readout tiles.
7. Site trends panel.
8. Footage status (dot outlines, timeline strip, chart shading, summary exclusions).
9. Play animation, polish, phone layout.

## 7. Sample data to generate (until real data arrives)

Generate realistic-looking but clearly fake JSON in the exact formats of section 3, and label it as sample data in the UI footer ("illustrative sample data"). Suggested patterns used in the wireframe:
- 12 detections across the 3 species and several cameras; include uncertain and needs_review examples.
- Weekly temperature as a seasonal curve per camera (deep sites ~2–5 °C and nearly flat; shallow sites 7–12 °C peaking late July).
- Weekly oxygen: shallow sites 5–9 mg/L; deep slope/canyon sites below 2 mg/L; **Saanich Inlet** with a late-summer/fall dip below 2 mg/L.
- Footage: Saanich Inlet, Strait of Georgia, Chatham Sound, Douglas Channel and China Creek often murky in spring/summer; Minas Passage frequently murky; a few multi-week outages (e.g. Endeavour, Cambridge Bay in winter).
- Derive weekly sightings so they drop in murky weeks and are zero in no-footage weeks.

## 8. Integration points (keep these stable)

- Read only from `src/data/*.json` through a small loader (e.g. `src/shared/data.js`) so real data swaps in cleanly.
- Species profile link: `/pokedex/:speciesId`.
- Use the shared status labels/symbols from `src/shared/` once they exist; until then keep them in one file you can move.
- Detections confirmed in Digital Fishers will arrive with `confirmedBy: "consensus"` — the map treats them exactly like AI-identified ones.

## 9. Acceptance checklist

- [ ] All 14 cameras appear at their coordinates; tree matches section 4.
- [ ] Default view shows only Identified detections.
- [ ] Changing species/status filters and the timeline period updates markers, bubbles, tree counts and "N detections shown" consistently.
- [ ] No-footage periods never read as absence (dot outline + chart hatching + summary exclusion).
- [ ] Trends panel's three charts share one x-axis and the hypoxic line is labelled.
- [ ] Correlation note is always visible in the trends panel.
- [ ] Works at phone width; all controls are real buttons/inputs with labels; nothing relies on colour alone.
- [ ] Sample data is labelled as illustrative.

## 10. Open items (don't block on these; flag them)

- Real camera coordinates, and which species actually appear at which cameras.
- Whether temperature/oxygen sensors exist at or near every camera and can be pulled via ONC Oceans 3.0.
- Whether camera recording uptime is available (drives "no footage").
- Terminology: "detection" (map marker) vs "sighting" (count over time) — pending team confirmation.
