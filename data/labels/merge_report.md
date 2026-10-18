# Label merge report

Inputs: `manifest.csv` (494 rows), `data/rockfish_clean/rockfish_clean_manifest.csv` (76 rows). Join key `image_file`.
Output: `data/labels/merged_manifest.csv` (494 rows). All assertions passed.

## final_label per split

**Before** (`label` × `split`, empty split shown as `(none)`):

| split | excluded | negative | positive | total |
|---|---|---|---|---|
| (none) | 89 | 0 | 0 | 89 |
| test | 0 | 51 | 10 | 61 |
| train | 0 | 233 | 50 | 283 |
| val | 0 | 50 | 11 | 61 |
| total | 89 | 334 | 71 | 494 |


**After** (`final_label` × `split_final`):

| split_final | excluded | negative | positive | total |
|---|---|---|---|---|
| excluded | 78 | 0 | 0 | 78 |
| test | 0 | 51 | 12 | 63 |
| train | 0 | 233 | 58 | 291 |
| val | 0 | 50 | 12 | 62 |
| total | 78 | 334 | 82 | 494 |


Sample-weight totals:

| split_final | final_label | count | sum |
|---|---|---|---|
| excluded | excluded | 78 | 0.0 |
| test | negative | 51 | 51.0 |
| test | positive | 12 | 9.2 |
| train | negative | 233 | 233.0 |
| train | positive | 58 | 48.0 |
| val | negative | 50 | 50.0 |
| val | positive | 12 | 9.4 |


## Label changes (11)

| image_file | camera_day | label_change | tier | quality | split_final | review_notes |
|---|---|---|---|---|---|---|
| AXISCAMB8A44F76CD4F_20240317T140005.000Z_t0219.00.jpg | AXISCAMB8A44F76CD4F_2024-03-17 | excluded -> positive | B_partial | fair | train | full-res: multiple fish partly in frame; flatfish visible center |
| AXISCAMB8A44F76CD4F_20240420T130007.000Z_t0144.00.jpg | AXISCAMB8A44F76CD4F_2024-04-20 | excluded -> positive | B_partial | fair | train | spiny dorsal, caudal fin clear; second small rockfish top |
| AXISCAMB8A44F76CD4F_20240317T140005.000Z_t0174.00.jpg | AXISCAMB8A44F76CD4F_2024-03-17 | excluded -> positive | B_partial | fair | train | rockfish body/fins visible at right edge, mid-distance |
| AXISCAMACCC8E891288_20190712T010006.000Z_t0189.00.jpg | AXISCAMACCC8E891288_2019-07-12 | excluded -> positive | A_clear | fair | train | full-res: rockfish silhouette small and distant; species not confirmable |
| AXISCAMB8A44F76CD4F_20240413T193506.000Z_t0302.00.jpg | AXISCAMB8A44F76CD4F_2024-04-13 | excluded -> positive | B_partial | fair | train | head/front visible |
| AXISCAMB8A44F76CD4F_20240317T140005.000Z_t0199.00.jpg | AXISCAMB8A44F76CD4F_2024-03-17 | excluded -> positive | A_clear | good | train | head, eye, pectoral fin clear |
| AXISCAMB8A44F271FBC_20241024T040010.000Z_t0004.00.jpg | AXISCAMB8A44F271FBC_2024-10-24 | excluded -> positive | B_partial | poor | val | copper-like pale rear body; ~6% width |
| AXISCAMB8A44F76CD4F_20240127T130006.000Z_t0268.00.jpg | AXISCAMB8A44F76CD4F_2024-01-27 | excluded -> positive | B_partial | fair | test | head/eye/fins clear; colour pattern suggests China/quillback-type but not confirmed |
| AXISCAMB8A44F76CD4F_20240317T140005.000Z_t0236.00.jpg | AXISCAMB8A44F76CD4F_2024-03-17 | excluded -> positive | B_partial | fair | train | only rear half; genus from fin shape only |
| AXISCAMB8A44F76CD4F_20240420T130007.000Z_t0205.00.jpg | AXISCAMB8A44F76CD4F_2024-04-20 | excluded -> positive | A_clear | fair | train | spiny pectoral/dorsal visible |
| AXISCAMB8A44F76CD4F_20240120T110006.000Z_t0273.00.jpg | AXISCAMB8A44F76CD4F_2024-01-20 | excluded -> positive | B_partial | fair | test | small rockfish show spiny dorsal and mottled red-brown colour; good Sebastes example |


## needs_decision (0)

Rows with `label_source == human` whose clean-set tier implies a different label. Manifest label kept.

_none_


## Unassigned split (0)

_none_


## Manifest positives not in the clean set

| image_file | claude_confidence | label_source | onc_taxa | nearest_clean_ids | within_clean_range |
|---|---|---|---|---|---|
| AXISCAMB8A44F271FBC_20240926T105542.000Z_t0242.00.jpg | 0.55 | human | Sebastes caurinus | CR-0994 .. CR-1026 | yes (id gap 32) |
| AXISCAMACCC8E891288_20190910T090006.000Z_t0234.00.jpg | 0.75 | claude | Cymatogaster aggregata; Sebastes caurinus | CR-0799 .. CR-0936 | yes (id gap 137) |
| AXISCAMB8A44F271FBC_20240921T081013.000Z_t0005.00.jpg | 0.7 | claude | Sebastes caurinus | CR-0978 .. CR-0983 | yes (id gap 5) |
| AXISCAMB8A44F271FBC_20240926T105542.000Z_t0054.00.jpg | 0.7 | claude | Sebastes caurinus | CR-0992 .. CR-0994 | yes (id gap 2) |
| AXISCAMB8A44F271FBC_20240907T090004.000Z_t0239.00.jpg | 0.8 | claude | Sebastes caurinus | CR-0946 .. CR-0978 | yes (id gap 32) |
| AXISCAMACCC8E891288_20190829T120023.000Z_t0102.00.jpg | 0.8 | claude | Sebastes caurinus | CR-0568 .. CR-0590 | yes (id gap 22) |
| AXISCAMACCC8E891288_20190910T050008.000Z_t0187.00.jpg | 0.7 | claude | Sebastes caurinus | CR-0783 .. CR-0799 | yes (id gap 16) |
| AXISCAMB8A44F76CD4F_20240323T060008.000Z_t0076.00.jpg | 0.7 | claude | Sebastes | HB-0097 .. HB-0105 | yes (id gap 8) |
| AXISCAMB8A44F271FBC_20240921T081013.000Z_t0028.00.jpg | 0.8 | human | Clupeidae | CR-0978 .. CR-0983 | yes (id gap 5) |
| AXISCAMACCC8E891288_20190904T100006.000Z_t0145.00.jpg | 0.85 | claude | Sebastes caurinus | CR-0664 .. CR-0749 | yes (id gap 85) |
| AXISCAMB8A44F271FBC_20251003T080007.000Z_t0285.00.jpg | 0.75 | claude | Sebastidae | CR-1082 .. CR-1084 | yes (id gap 2) |
| AXISCAMB8A44F271FBC_20250915T080007.000Z_t0102.00.jpg | 0.9 | claude | Sebastidae | CR-1026 .. CR-1075 | yes (id gap 49) |
| AXISCAMB8A44F76CD4F_20240423T100005.000Z_t0185.00.jpg | 0.7 | claude | Sebastes | HB-0213 .. HB-0215 | yes (id gap 2) |


review_id ranges in the clean set: CR 0293–1105 (34 ids), HB 0032–0271 (42 ids).
review_id increases with image_file order within each site: campbell_river=True, hartley_bay=True.

Interpretation: the review_id numbering covers far more frames than the 76 kept (only the kept rows are recorded), so ids for reviewed-and-rejected frames are not available. A position *inside* the reviewed id range with a gap means the frame could have been reviewed and dropped, but **whether it was actually seen and rejected vs. never reviewed is unknown** from these CSVs. A position between consecutive ids means it was not in the reviewed sequence.

## lat/lon coverage after filling

452 / 494 rows (91%) have lat/lon.

| site | rows | with_lat_lon | clean_manifest | device_inferred |
|---|---|---|---|---|
| campbell_river | 284 | 284 | 34 | 250 |
| china_creek | 42 | 0 | 0 | 0 |
| hartley_bay | 168 | 168 | 42 | 126 |


Per-device clean coordinates: AXISCAMACCC8E891288: 50.0207667 / -125.23535; AXISCAMB8A44F271FBC: 50.02076 / -125.2354; AXISCAMB8A44F76CD4F: 53.42246 / -129.247513. Devices with no clean rows get no coordinates.
