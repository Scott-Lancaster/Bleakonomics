#!/usr/bin/env python3
import os
os.environ['MATPLOTLIB_NO_SECURE_CODING_WARNING'] = '1'

"""
===============================================================================
CPI INFLATION | CPIAUCSL | Dark Mode
===============================================================================

WHAT IT SHOWS
  Monthly year-over-year CPI inflation derived from FRED CPIAUCSL.

DATA SOURCES (FRED)
  CPIAUCSL: https://fred.stlouisfed.org/series/CPIAUCSL

OUTPUTS
  public/charts/cpi.png
  public/data/cpi.json
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
CHART_PATH = ROOT / "public" / "charts" / "cpi.png"
DATA_PATH = ROOT / "public" / "data" / "cpi.json"

START_YEAR = 1980
FETCH_START_YEAR = START_YEAR - 1
start = datetime(FETCH_START_YEAR, 1, 1)
end = datetime.now()


def read_fred_series(series_id, start, end):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    data = pd.read_csv(url, parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    return data[[series_id]]

try:
    print("Fetching FRED data...")
    cpi = read_fred_series("CPIAUCSL", start, end)
    recession = read_fred_series("USREC", datetime(START_YEAR, 1, 1), end)

    if cpi.dropna().empty or recession.dropna().empty:
        raise RuntimeError("FRED returned empty CPI or recession data.")
except Exception as exc:
    print(f"WARNING: Could not fetch FRED data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

data = cpi.dropna(subset=["CPIAUCSL"]).copy()
data["YoY"] = data["CPIAUCSL"].pct_change(12) * 100
data["MA_6M"] = data["YoY"].rolling(6, min_periods=1).mean()
data = data.dropna(subset=["YoY"])
data = data.loc[data.index >= pd.Timestamp(datetime(START_YEAR, 1, 1))]
recession = recession.dropna()

if data.empty:
    raise RuntimeError("Not enough CPI observations to calculate year-over-year inflation.")

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
    "legend.fontsize": 10,
})

fig, ax = plt.subplots(figsize=(14, 7))

in_recession = False
recession_added = False
rec_start = None
for date, row in recession.iterrows():
    if row["USREC"] == 1 and not in_recession:
        in_recession = True
        rec_start = date
    elif row["USREC"] == 0 and in_recession:
        in_recession = False
        label = "Recession" if not recession_added else ""
        ax.axvspan(rec_start, date, color="#cc4444", alpha=0.25, label=label)
        recession_added = True
if in_recession and rec_start is not None:
    label = "Recession" if not recession_added else ""
    ax.axvspan(rec_start, end, color="#cc4444", alpha=0.25, label=label)

ax.plot(data.index, data["YoY"], color="#cccccc", linewidth=1.4, label="CPI YoY")
ax.plot(data.index, data["MA_6M"], color="#4da6ff", linewidth=2.0, label="6-Month Avg")
ax.axhline(2, color="#ff6b6b", linestyle="--", linewidth=1.2, alpha=0.75, label="2% reference")
ax.axhline(0, color="#888888", linestyle="--", linewidth=1.0, alpha=0.5)

ax.set_title(
    f"CPI Inflation YoY ({START_YEAR}-Now)\nLatest: {data['YoY'].iloc[-1]:.2f}%",
    color="white",
    fontsize=14,
    pad=20,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white")
ax.set_ylabel("Year-over-year change (%)", color="white")
ax.legend(loc="upper left", framealpha=0.95)
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(2))
plt.xticks(rotation=45)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

latest = data.iloc[-1]

recessions = []
in_recession = False
rec_start = None
for date, row in recession.iterrows():
    if row["USREC"] == 1 and not in_recession:
        in_recession = True
        rec_start = date
    elif row["USREC"] == 0 and in_recession:
        in_recession = False
        recessions.append({
            "start": rec_start.date().isoformat(),
            "end": date.date().isoformat(),
        })
if in_recession and rec_start is not None:
    recessions.append({
        "start": rec_start.date().isoformat(),
        "end": end.date().isoformat(),
    })

observations = [
    {
        "date": index.date().isoformat(),
        "value": float(row["YoY"]),
        "cpi": float(row["CPIAUCSL"]),
        "ma6": float(row["MA_6M"]),
    }
    for index, row in data.iterrows()
]

metadata = {
    "title": "CPI Inflation",
    "latest": float(latest["YoY"]),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED",
    "chart_path": "/charts/cpi.png",
    "description": "Monthly year-over-year inflation derived from CPIAUCSL.",
    "summary": "Under Construction",
    "papers": [],
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"Latest CPI YoY: {latest['YoY']:.2f}% | CPIAUCSL: {latest['CPIAUCSL']:.3f}")
