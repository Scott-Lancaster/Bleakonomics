#!/usr/bin/env python3
import os
os.environ['MATPLOTLIB_NO_SECURE_CODING_WARNING'] = '1'

"""
===============================================================================
SOFR - IORB SPREAD | Dark Mode
===============================================================================

WHAT IT SHOWS
  Daily spread = SOFR - IORB, in basis points.

DATA SOURCES (FRED)
  SOFR: https://fred.stlouisfed.org/series/SOFR
  IORB: https://fred.stlouisfed.org/series/IORB

OUTPUTS
  public/charts/sofr_iorb.png
  public/data/sofr_iorb.json
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
CHART_PATH = ROOT / "public" / "charts" / "sofr_iorb.png"
DATA_PATH = ROOT / "public" / "data" / "sofr_iorb.json"

START_YEAR = 2021
start = datetime(START_YEAR, 1, 1)
end = datetime.now()


def read_fred_series(series_id, start, end):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    data = pd.read_csv(url, parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    return data[[series_id]]

try:
    print("Fetching FRED data...")
    sofr = read_fred_series("SOFR", start, end)
    iorb = read_fred_series("IORB", start, end)

    if sofr.dropna().empty or iorb.dropna().empty:
        raise RuntimeError("FRED returned empty SOFR or IORB data.")
except Exception as exc:
    print(f"WARNING: Could not fetch FRED data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

data = pd.concat([sofr, iorb], axis=1).dropna()
data["Spread_bp"] = (data["SOFR"] - data["IORB"]) * 100
data["MA_30d"] = data["Spread_bp"].rolling(30, min_periods=1).mean()

if data.empty:
    raise RuntimeError("No overlapping SOFR and IORB observations.")

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
ax.plot(data.index, data["Spread_bp"], color="#cccccc", linewidth=1.4, label="SOFR - IORB")
ax.plot(data.index, data["MA_30d"], color="#4da6ff", linewidth=2.0, label="30-Day MA")
ax.axhline(0, color="#888888", linestyle="--", linewidth=1.2, alpha=0.6)
ax.axhline(30, color="#ff6b6b", linestyle="--", linewidth=1.2, alpha=0.75, label="30 bp watchline")

ax.set_title(
    f"SOFR - IORB Spread ({START_YEAR}-Now)\nLatest: {data['Spread_bp'].iloc[-1]:.1f} bp",
    color="white",
    fontsize=14,
    pad=20,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white")
ax.set_ylabel("Spread (basis points)", color="white")
ax.legend(loc="upper left", framealpha=0.95)
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(1))
plt.xticks(rotation=45)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

latest = data.iloc[-1]
observations = [
    {
        "date": index.date().isoformat(),
        "value": float(row["Spread_bp"]),
        "sofr": float(row["SOFR"]),
        "iorb": float(row["IORB"]),
        "ma30": float(row["MA_30d"]),
    }
    for index, row in data.iterrows()
]

metadata = {
    "title": "SOFR - IORB Spread",
    "latest": float(latest["Spread_bp"]),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED",
    "chart_path": "/charts/sofr_iorb.png",
    "description": "Daily spread between SOFR and the Interest Rate on Reserve Balances, shown in basis points.",
    "summary": "Under Construction",
    "papers": [],
    "observations": observations,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"Latest: {latest['Spread_bp']:.1f} bp | SOFR: {latest['SOFR']:.2f}% | IORB: {latest['IORB']:.2f}%")
