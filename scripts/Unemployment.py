#!/usr/bin/env python3
import os
os.environ['MATPLOTLIB_NO_SECURE_CODING_WARNING'] = '1'

"""
===============================================================================
US UNEMPLOYMENT RATE + SAHM RULE | Dark Mode
===============================================================================
TLDR: The unemployment rate measures the share of the labor force actively looking
for work but unable to find it. The Sahm Rule watches for a sharp rise from recent
lows, which historically confirms recessionary labor-market stress.

WHAT IT SHOWS
  Monthly US unemployment rate (%)
  Shaded U.S. recessions (NBER)
  Optional red dots = Sahm Rule triggered (3MMA >= +0.5 pp from 12-month low)

WHY IT MATTERS
  The Sahm Rule has identified U.S. recessions quickly by detecting accelerating
  job losses. It is more of a confirmation signal than a long-lead forecast.

DATA SOURCES (FRED)
  UNRATE: https://fred.stlouisfed.org/series/UNRATE
  USREC:  https://fred.stlouisfed.org/series/USREC

DATA FREQUENCY: Monthly (BLS release: 1st Friday ~8:30 AM ET | FRED update: +1-3 days)

PAPERS
  https://www.federalreserve.gov/econres/feds/files/2019045pap.pdf
  https://www.brookings.edu/articles/direct-stimulus-payments-to-individuals/

ZOOM: Set START_YEAR
===============================================================================
"""

import json
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
import pandas_datareader.data as web
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "unemployment.png"
DATA_PATH = ROOT / "public" / "data" / "unemployment.json"

START_YEAR = 1950
SHOW_SAHM_DOTS = False

start = datetime(START_YEAR, 1, 1)
end = datetime.now()

try:
    print("Fetching FRED data...")
    unrate = web.DataReader('UNRATE', 'fred', start, end)
    recession = web.DataReader('USREC', 'fred', start, end)

    if unrate.dropna().empty or recession.dropna().empty:
        raise RuntimeError("FRED returned empty unemployment or recession data.")
except Exception as exc:
    print(f"WARNING: Could not fetch FRED data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

unrate = unrate.dropna(subset=['UNRATE'])
recession = recession.dropna()

unrate['3MMA'] = unrate['UNRATE'].rolling(3).mean()
unrate['12M_Low'] = unrate['3MMA'].rolling(12).min().shift(1)
unrate['Sahm_Rule'] = unrate['3MMA'] - unrate['12M_Low']
unrate['Sahm_Trigger'] = unrate['Sahm_Rule'] >= 0.5

triggers = unrate[unrate['Sahm_Trigger']].dropna()
current_sahm = float(unrate['Sahm_Rule'].dropna().iloc[-1])
current_unrate = float(unrate['UNRATE'].iloc[-1])
status = "TRIGGERED" if current_sahm >= 0.5 else "Near Trigger" if current_sahm >= 0.35 else "Safe"

print("\n=== LAST 4 SAHM RULE READINGS (Date | Unemployment | 3MMA | Sahm Rise) ===")
last_4 = unrate[['UNRATE', '3MMA', 'Sahm_Rule']].tail(4)
for date, row in last_4.iterrows():
    print(f"{date.strftime('%b %Y')}: {row['UNRATE']:.1f}% | 3MMA = {row['3MMA']:.2f} | Sahm = {row['Sahm_Rule']:.2f} pp")

if last_4.index[-1] < datetime.now() - timedelta(days=45):
    print("(Note: Data may be stale -- FRED lags after BLS releases)")

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(14, 7))
ax.plot(unrate.index, unrate['UNRATE'], color='#aaaaaa', linewidth=1.4, label='Unemployment Rate')

if SHOW_SAHM_DOTS and not triggers.empty:
    ax.scatter(triggers.index, triggers['UNRATE'], color='#ff4444', s=80, zorder=5,
               edgecolors='white', linewidth=1, label='Sahm Rule Trigger')

in_rec = False
rec_start = None
label_added = False
for date, row in recession.iterrows():
    if row['USREC'] == 1 and not in_rec:
        in_rec = True
        rec_start = date
    elif row['USREC'] == 0 and in_rec:
        in_rec = False
        lbl = 'Recession' if not label_added else ""
        ax.axvspan(rec_start, date, color='#cc4444', alpha=0.25, label=lbl)
        label_added = True
if in_rec:
    lbl = 'Recession' if not label_added else ""
    ax.axvspan(rec_start, end, color='#cc4444', alpha=0.25, label=lbl)

ax.set_title(f'US Unemployment Rate + Sahm Rule ({START_YEAR}-Now)\n'
             f'Latest: {current_unrate:.2f}% | Sahm: {current_sahm:.2f} pp -> {status}',
             color='white', fontsize=14, pad=20, fontweight='bold')
ax.set_xlabel('Year', color='white')
ax.set_ylabel('Unemployment Rate (%)', color='white')
ax.legend(loc='upper left', framealpha=0.95)
ax.grid(True, alpha=0.15)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter('%Y'))
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

summary = "The unemployment rate is the share of people in the labor force who are actively looking for work but do not have a job. It usually rises after the economy has already started weakening, so it is less of an early-warning signal and more of a confirmation that stress has reached households. The Sahm Rule adds nuance by measuring how quickly unemployment is rising from recent lows; historically, a 0.5 percentage-point rise in the three-month average has lined up closely with U.S. recessions."
papers = [
    {
        "title": "Direct Stimulus Payments to Individuals",
        "url": "https://www.brookings.edu/articles/direct-stimulus-payments-to-individuals/",
    },
    {
        "title": "Sahm Rule Recession Indicator",
        "url": "https://fred.stlouisfed.org/series/SAHMREALTIME",
    },
]

observations = [
    {
        "date": index.date().isoformat(),
        "value": float(row['UNRATE']),
        "sahm": None if pd.isna(row['Sahm_Rule']) else float(row['Sahm_Rule']),
        "three_month_average": None if pd.isna(row['3MMA']) else float(row['3MMA']),
    }
    for index, row in unrate.iterrows()
]

metadata = {
    "title": "US Unemployment Rate + Sahm Rule",
    "latest": current_unrate,
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED",
    "chart_path": "/charts/unemployment.png",
    "description": "Monthly U.S. unemployment rate with Sahm Rule context.",
    "summary": summary,
    "papers": papers,
    "sahm": current_sahm,
    "status": status,
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"Latest Unemployment: {current_unrate:.2f}%")
print(f"Sahm Rule: {current_sahm:.2f} pp -> {status}")
if not triggers.empty:
    last = triggers.iloc[-1]
    print(f"Last Sahm Trigger: {last.name.strftime('%B %Y')} ({last['Sahm_Rule']:.2f} pp)")
else:
    print("No Sahm triggers in this period")
