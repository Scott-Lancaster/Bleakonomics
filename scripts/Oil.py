#!/usr/bin/env python3
import os
os.environ['MATPLOTLIB_NO_SECURE_CODING_WARNING'] = '1'

"""
===============================================================================
WTI CRUDE OIL | Dollars per barrel | Dark Mode
===============================================================================
TLDR: Spot price of West Texas Intermediate crude at Cushing, Oklahoma.
Oil is a US-traded global commodity: it feeds inflation, trucking, and
the cost of running just about everything.

WHAT IT SHOWS
  WTI spot price, dollars per barrel, from 1978 so NBER recessions
  line up with the other long-term charts.
  Monthly WTISPLC through 1985, then daily DCOILWTICO (Cushing).

DATA SOURCES
  WTISPLC:    https://fred.stlouisfed.org/series/WTISPLC     (monthly, 1946–)
  DCOILWTICO: https://fred.stlouisfed.org/series/DCOILWTICO  (daily, 1986–)
  USREC:      https://fred.stlouisfed.org/series/USREC

DATA FREQUENCY: Monthly before 1986, then daily business days.

PAPERS
  https://www.nber.org/papers/w15002
  https://www.nber.org/papers/w13368
  https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm
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
CHART_PATH = ROOT / "public" / "charts" / "oil.png"
DATA_PATH = ROOT / "public" / "data" / "oil.json"

START_YEAR = 1978
END_YEAR = None

start = datetime(START_YEAR, 1, 1)
end = datetime.now() if END_YEAR is None else datetime(END_YEAR, 12, 31)

try:
    print("Fetching FRED data...")
    monthly = read_fred_series("WTISPLC", start, end)
    daily = read_fred_series("DCOILWTICO", start, end)
    recession = read_fred_series("USREC", start, end)

    if monthly.dropna().empty or recession.dropna().empty:
        raise RuntimeError("FRED returned empty WTI or recession data.")
except Exception as exc:
    print(f"WARNING: Could not fetch FRED data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

monthly = monthly.dropna().rename(columns={"WTISPLC": "WTI"})
daily = daily.dropna().rename(columns={"DCOILWTICO": "WTI"})
if not daily.empty:
    monthly = monthly.loc[monthly.index < daily.index.min()]
oil = pd.concat([monthly, daily]).sort_index()
recession = recession.dropna()

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

ax.plot(oil.index, oil["WTI"], color="#cccccc", linewidth=1.4, label="WTI Crude")
ax.axhline(0, color="#888888", linestyle="--", linewidth=1.0, alpha=0.45)

latest_value = float(oil["WTI"].iloc[-1])
ax.set_title(
    f"WTI Crude Oil ({START_YEAR}–{END_YEAR or 'Now'})\nLast: ${latest_value:.2f} / barrel",
    color="white",
    fontsize=14,
    pad=20,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white")
ax.set_ylabel("Dollars per barrel", color="white")
ax.legend(loc="upper left", framealpha=0.95)
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(2))
plt.xticks(rotation=45)
ax.margins(x=0)
ax.set_xlim(pd.Timestamp(start), oil.index.max())
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
    "West Texas Intermediate is the US benchmark price for a barrel of crude oil, "
    "quoted at Cushing, Oklahoma. It is a global commodity that still lands in US "
    "inflation, gasoline, freight, and industrial costs. Spikes often show up around "
    "geopolitical shocks; crashes can print even negative, as in April 2020. It is "
    "not a Fed policy rate and it is not the price you pay at the pump."
)
papers = [
    {
        "title": "Causes and Consequences of the Oil Shock of 2007-08",
        "url": "https://www.nber.org/papers/w15002",
    },
    {
        "title": "The Macroeconomic Effects of Oil Shocks: Why Are the 2000s So Different from the 1970s?",
        "url": "https://www.nber.org/papers/w13368",
    },
    {
        "title": "EIA spot prices for crude oil (WTI Cushing)",
        "url": "https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm",
    },
    {
        "title": "FRED WTISPLC (monthly WTI, 1946–)",
        "url": "https://fred.stlouisfed.org/series/WTISPLC",
    },
]

observations = [
    {
        "date": index.date().isoformat(),
        "value": float(row["WTI"]),
    }
    for index, row in oil.iterrows()
]

metadata = {
    "title": "WTI Crude Oil",
    "latest": round(latest_value, 2),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED WTISPLC (monthly to 1985), DCOILWTICO (daily from 1986)",
    "chart_path": "/charts/oil.png",
    "description": "West Texas Intermediate crude oil, dollars per barrel. Monthly before 1986, daily after.",
    "summary": summary,
    "papers": papers,
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"Latest: ${latest_value:.2f} / barrel | Monthly WTISPLC to 1985, daily DCOILWTICO after")
