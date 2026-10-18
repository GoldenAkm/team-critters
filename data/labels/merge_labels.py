"""Merge manifest.csv with the human-reviewed rockfish_clean_manifest.csv.

Label priority: human review > Claude. CSV only (no images, no S3).

Usage (from repo root or anywhere):
    python data/labels/merge_labels.py

Writes data/labels/merged_manifest.csv and data/labels/merge_report.md.
"""
import re
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MANIFEST = ROOT / "manifest.csv"
CLEAN = ROOT / "data" / "rockfish_clean" / "rockfish_clean_manifest.csv"
OUT_CSV = HERE / "merged_manifest.csv"
OUT_MD = HERE / "merge_report.md"

CLEAN_COLS = ["review_id", "tier", "quality", "review_notes", "final_check_note",
              "lat", "lon", "seatube_link"]
TIER_LABEL = {"A_clear": "positive", "B_partial": "positive", "excluded": "excluded"}
TIER_WEIGHT = {"A_clear": 1.0, "B_partial": 0.5, "excluded": 0.0}
SPLITS = ("train", "val", "test")


def read_text_csv(path):
    # Read everything as text so original columns are written back unchanged.
    return pd.read_csv(path, dtype=str, keep_default_na=False)


def md_table(df):
    if df.empty:
        return "_none_\n"
    cols = list(df.columns)
    esc = lambda v: str(v).replace("|", "\\|").replace("\n", " ")
    lines = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    lines += ["| " + " | ".join(esc(v) for v in row) + " |" for row in df.itertuples(index=False)]
    return "\n".join(lines) + "\n"


def main():
    m = read_text_csv(MANIFEST)
    c = read_text_csv(CLEAN)
    orig_cols = list(m.columns)
    n_in = len(m)

    # --- input checks ---
    assert m["image_file"].is_unique, "manifest.csv image_file is not unique"
    assert c["image_file"].is_unique, "clean manifest image_file is not unique"
    missing = sorted(set(c["image_file"]) - set(m["image_file"]))
    assert not missing, f"clean-set image_file(s) not found in manifest.csv: {missing}"
    clash = [col for col in CLEAN_COLS if col in orig_cols]
    assert not clash, f"clean columns would overwrite manifest columns: {clash}"

    # --- rule 1-2: left join ---
    df = m.merge(c[["image_file"] + CLEAN_COLS], on="image_file", how="left", validate="one_to_one")
    df[CLEAN_COLS] = df[CLEAN_COLS].fillna("")
    in_clean = df["tier"] != ""

    # --- rule 3 + 5: final_label, human conflicts ---
    tier_label = df["tier"].map(TIER_LABEL).fillna("")
    unknown_tiers = sorted(set(df.loc[in_clean & (tier_label == ""), "tier"]))
    assert not unknown_tiers, f"unknown tier values: {unknown_tiers}"
    needs_decision = in_clean & (df["label_source"] == "human") & (tier_label != df["label"])
    df["final_label"] = df["label"].where(~in_clean | needs_decision, tier_label)
    df["needs_decision"] = needs_decision

    # --- rule 4: sample_weight ---
    use_tier = in_clean & ~needs_decision
    w = df["final_label"].map({"positive": 0.7, "negative": 1.0, "excluded": 0.0})
    w[use_tier] = df.loc[use_tier, "tier"].map(TIER_WEIGHT)
    assert w.notna().all(), f"no weight rule for labels: {sorted(set(df.loc[w.isna(), 'final_label']))}"
    df["sample_weight"] = w

    # --- rule 6: label_change ---
    df["label_change"] = [
        "" if new == old else f"{old} -> {new}" for old, new in zip(df["label"], df["final_label"])
    ]

    # --- rule 7: split_final ---
    has_split = df["split"].isin(SPLITS)
    day_splits = df[has_split].groupby("camera_day")["split"].agg(lambda s: sorted(set(s)))
    split_final, unassigned_reason, excl_override = [], {}, []
    for i, r in df.iterrows():
        if r["final_label"] == "excluded":
            if r["split"]:
                excl_override.append(r["image_file"])
            split_final.append("excluded")
        elif r["split"]:
            split_final.append(r["split"])
        else:
            s = day_splits.get(r["camera_day"], [])
            if len(s) == 1:
                split_final.append(s[0])
            else:
                split_final.append("unassigned")
                unassigned_reason[i] = ("camera_day has no split" if not s
                                        else f"camera_day in multiple splits: {', '.join(s)}")
    df["split_final"] = split_final

    # --- rule 8: lat/lon ---
    df["lat_lon_source"] = ""
    df.loc[in_clean & (df["lat"] != ""), "lat_lon_source"] = "clean_manifest"
    dev_coords = (df[in_clean].groupby("device")[["lat", "lon"]]
                  .agg(lambda s: sorted(set(s))))
    inferred = {}
    for dev, row in dev_coords.iterrows():
        if len(row["lat"]) == 1 and len(row["lon"]) == 1 and row["lat"][0] and row["lon"][0]:
            inferred[dev] = (row["lat"][0], row["lon"][0])
    fill = (~in_clean) & df["device"].isin(inferred) & (df["lat"] == "")
    df.loc[fill, "lat"] = df.loc[fill, "device"].map(lambda d: inferred[d][0])
    df.loc[fill, "lon"] = df.loc[fill, "device"].map(lambda d: inferred[d][1])
    df.loc[fill, "lat_lon_source"] = "device_inferred"

    # --- output assertions ---
    assert len(df) == n_in == 494, f"expected 494 rows, got {len(df)}"
    assert df["image_file"].is_unique, "output image_file not unique"
    assert list(df.columns[:len(orig_cols)]) == orig_cols, "original column order changed"
    assert (df[orig_cols].values == m[orig_cols].values).all(), "original column values changed"
    sp = df[df["split_final"].isin(SPLITS)].groupby("camera_day")["split_final"].nunique()
    leak = sp[sp > 1]
    assert leak.empty, f"camera_day in >1 of train/val/test: {list(leak.index)}"

    df.to_csv(OUT_CSV, index=False)

    # ---------------- report ----------------
    R = ["# Label merge report", "",
         f"Inputs: `{MANIFEST.relative_to(ROOT)}` ({n_in} rows), "
         f"`{CLEAN.relative_to(ROOT)}` ({len(c)} rows). Join key `image_file`.",
         f"Output: `{OUT_CSV.relative_to(ROOT)}` ({len(df)} rows). All assertions passed.", ""]

    R += ["## final_label per split", "", "**Before** (`label` × `split`, empty split shown as `(none)`):", ""]
    before = pd.crosstab(df["split"].replace("", "(none)"), df["label"], margins=True, margins_name="total")
    R += [md_table(before.reset_index().rename(columns={"split": "split"})), "",
          "**After** (`final_label` × `split_final`):", ""]
    after = pd.crosstab(df["split_final"], df["final_label"], margins=True, margins_name="total")
    R += [md_table(after.reset_index()), ""]
    wsum = df.groupby(["split_final", "final_label"])["sample_weight"].agg(["count", "sum"]).reset_index()
    R += ["Sample-weight totals:", "", md_table(wsum), ""]

    chg = df[df["label_change"] != ""]
    R += [f"## Label changes ({len(chg)})", "",
          md_table(chg[["image_file", "camera_day", "label_change", "tier", "quality", "split_final",
                        "review_notes"]]), ""]

    nd = df[df["needs_decision"]]
    R += [f"## needs_decision ({len(nd)})", "",
          "Rows with `label_source == human` whose clean-set tier implies a different label. "
          "Manifest label kept.", "",
          md_table(nd[["image_file", "camera_day", "label", "human_check", "tier", "quality",
                       "review_notes"]]), ""]

    ua = df[df["split_final"] == "unassigned"].copy()
    ua["reason"] = [unassigned_reason[i] for i in ua.index]
    R += [f"## Unassigned split ({len(ua)})", "",
          md_table(ua[["image_file", "camera_day", "final_label", "tier", "reason"]]), ""]
    if excl_override:
        R += [f"Note: {len(excl_override)} excluded row(s) had an existing split overridden to "
              f"`excluded`: {', '.join(excl_override)}", ""]

    # positives not in clean set + review_id range check
    R += ["## Manifest positives not in the clean set", ""]
    pos_nc = df[(df["label"] == "positive") & ~in_clean].copy()
    rid = c[["review_id", "image_file", "site"]].copy()
    rid["prefix"] = rid["review_id"].str.split("-").str[0]
    rid["num"] = rid["review_id"].str.split("-").str[1].astype(int)
    # Is review_id ordered like image_file within each site? If so, a missing file's
    # neighbours bound where its review_id would have been.
    mono = {}
    for site, g in rid.groupby("site"):
        g = g.sort_values("image_file")
        mono[site] = g["num"].is_monotonic_increasing
    rows = []
    for _, r in pos_nc.iterrows():
        g = rid[rid["site"] == r["site"]].sort_values("image_file")
        if g.empty or not mono.get(r["site"], False):
            rows.append(dict(image_file=r["image_file"], claude_confidence=r["claude_confidence"],
                             label_source=r["label_source"], onc_taxa=r["onc_taxa"],
                             nearest_clean_ids="", within_clean_range="unknown"))
            continue
        lo = g[g["image_file"] < r["image_file"]].tail(1)
        hi = g[g["image_file"] > r["image_file"]].head(1)
        lo_id = lo["review_id"].iloc[0] if len(lo) else "(start)"
        hi_id = hi["review_id"].iloc[0] if len(hi) else "(end)"
        if len(lo) and len(hi):
            gap = int(hi["num"].iloc[0]) - int(lo["num"].iloc[0])
            within = (f"yes (id gap {gap})" if gap > 1
                      else "no slot: neighbours are consecutive ids")
        else:
            within = "no (outside range)"
        rows.append(dict(image_file=r["image_file"], claude_confidence=r["claude_confidence"],
                         label_source=r["label_source"], onc_taxa=r["onc_taxa"],
                         nearest_clean_ids=f"{lo_id} .. {hi_id}", within_clean_range=within))
    R += [md_table(pd.DataFrame(rows)), ""]
    R += ["review_id ranges in the clean set: " + ", ".join(
        f"{p} {g['num'].min():04d}–{g['num'].max():04d} ({len(g)} ids)"
        for p, g in rid.groupby("prefix")) + ".",
          "review_id increases with image_file order within each site: " + ", ".join(
        f"{s}={v}" for s, v in mono.items()) + ".", ""]
    R += ["Interpretation: the review_id numbering covers far more frames than the 76 kept "
          "(only the kept rows are recorded), so ids for reviewed-and-rejected frames are not "
          "available. A position *inside* the reviewed id range with a gap means the frame "
          "could have been reviewed and dropped, but **whether it was actually seen and "
          "rejected vs. never reviewed is unknown** from these CSVs. A position between "
          "consecutive ids means it was not in the reviewed sequence.", ""]

    cov = df.groupby("site").apply(
        lambda g: pd.Series({"rows": len(g), "with_lat_lon": int((g["lat"] != "").sum()),
                             "clean_manifest": int((g["lat_lon_source"] == "clean_manifest").sum()),
                             "device_inferred": int((g["lat_lon_source"] == "device_inferred").sum())}),
        include_groups=False).reset_index()
    tot = int((df["lat"] != "").sum())
    R += ["## lat/lon coverage after filling", "",
          f"{tot} / {len(df)} rows ({tot / len(df):.0%}) have lat/lon.", "", md_table(cov), "",
          "Per-device clean coordinates: " + "; ".join(
              f"{d}: {', '.join(r['lat'])} / {', '.join(r['lon'])}" for d, r in dev_coords.iterrows())
          + ". Devices with no clean rows get no coordinates.", ""]

    OUT_MD.write_text("\n".join(R))
    print(f"wrote {OUT_CSV.relative_to(ROOT)} ({len(df)} rows) and {OUT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
