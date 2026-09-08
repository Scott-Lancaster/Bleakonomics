#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
US M2 MONEY SUPPLY | Trillions of dollars | Dark Mode
===============================================================================
M2SL monthly, seasonally adjusted, billions. Charted in trillions.
World GDP (World Bank via FRED NYGDPMKTPCDWLD) is annual current USD.
US M2 / world GDP is a stock vs a year's output — a size check, not a
share of global M2.

DATA
  M2SL:              https://fred.stlouisfed.org/series/M2SL
  GDP:               https://fred.stlouisfed.org/series/GDP
  NYGDPMKTPCDWLD:    https://fred.stlouisfed.org/series/NYGDPMKTPCDWLD
  USREC:             https://fred.stlouisfed.org/series/USREC
===============================================================================
"""

import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def read_fred_series(series_id, start, end):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    data = pd.read_csv(url, parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    return data[[series_id]]


ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "m2.png"
DATA_PATH = ROOT / "public" / "data" / "m2.json"

START_YEAR = 1980
start = datetime(START_YEAR, 1, 1)
end = datetime.now()

try:
    print("Fetching FRED data...")
    m2 = read_fred_series("M2SL", start, end)
    recession = read_fred_series("USREC", start, end)
    us_gdp = read_fred_series("GDP", start, end)
    world_gdp = read_fred_series("NYGDPMKTPCDWLD", datetime(1960, 1, 1), end)

    if m2.dropna().empty or recession.dropna().empty:
        raise RuntimeError("FRED returned empty M2 or recession data.")
except Exception as exc:
    print(f"WARNING: Could not fetch FRED data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

m2 = m2.dropna()
recession = recession.dropna()
m2["trillion"] = m2["M2SL"] / 1000.0

latest_m2_billions = float(m2["M2SL"].iloc[-1])
latest_m2_trillion = round(latest_m2_billions / 1000.0, 2)

us_gdp = us_gdp.dropna()
world_gdp = world_gdp.dropna()
latest_us_gdp_billions = float(us_gdp["GDP"].iloc[-1]) if not us_gdp.empty else None
latest_world_gdp_usd = float(world_gdp["NYGDPMKTPCDWLD"].iloc[-1]) if not world_gdp.empty else None
world_gdp_year = int(world_gdp.index[-1].year) if not world_gdp.empty else None

m2_pct_us_gdp = round(latest_m2_billions / latest_us_gdp_billions * 100, 1) if latest_us_gdp_billions else None
m2_pct_world_gdp = (
    round(latest_m2_billions * 1_000_000_000 / latest_world_gdp_usd * 100, 1)
    if latest_world_gdp_usd
    else None
)

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

ax.plot(m2.index, m2["trillion"], color="#cccccc", linewidth=1.4, label="US M2")
share_note = (
    f" | ~{m2_pct_world_gdp:.0f}% of world GDP ({world_gdp_year})"
    if m2_pct_world_gdp is not None
    else ""
)
ax.set_title(
    f"US M2 Money Supply ({START_YEAR}–Now)\nLast: ${latest_m2_trillion:.2f}T{share_note}",
    color="white",
    fontsize=14,
    pad=20,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white")
ax.set_ylabel("Trillions of dollars", color="white")
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

summary = (
    "M2 is the pile of US dollars in cash, checking, savings, small CDs, and retail money-market funds. "
    f"Right now it is about ${latest_m2_trillion:.1f} trillion. "
    "That is a stock of money, not a year's spending. Compared with one year of world output "
    f"(World Bank, {world_gdp_year}), it is roughly {m2_pct_world_gdp:.0f}% — a size check, not a slice of global M2. "
    "The Fed changed the M2 recipe in 2020, so treat the level around that year with care."
)

papers = [
    {
        "title": "Fed H.6 Money Stock Measures",
        "url": "https://www.federalreserve.gov/releases/h6/current/default.htm",
    },
    {
        "title": "FRED M2 (M2SL)",
        "url": "https://fred.stlouisfed.org/series/M2SL",
    },
    {
        "title": "World Bank GDP (current US$) via FRED",
        "url": "https://fred.stlouisfed.org/series/NYGDPMKTPCDWLD",
    },
]

observations = [
    {
        "date": index.date().isoformat(),
        "value": round(float(row["trillion"]), 3),
    }
    for index, row in m2.iterrows()
]

metadata = {
    "title": "US M2 Money Supply",
    "latest": latest_m2_trillion,
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED / Federal Reserve H.6",
    "chart_path": "/charts/m2.png",
    "description": "Monthly seasonally adjusted US M2, trillions of dollars.",
    "summary": summary,
    "papers": papers,
    "m2_pct_world_gdp": m2_pct_world_gdp,
    "m2_pct_us_gdp": m2_pct_us_gdp,
    "world_gdp_year": world_gdp_year,
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(
    f"Latest M2: ${latest_m2_trillion:.2f}T | vs US GDP {m2_pct_us_gdp}% | vs world GDP {m2_pct_world_gdp}% ({world_gdp_year})"
)
