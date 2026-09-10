#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
US NET LIQUIDITY | Fed assets minus TGA minus overnight RRP | Dark Mode
===============================================================================
Weekly Wednesday: WALCL (millions) - WTREGEN (millions) - RRPONTSYD (billions).
RRP is filled at 0 before the series exists. History starts Dec 2002 — that is
when WALCL/TGA are both on FRED. Do not pad back to 1980.

DATA
  WALCL:      https://fred.stlouisfed.org/series/WALCL
  WTREGEN:    https://fred.stlouisfed.org/series/WTREGEN
  RRPONTSYD:  https://fred.stlouisfed.org/series/RRPONTSYD
  USREC:      https://fred.stlouisfed.org/series/USREC
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
CHART_PATH = ROOT / "public" / "charts" / "net_liquidity.png"
DATA_PATH = ROOT / "public" / "data" / "net_liquidity.json"

START_YEAR = 2002
start = datetime(START_YEAR, 12, 1)
end = datetime.now()

try:
    print("Fetching FRED data...")
    walcl = read_fred_series("WALCL", start, end)
    tga = read_fred_series("WTREGEN", start, end)
    rrp = read_fred_series("RRPONTSYD", start, end)
    recession = read_fred_series("USREC", datetime(2002, 1, 1), end)

    if walcl.dropna().empty or tga.dropna().empty:
        raise RuntimeError("FRED returned empty WALCL or TGA data.")
except Exception as exc:
    print(f"WARNING: Could not fetch FRED data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

walcl = walcl.dropna()
tga = tga.dropna()
rrp = rrp.dropna() if rrp is not None else pd.DataFrame()
recession = recession.dropna()

frame = pd.concat([walcl, tga], axis=1).dropna()
if not rrp.empty:
    rrp_on_walcl = rrp["RRPONTSYD"].reindex(frame.index, method="ffill").fillna(0.0)
else:
    rrp_on_walcl = pd.Series(0.0, index=frame.index)

# WALCL and TGA are millions of dollars. RRPONTSYD is billions.
frame["net_trillion"] = frame["WALCL"] / 1_000_000.0 - frame["WTREGEN"] / 1_000_000.0 - rrp_on_walcl / 1_000.0
frame = frame.dropna(subset=["net_trillion"])

if frame.empty:
    raise RuntimeError("No overlapping net liquidity observations.")

latest = float(frame["net_trillion"].iloc[-1])

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

ax.plot(frame.index, frame["net_trillion"], color="#cccccc", linewidth=1.4, label="Net liquidity")
ax.set_title(
    f"US Net Liquidity\nLast: ${latest:.2f}T  |  Fed Assets - TGA - ON RRP",
    color="white",
    fontsize=14,
    pad=20,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white", fontsize=13, fontweight="bold")
plt.setp(ax.get_xticklabels(), fontsize=13, fontweight="bold")
ax.set_ylabel("Trillions of dollars", color="white")
ax.legend(loc="upper left", framealpha=0.95)
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(2))
plt.xticks(rotation=45)
plt.setp(ax.get_xticklabels(), fontsize=13, fontweight="bold")
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
    "Net liquidity is the Fed's balance sheet minus cash the Treasury is holding "
    "minus cash parked overnight at the Fed. What is left is the cash sloshing in markets. "
    "This series only starts in December 2002, when the Fed published these pieces together. "
    "It is not a 1980s chart. The overnight RRP pile was tiny until 2021, then huge, then drained."
)

papers = [
    {
        "title": "FRED: Fed total assets (WALCL)",
        "url": "https://fred.stlouisfed.org/series/WALCL",
    },
    {
        "title": "FRED: Treasury General Account (WTREGEN)",
        "url": "https://fred.stlouisfed.org/series/WTREGEN",
    },
    {
        "title": "NY Fed: Overnight Reverse Repo Facility",
        "url": "https://www.newyorkfed.org/markets/desk-operations/reverse-repo",
    },
]

observations = [
    {
        "date": index.date().isoformat(),
        "value": round(float(row["net_trillion"]), 3),
    }
    for index, row in frame.iterrows()
]

metadata = {
    "title": "US Net Liquidity",
    "latest": round(latest, 2),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED WALCL, WTREGEN, RRPONTSYD",
    "chart_path": "/charts/net_liquidity.png",
    "description": "Weekly Fed assets minus TGA minus overnight RRP, trillions of dollars.",
    "summary": summary,
    "papers": papers,
    "start_year": 2002,
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"Latest net liquidity: ${latest:.2f}T | weekly from 2002")
