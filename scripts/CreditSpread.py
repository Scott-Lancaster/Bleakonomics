#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
CREDIT SPREAD | Baa–10Y + ICE HY OAS | Dark Mode
===============================================================================
BAA10Y: Moody's Baa corporate yield minus the 10-year Treasury (daily, 1986–).
BAMLH0A0HYM2: ICE BofA US High Yield OAS (daily). As of April 2026 FRED only
publishes the last 3 years of the ICE series.

Left/only axis: percentage points. Two lines, no fill.
===============================================================================
"""

import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "credit_spread.png"
DATA_PATH = ROOT / "public" / "data" / "credit_spread.json"

START = datetime(1986, 1, 1)
END = datetime.now()


def read_fred(series_id, start, end):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    data = pd.read_csv(url, parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    col = data.columns[0]
    return data[col].dropna().rename(series_id)


try:
    print("Fetching credit-spread series...")
    baa = read_fred("BAA10Y", START, END)
    hy = read_fred("BAMLH0A0HYM2", START, END)
    rec = read_fred("USREC", START, END)
    if baa.empty:
        raise RuntimeError("FRED returned empty BAA10Y data.")
except Exception as exc:
    print(f"WARNING: Could not fetch data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

frame = pd.concat([baa.rename("baa"), hy.rename("hy")], axis=1).sort_index()
frame = frame.loc[frame.index >= pd.Timestamp(START)]
frame = frame.dropna(how="all")

latest_hy = None if frame["hy"].dropna().empty else float(frame["hy"].dropna().iloc[-1])
latest_baa = None if frame["baa"].dropna().empty else float(frame["baa"].dropna().iloc[-1])
latest_value = latest_hy if latest_hy is not None else latest_baa
hy_start = None if frame["hy"].dropna().empty else frame["hy"].dropna().index.min().date().isoformat()

recession = rec.dropna()
recessions = []
in_recession = False
rec_start = None
for date, value in recession.items():
    flag = float(value)
    if flag == 1 and not in_recession:
        in_recession = True
        rec_start = date
    elif flag == 0 and in_recession:
        in_recession = False
        recessions.append({"start": rec_start.date().isoformat(), "end": date.date().isoformat()})
if in_recession and rec_start is not None:
    recessions.append({"start": rec_start.date().isoformat(), "end": END.date().isoformat()})

plt.style.use("dark_background")
plt.rcParams.update({
    "figure.facecolor": "#0a0a0a",
    "axes.facecolor": "#0a0a0a",
    "axes.edgecolor": "#333333",
    "axes.labelcolor": "white",
    "text.color": "white",
    "xtick.color": "white",
    "ytick.color": "white",
    "grid.color": "#2a2a2a",
    "grid.alpha": 0.3,
    "legend.facecolor": "#1a1a1a",
    "legend.edgecolor": "#333333",
    "legend.fontsize": 9,
})

fig, ax = plt.subplots(figsize=(14, 7))
in_rec = False
rec_start = None
rec_added = False
for date, value in recession.items():
    flag = float(value)
    if flag == 1 and not in_rec:
        in_rec = True
        rec_start = date
    elif flag == 0 and in_rec:
        in_rec = False
        label = "Recession" if not rec_added else ""
        ax.axvspan(rec_start, date, color="#cc4444", alpha=0.22, label=label)
        rec_added = True
if in_rec and rec_start is not None:
    ax.axvspan(rec_start, frame.index.max(), color="#cc4444", alpha=0.22, label="" if rec_added else "Recession")

ax.plot(frame.index, frame["baa"], color="#d6d6d6", linewidth=1.6, label="Baa − 10Y")
if frame["hy"].notna().any():
    ax.plot(frame.index, frame["hy"], color="#e07a5f", linewidth=2.0, label="High yield OAS")
ax.axhline(0, color="#888888", linestyle="--", linewidth=1.0, alpha=0.45)

title_bits = []
if latest_hy is not None:
    title_bits.append(f"HY OAS {latest_hy:.2f}%")
if latest_baa is not None:
    title_bits.append(f"Baa−10Y {latest_baa:.2f}%")
ax.set_title(
    "High Yield Credit Spread\nCurrent: " + "  |  ".join(title_bits),
    color="white",
    fontsize=13,
    pad=16,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white", fontsize=13, fontweight="bold")
plt.setp(ax.get_xticklabels(), fontsize=13, fontweight="bold")
ax.set_ylabel("Spread (percentage points)", color="white")
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(2))
plt.xticks(rotation=45)
plt.setp(ax.get_xticklabels(), fontsize=13, fontweight="bold")
ax.margins(x=0)
ax.set_xlim(frame.index.min(), frame.index.max())
ax.legend(loc="upper left", framealpha=0.95)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

hy_note = (
    f"Orange is ICE BofA US High Yield OAS, the junk-bond spread. FRED only publishes "
    f"about three years of it as of 2026"
    + (f" (from {hy_start})." if hy_start else ".")
    + " Silver is Moody's Baa minus the 10-year Treasury — the long public credit-spread series."
)
summary = (
    "This is the extra yield lenders demand to hold company debt instead of Treasuries. "
    "When it jumps, credit is getting tight. "
    + hy_note
)

papers = [
    {"title": "FRED: Moody's Baa minus 10-Year Treasury (BAA10Y)", "url": "https://fred.stlouisfed.org/series/BAA10Y"},
    {"title": "FRED: ICE BofA US High Yield OAS (BAMLH0A0HYM2)", "url": "https://fred.stlouisfed.org/series/BAMLH0A0HYM2"},
    {"title": "Gilchrist and Zakrajšek: Credit Spreads and Business Cycle Fluctuations", "url": "https://www.nber.org/papers/w17021"},
    {"title": "Fed H.15 Selected Interest Rates", "url": "https://www.federalreserve.gov/releases/h15/"},
]

observations = []
for index, row in frame.iterrows():
    baa_val = None if pd.isna(row["baa"]) else round(float(row["baa"]), 2)
    hy_val = None if pd.isna(row["hy"]) else round(float(row["hy"]), 2)
    observations.append({
        "date": index.date().isoformat(),
        "baa": baa_val,
        "hy": hy_val,
        "value": hy_val if hy_val is not None else baa_val,
    })

metadata = {
    "title": "High Yield Credit Spread",
    "latest": None if latest_value is None else round(latest_value, 2),
    "latest_hy": None if latest_hy is None else round(latest_hy, 2),
    "latest_baa": None if latest_baa is None else round(latest_baa, 2),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED BAA10Y, BAMLH0A0HYM2",
    "chart_path": "/charts/credit_spread.png",
    "description": "Moody's Baa minus 10-year Treasury, plus ICE BofA high-yield OAS where FRED still publishes it.",
    "summary": summary,
    "papers": papers,
    "hy_start": hy_start,
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"HY {latest_hy} | Baa {latest_baa} | hy start {hy_start}")
