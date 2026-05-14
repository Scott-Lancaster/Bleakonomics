#!/usr/bin/env python3
import os
os.environ['MATPLOTLIB_NO_SECURE_CODING_WARNING'] = '1'

"""
===============================================================================
10Y - 2Y TREASURY YIELD SPREAD | Dark Mode
===============================================================================
TLDR: | Negative spread equates to negative sentiment. Investors have more faith 
in the economy 2 years from now than 10 years from now 

WHAT IT SHOWS
  Daily spread = 10-Year Treasury Yield – 2-Year Treasury Yield (%)
  Shaded U.S. recessions (NBER)

WHY IT MATTERS
  When the curve inverts (spread < 0), investors have more faith in the economy 
  2 years from now than 10 years from now — a historically reliable recession signal.
  Positive spread → Normal growth expectations.
  → Has predicted every U.S. recession since 1955 with zero false positives.

DATA SOURCES (FRED)
  T10Y2Y: https://fred.stlouisfed.org/series/T10Y2Y   (1980–)
  USREC:  https://fred.stlouisfed.org/series/USREC    (1854–)

DATA FREQUENCY: Daily (market close; T10Y2Y updated ~3:30 PM ET)

PAPERS
  https://www.newyorkfed.org/medialibrary/media/research/current_issues/ci2-7.pdf
  https://doi.org/10.1111/j.1540-6261.1991.tb02674.x
  https://doi.org/10.2469/faj.v45.n5.38

ZOOM: Set START_YEAR / END_YEAR
===============================================================================
"""

import json
from pathlib import Path

import pandas as pd
import pandas_datareader.data as web
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from datetime import datetime

# ———————————————— OUTPUT SETTINGS ————————————————
ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "yield_curve.png"
DATA_PATH = ROOT / "public" / "data" / "yield_curve.json"

# ———————————————— ZOOM SETTINGS ————————————————
START_YEAR = 1980
END_YEAR   = None  # None = today
# ———————————————————————————————————————————————

start = datetime(START_YEAR, 1, 1)
end   = datetime.now() if END_YEAR is None else datetime(END_YEAR, 12, 31)

# Fetch data
yield_curve = web.DataReader('T10Y2Y', 'fred', start, end)
recession   = web.DataReader('USREC',  'fred', start, end)

# ———————————————— DARK MODE STYLE ————————————————
plt.style.use('dark_background')
plt.rcParams.update({
    'figure.facecolor': '#0a0a0a',
    'axes.facecolor':   '#0a0a0a',
    'axes.edgecolor':   '#333333',
    'axes.labelcolor':  'white',
    'text.color':       'white',
    'xtick.color':      'white',
    'ytick.color':      'white',
    'grid.color':       '#2a2a2a',
    'grid.alpha':       0.3,
    'legend.facecolor': '#1a1a1a',
    'legend.edgecolor': '#333333',
    'legend.fontsize':  10,
})

fig, ax = plt.subplots(figsize=(14, 7))

# Main spread line — thinner, elegant
ax.plot(yield_curve.index, yield_curve['T10Y2Y'],
        color='#cccccc', linewidth=1.4, label='10Y - 2Y Spread')

# Recession shading — darker, richer red
in_recession = False
recession_added = False

for date, row in recession.iterrows():
    if row['USREC'] == 1 and not in_recession:
        in_recession = True
        rec_start = date
    elif row['USREC'] == 0 and in_recession:
        in_recession = False
        label = 'Recession' if not recession_added else ""
        ax.axvspan(rec_start, date, color='#cc4444', alpha=0.25, label=label)
        recession_added = True

if in_recession:
    label = 'Recession' if not recession_added else ""
    ax.axvspan(rec_start, end, color='#cc4444', alpha=0.25, label=label)

# Zero line — slightly darker red, less aggressive
ax.axhline(0, color='#ff6b6b', linestyle='--', linewidth=1.3, alpha=0.8, label='Inversion (0%)')

# Title & labels
ax.set_title(f'10-Year minus 2-Year Treasury Yield Spread ({START_YEAR}–{END_YEAR or "Now"})\n'
             f'Last: {yield_curve["T10Y2Y"].iloc[-1]:.2f}%',
             color='white', fontsize=14, pad=20, fontweight='bold')
ax.set_xlabel('Year', color='white')
ax.set_ylabel('Spread (%)', color='white')

# Legend
ax.legend(loc='upper left', framealpha=0.95)

# Grid & formatting
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter('%Y'))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(2))
plt.xticks(rotation=45)

plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

# ———————————————— FINAL SUMMARY ————————————————
latest = yield_curve.iloc[-1]['T10Y2Y']

recessions = []
in_recession = False
rec_start = None
for date, row in recession.iterrows():
    if row['USREC'] == 1 and not in_recession:
        in_recession = True
        rec_start = date
    elif row['USREC'] == 0 and in_recession:
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

summary = "The 10-year and 2-year Treasury yields are market interest rates on U.S. government debt at different maturities. This spread compares long-term growth and inflation expectations against near-term policy and credit conditions: a steep positive spread usually signals normal expansion, while an inversion suggests investors expect weaker growth or future rate cuts. Historically, sustained inversions have preceded U.S. recessions, making the curve a useful warning signal rather than a precise timer."
papers = [
    {
        "title": "https://www.newyorkfed.org/medialibrary/media/research/current_issues/ci2-7.pdf",
        "url": "https://www.newyorkfed.org/medialibrary/media/research/current_issues/ci2-7.pdf",
    },
    {
        "title": "https://doi.org/10.1111/j.1540-6261.1991.tb02674.x",
        "url": "https://doi.org/10.1111/j.1540-6261.1991.tb02674.x",
    },
    {
        "title": "https://doi.org/10.2469/faj.v45.n5.38",
        "url": "https://doi.org/10.2469/faj.v45.n5.38",
    },
]

observations = [
    {
        "date": index.date().isoformat(),
        "value": float(row["T10Y2Y"]),
    }
    for index, row in yield_curve.dropna().iterrows()
]

metadata = {
    "title": "10Y - 2Y Treasury Yield Spread",
    "latest": float(latest),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED",
    "chart_path": "/charts/yield_curve.png",
    "description": "Daily spread between the 10-year and 2-year U.S. Treasury yields.",
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
print(f"Latest: {latest:.2f}% | Data Frequency: Daily (updated ~3:30 PM ET)")