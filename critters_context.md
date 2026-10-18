# AI Species Detection (ONC Coastal Marine AI Hackathon)

Prototype that identifies rockfish in Ocean Networks Canada (ONC) fixed-camera footage and turns the results into a public website: an identification demo, an interactive map and a crowd-review game (Digital Fishers 2.0).

## Vision

An AI identifier scans ONC footage for rockfish and counts only the identifications it can back up. Anything it is unsure about goes to people instead of into the data. The website is a new "AI Species Detection" entry point inside ONC's Oceans 3.0 portal, with three features:

- **AI species identification** (the landing page and main feature): a demo of the identifier on ONC footage, linking to the other two features.
- **Interactive Map**: confirmed sightings at ONC fixed cameras over time, alongside water temperature, dissolved oxygen and how usable each camera's footage was.
- **Digital Fishers 2.0**: players settle the AI's unsure detections; a majority of three independent reviewers confirms a sighting. It is the only way to collect species, and it holds the Marine collection (the player's collection and every species profile).

The AI is the core of the product, not an add-on: every game mechanic exists to confirm or correct its identifications. The aim is public discovery plus a trustworthy conservation signal, starting with rockfish presence over time at fixed cameras.

**Core loop**
1. The AI scans ONC footage, detects fish and classifies them.
2. Confident results are **Identified**: counted and shown on the map.
3. Unsure results go to Digital Fishers 2.0 instead of being counted.
4. Three people review each clip. A majority confirms it as a sighting on the map, and reviewers who matched the majority add the species to their Marine collection.

## Ground rules

- An uncertain prediction is never a confirmed observation. The AI must be able to decline: when evidence is thin, report a broader taxon (genus) or send the detection for review instead of forcing a species.
- Use the status words exactly: Identified, Uncertain, Needs review.
- Wireframe content (species, counts, readings, camera positions, players) is sample data. Never present it as fact.
- Credit ONC wherever its data or footage appears ("Data: Ocean Networks Canada").
- Build what the prototype needs; don't add unrelated features.
- If a task depends on something under Open decisions, ask before choosing.

## Prototype scope

- **Build**: a responsive website running on pre-processed AI results. A website because it uses ONC data only (no phone camera, GPS or app store).
- **Stretch**: live identification in the landing page's demo panel (see App architecture). Leave room for it in the design.
- **Not in the prototype**: mobile app, database, user accounts.

## Key files

- `docs/labelling-guide.md`: the prompt used to label frames for rockfish. Keep it unchanged so new labels stay consistent with existing ones.
- `doc/manifest.csv`: corrected labels CSV.
- `docs/wireframes/`: wireframe screenshots (landing, map, Digital Fishers). They predate later changes (for example, they still say "Pokédex"); where they differ, this file wins.

## Data: Ocean Networks Canada

**Sources**
- Hackathon dataset: annotated frames and ONC annotations from three fixed-camera sites, about 70 taxa.
- ONC API: source videos, more frames and missing metadata.
- Reference: SeaTube (every annotation links to it), ONC Digital Fishers, ONC Annotation Search. "Starus Geo" is unverified.

**Sites** (each is very different)

| Site | Habitat | Taxa seen (examples) | Image quality |
|---|---|---|---|
| Campbell River | Shallow reef, urchin barrens | kelp greenling, rockfish, lingcod, dogfish, herring, sea stars | 2019 camera mostly poor; newer camera much better |
| China Creek | Deeper, muddy | squat lobster, Tanner crab, spot prawn, flatfish, spotted ratfish, eelpout | Clearest images; mostly fair to good |
| Hartley Bay | — | rockfish, flatfish, squid, giant Pacific octopus, sunflower stars | Mostly fair to good |

**Metadata**
- On every annotation: UTC timestamp, fixed lat/lon per site, camera device code, annotator, source video filename and offset, SeaTube link.
- Missing: depth (empty everywhere; fetch it from the ONC API), bounding boxes, review status (all review fields are empty).
- Each site was labelled by only one to three people.

**Quality**
- Usable imagery is far below what the annotation counts suggest.
- ONC's rockfish annotations are unreliable: re-labelling with Claude produced about 300 disagreements with ONC on whether a rockfish was present.

**Licence**: free to download, reuse and redistribute, including mixed with other data, as long as ONC is credited.

## Target species: rockfish (genus *Sebastes*)

Why rockfish: they are reliable to identify at genus level, and their presence over time at fixed cameras ties into rockfish conservation (quillback rockfish is Threatened).

**Demo species**: copper rockfish (*Sebastes caurinus*), the most common rockfish at these sites. It is the species the demo features; the AI still reports genus *Sebastes* unless species-level evidence is strong (see Training data → Gaps).

**What can be told apart in this footage**
- Rockfish: clear at genus level. Copper vs quillback is rarely separable, so default to genus.
- Rockfish features and look-alikes: `docs/labelling-guide.md`.

**Conservation status** (no invasive species were seen in the data)

| Species | Status |
|---|---|
| Quillback rockfish | Threatened |
| Copper rockfish | Not verified |

## Training data

**Corrected labels CSV** (`doc/manifest.csv`)
- Frames re-labelled with Claude using `docs/labelling-guide.md`. Much better than ONC's original labels, but not fully correct.
- Claude's "yes" labels are trusted; "no" and "uncertain" are unverified.

Label fields as defined in the guide (check the CSV header for exact column names and the frame ID columns):

| Field | Values |
|---|---|
| `rockfish_present` | `yes`, `no`, `uncertain` |
| `confidence` | 0.0–1.0, confidence in `rockfish_present` |
| `rockfish_count` | rockfish the labeller is confident about; 10 means 10 or more (a school, mentioned in `notes`) |
| `rockfish_visibility` | `clear`, `partial`, `small_or_distant`, `none` |
| `other_animals` | short common names; empty list if none |
| `image_quality` | `good`, `murky`, `dark`, `blurry`, `obstructed` |
| `reasoning` | one sentence naming the visible features behind the answer |
| `notes` | anything unusual, or empty |

**Getting more frames**
- Download source videos through the ONC API using each annotation's video filename and offset.
- Seek 2–5 s past the annotation offset to get a frame that actually shows the fish.
- Sample one frame every 30 s per video to avoid near-identical frames.

**Splits**
- Split train/validation/test by source video so frames from one video never appear in two splits (exact scheme TBD).
- The held-out set used to set the confidence cutoff needs verified labels.

**Gaps**
- Labels are per frame (presence, count, visibility), not per fish, and have no boxes, so turning them into per-crop training labels is unresolved.
- Labels only say rockfish or not, so a trained classifier can separate rockfish from other fish but not copper from quillback.
- Not decided: underwater preprocessing method, augmentation, annotation tooling beyond Claude plus manual fixes, and how much more manual verification is needed.

## Machine learning pipeline

Detect → crop → classify → taxonomic confidence rules → status.

1. **Preprocess** each frame to improve visibility.
2. **Detect fish** with the Community Fish Detector as primary. Compare it with MBARI 315k on ONC footage and keep whichever performs better as primary. Backups (MBARI 315k, SAM 3) run only when the primary finds nothing.
3. **Crop** each detection.
4. **Classify** each crop with BioCLIP 2.5. Pretrained BioCLIP is the baseline and also helps review existing labels. The adapted version adds a lightweight classifier trained on frozen BioCLIP image features using the corrected CSV.
5. **Report** the most specific taxon the evidence supports (species, else genus *Sebastes*). Otherwise the detection becomes Needs review or Uncertain (see Reliability and review).

| Approach | Pros | Cons |
|---|---|---|
| Pretrained only | Fast; no training | May struggle with ONC's underwater conditions |
| Pretrained + lightweight classifier (**chosen**) | Needs little data and compute; adapts to ONC imagery | Only as good as the training labels |
| Full fine-tuning | Possibly more accurate | Needs cleaner labels, more compute and time |

- There are no boxes to train a detector on, so use pretrained detectors rather than training or heavily fine-tuning one.
- General vision-language models (ChatGPT, Claude) can help review labels but are never the primary identifier.
- **Compute**: a GPU environment such as Google Colab (Tesla T4) for inference and for training the lightweight classifier.
- **Evaluation**: run on labelled ONC images, compare pretrained only against pretrained + classifier, and measure per-image inference time on GPU.

## Reliability and review

Uncertain predictions are never treated as confirmed observations.

**Statuses** (provisional; validate on held-out data before relying on them)
- **Identified**: enough visual evidence. Confidence is at or above a cutoff chosen on a verified held-out set so that Identified meets a precision target (e.g. 95% of auto-confirmed rockfish really are rockfish). Counted as confirmed, and the only status shown on the map by default.
- **Needs review**: waiting for a person. Below the cutoff, or the model disagrees with an existing ONC annotation (ONC labels are often wrong, so neither side wins automatically).
- **Uncertain**: not enough evidence; far below the cutoff (this second cutoff still needs a value). Not counted.

A sighting is confirmed when it is Identified, or when Digital Fishers reaches majority agreement.

**Metrics, most important first**
1. Precision: share of Identified results that are correct. Wrong identifications contaminate conservation data.
2. Recall: share of labelled fish the detector finds.
3. F1 score.
4. False-positive rate: fish identified in frames with no fish, or only other animals.
5. Coverage: share of observations in each status.

**Records**: store the model's output (species, confidence, status) separately from human outcomes (review answers, consensus), so a prediction is never mistaken for a validated observation.

**Not decided**: how to handle poor-quality frames, missing key features and unknown look-alike species, and how to evaluate on genuinely unseen footage.

## App architecture

- **Frontend**: React + Vite. Map: Leaflet or MapLibre. Charts: a simple library such as Recharts. 3D models: Google's `<model-viewer>`.
- **Data**: pre-processed results as static JSON files shipped with the site.
- **Backend (stretch)**: one small Python FastAPI service with simple `POST /identify` and `GET /identify` endpoints that wrap the inference pipeline. It uses an API key; keep the key in a server-side environment variable, never in the repo or the frontend bundle (what the key is for and what `GET` returns: see Open decisions).
- **Identify flow**: the landing page shows a still ONC frame; pressing Identify sends it to `/identify`; the site draws the returned box over the image and shows the result (Identified or Uncertain).
- **Demo safety net**: keep a saved result for the demo image and show it whenever the service is slow or down.

**Result format** (identical for `/identify` and the JSON files, so live and stored results look the same on screen)

| Field | Meaning |
|---|---|
| `species` | most specific reliable taxon (may be genus, e.g. *Sebastes*) |
| `box` | bounding box (format TBD) |
| `confidence` | model confidence |
| `status` | `Identified`, `Uncertain` or `Needs review` |
| `camera` | ONC camera / device code |
| `timestamp` | UTC |

## Screens

The landing page is the main feature (AI species identification). It links to the two other features, Interactive Map and Digital Fishers 2.0, and to two outside information pages.

### Landing page
- New "AI Species Detection" entry point inside ONC's Oceans 3.0 portal, built around a video demo: portal header (ONC logo, "Oceans 3.0 Data Portal", nav) and a breadcrumb tagged "New entry point".
- Title and a one-line tagline.
- Featured 16:9 panel: a demo-video placeholder for now, planned to become the live Identify panel (still ONC frame, Identify button, box and status drawn on the frame, then on into the features).
- Intro text: the AI identifier, marine discovery, conservation purpose.
- Feature cards: Interactive Map and Digital Fishers 2.0 side by side.
- Two information cards, each with a picture and a short description: European green crab, and rockfish conservation. Each links to an existing information page (URLs: [add]). Green crab is educational only: it is not in the ONC data and the AI does not detect it.
- Footer with "Data: Ocean Networks Canada".

### Interactive Map
Confirmed sightings at ONC fixed cameras over time, with temperature, oxygen and footage usability. Full window: filter sidebar left, map right, timeline floating along the bottom.

- **Views**: an overview with one bubble per region showing its matching detections (click to zoom in), and zoomed areas with every camera as a labelled dot and detection markers just above the camera that recorded them. Zoom 100–800% toward the cursor (wheel, trackpad, pinch), drag to pan, + and − buttons, and a "Zoom out" button shown only when zoomed in; zooming out past 100% returns to the overview. Markers and labels keep their on-screen size. A toolbar shows the current location (e.g. "All regions › Southern BC").
- **Sidebar**: search; one checkbox per species, each with its own animal marker; status filter (only Identified on by default); environmental data (Off / Water temperature / Dissolved oxygen), which shades camera dots, adds a halo sized by the value and shows the readout tiles; a collapsible camera tree following ONC's hierarchy (Arctic › Cambridge Bay; Atlantic › Bay of Fundy › Minas Passage, Conception Bay; Pacific › BC North Coast, Northeast Pacific Ocean, Salish Sea, Vancouver Island), where each row shows a detection count and clicking it jumps there and opens that camera's trends; a footage-status legend; a live "N detections shown" count and Reset filters.
- **Timeline** (always visible): play/pause, the selected period, a two-handle range slider over 52 weeks and a "Whole year" reset. Under the slider, a thin usable-footage strip: dark where every camera in view had clear footage, lighter where some were murky, blank where none recorded. Play moves the period forward a week at a time (a 4-week window if the whole year was selected). The period drives markers, bubble and tree counts, temperature and oxygen averages, and the outlined band in the trends panel.
- **Temperature and oxygen tiles** (only when environmental data is on): the average for the area in view over the period, a small year-long trend line with the period shaded, and a dashed hypoxic line on oxygen. Clicking a tile switches which measure shades the map; clicking the active one turns it off.
- **Footage status**: each camera dot's outline shows footage quality over the period (solid = usable, dashed = murky with e.g. "murky 69% of period", dotted grey = no footage). Sightings drop in poor weeks, so a gap must never read as the species leaving.
- **Site trends panel** (from a camera dot, tree row or species card): one chart on a 12-month axis with water temperature and dissolved oxygen (left axis, with a "hypoxic below 2 mg/L" line) and sightings per week for the current filters (right axis). Murky weeks are light bands; weeks with no data or no footage are bridged by a grey dashed line, never drawn as zero. Hover shows a week's values and footage status; checkboxes hide each line; a permanent note says patterns are correlations, not causes.
- **Species card** (click a marker): frame, common and scientific names, conservation tag, status badge with a line explaining that status, a short blurb, camera site, area, timestamp, model confidence; buttons for the species profile (in the Marine collection), this camera's temperature and oxygen, and the source clip.

### Digital Fishers 2.0
Where people settle the AI's unsure identifications, and the only way to collect species. Unsure detections come here instead of being counted (which statuses exactly: see Open decisions). It complements ONC's original Digital Fishers, where volunteers annotate whole clips from scratch.

- **Layout**: header with breadcrumb and a collection progress shortcut; a four-step "How it works" strip (AI scans ONC footage → unsure cases come here → several people review → agreement confirms it); review task on the left, progress panel on the right.
- **Review task**: a ~15 s fixed-camera clip with the AI's detection box, play and scrub controls and 0.5× speed, under a bar with clip number, camera site and area. Below it, the AI's guess and status and one focused question ("Is the highlighted animal a [species]?"). Answers: **Yes**; **No, it's something else** (opens a picker of regional look-alikes plus "Not sure what it is"); **Can't tell from this clip** (earns full points so nobody is pushed to guess).
- **Identification guide** beside the question: the 3D model, an optional "What can you see in the clip?" feature checklist, and a tip.
- **After answering**: +10 points and a row of 3 review dots showing where your answer landed. Other reviewers' answers stay hidden until all 3 are in.
- **Consensus**: each clip needs 3 independent reviews (keep this a single config value); a simple majority confirms it. If yours is the last review, the result shows immediately: the agreement count, plus 5 bonus points if you matched.
  - Match + species new to you: a "New species collected" card pops up and the species joins your collection.
  - Match + already collected: logged as another confirmed sighting on that species' card.
  - Different answer or "can't tell": points still awarded, nothing added, and the 3D model is suggested for comparison.
  - Clips still waiting for agreement can unlock species later.
- **Session end**: a "Session complete" summary linking to the Marine collection and the map.
- **Progress panel**: session points, clips reviewed and day streak; a collection grid (species plus "Coming soon" slots); an active mission with a progress bar; a weekly leaderboard ranked by answers that matched agreement, not by speed.

#### Marine collection (inside Digital Fishers 2.0)
Called "Marine Pokédex" in the wireframes; use "Marine collection". The player's collection and the home of every species profile. Header "N of M species collected" with a progress bar; filter chips All, Collected, Not yet, Invasive.

| Card state | Card shows | Detail panel shows |
|---|---|---|
| Collected | number, map symbol, name, conservation tag, "COLLECTED" | full profile |
| Pending | name, "Waiting for agreement", dashed outline | locked 3D model, "You've reviewed a clip of this species", review dots (e.g. 2 of 3) |
| Locked | "???", faded symbol, "Not collected yet" | locked 3D model, habitat hint, "Find one in Digital Fishers" |
| Coming soon | dotted slot | not selectable: "More species as the AI learns them" |

**Collected profile**: number, common and scientific names, conservation tag and "Collected" badge; the 3D viewer, large; your record (first collected with camera site and date, sightings you confirmed, camera sites); how to recognise it (key identifying features); four short sections: What it is, Why it matters (or Why it's invasive here), Its impact or status, What's being done (or How monitoring helps); buttons "See its sightings on the map" and "Review more clips".

### 3D species model viewer (shared component)
Used beside each Digital Fishers clip ("Compare with the 3D model") and, larger, in each Marine collection profile; the host screen sets the species and height. Drag to spin 360° and tilt; rotate-left and rotate-right buttons for keyboard users; Front, Side and Top presets with the current angle shown in a corner; a Key features toggle labels the identifying parts, and labels fade when that part faces away. Build with `<model-viewer>` and properly licensed models.

## Shared conventions

The same species, status words and symbols mean the same thing on every screen, so identification, learning and play read as one product.

- **Status styling**: filled marker = Identified; dashed ring = Uncertain; ring with a "?" badge = Needs review.
- **Species symbols**: one drawn animal per species in a round marker (`web/src/components/speciesIcon.js`), used on the map, in filters, on species cards and in the collection, so species stay distinct without colour. The wireframes' shapes (square, circle, triangle) are replaced.
- **Camera footage outlines**: solid = usable, dashed = murky, dotted grey = no footage.
- **Terms**: a detection is a species marker on the map; a sighting is a weekly count over time (to be confirmed).
- **Conservation tags**: proposed colours red = critically endangered, yellow = endangered, green = not at risk, pink = invasive, always paired with a text label.
- **Visual style**: grayscale until a style is chosen. IBM Plex Sans for text, IBM Plex Mono for labels and data (placeholders, not a brand choice).
- **Accessibility**: real buttons, links and form controls; 44 px touch targets on main controls; nothing relies on colour alone; every layout stacks to one column on phones.

## Wireframe sample data

Made up to show behaviour. Never quote it as fact.
- Species: European green crab, rockfish and lingcod are placeholders, as are the sample player's collection, the four sample Digital Fishers clips and the "Green Crab Watch" mission.
- Which species appears at which camera, and every detection, sighting and review count, point total and leaderboard entry.
- The 14 cameras use real names from ONC's fixed-camera list (Southern BC 9, BC North Coast 2, Atlantic 2, Arctic 1), but positions are approximate and coastlines schematic.
- Temperature, oxygen and footage-quality values for every camera and week.
- Bracketed fields such as [timestamp], [score], [ONC device] and [Reviewer] are slots for real data.
- Each wireframe screen keeps its own demo data. The real build needs one shared player state so species collected in Digital Fishers appear in the Marine collection.

## Open decisions

- **Map scope**: real data covers three BC sites (Campbell River, China Creek, Hartley Bay); the wireframe's 14-camera, coast-to-coast map is sample data.
- **Consensus without a backend**: reviewer consensus, the leaderboard and streaks need shared state, but the prototype has no database or accounts. Decide whether other reviewers' answers are simulated and whether player state lives in the browser.
- **What reaches Digital Fishers**: the wireframe sends both Uncertain and Needs review detections; the reliability rules send only below-cutoff detections to review and leave far-below ones as Uncertain.
- **Showing the AI's guess** to reviewers (easier for casual players) or hiding it (less bias toward "yes").
- **Species profiles**: locked until collected, or basic info always readable with the 3D model and your record unlocking. Leaning towards always readable.
- **Terms**: confirm "detection" vs "sighting".
- **`/identify` details**: what `GET /identify` returns, and what the API key is for (ONC's API, or protecting `/identify`).
- **Invasive filter** in the Marine collection: keep it, now that only rockfish can be collected?
- **Names**: product name ("Critters" in the wireframe, "FinFinders" in the platform notes); "Marine collection" is the working name for now; check ONC is comfortable with "Digital Fishers 2.0".
- **Deployment**: how and where the prototype is hosted.

## To verify

Blocking for real map and trend data:
- Temperature and oxygen sensors exist at or near each camera, and their data can be pulled through Oceans 3.0.
- Camera recording uptime is available (needed for the "no footage" status).
- Footage clips can be embedded in the site (download through the ONC API is planned; reuse is allowed with credit).
- The camera list and coordinates beyond the three data sites.

Before the demo:
- Species facts, identifying features and conservation status from DFO or the Species at Risk Act, including copper rockfish's status.
- A licensed source for 3D models and reference images.
- A simple blur and brightness score reliably separates clear footage from murky footage.
