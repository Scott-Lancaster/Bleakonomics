#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
CREDIT CARD DEBT | Nominal + M2-adjusted | Dark Mode
===============================================================================
CCLACBW027SBOG: Consumer loans, credit cards and other revolving plans,
all commercial banks. Weekly, billions of dollars, seasonally adjusted.

Left axis: actual balances.
Right axis: balances held against the first overlapping M2 print
(debt_t * M2_0 / M2_t). If money supply and card debt rise at the same
pace, the orange line is flat.
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
CHART_PATH = ROOT / "public" / "charts" / "credit_cards.png"
DATA_PATH = ROOT / "public" / "data" / "credit_cards.json"

START = datetime(2000, 1, 1)
END = datetime.now()


def read_fred(series_id, start, end):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    data = pd.read_csv(url, parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    col = data.columns[0]
    return data[col].dropna().rename(series_id)


try:
    print("Fetching credit-card and M2 series...")
    cards = read_fred("CCLACBW027SBOG", START, END)
    m2 = read_fred("M2SL", START, END)
    rec = read_fred("USREC", START, END)
    if cards.empty or m2.empty:
        raise RuntimeError("FRED returned empty credit-card or M2 data.")
except Exception as exc:
    print(f"WARNING: Could not fetch data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

m2_on_cards = (
    m2.reindex(m2.index.union(cards.index))
    .sort_index()
    .interpolate(method="time")
    .reindex(cards.index)
)
frame = pd.DataFrame({"nominal": cards, "m2": m2_on_cards}).dropna()
if frame.empty:
    raise RuntimeError("No overlapping credit-card and M2 observations.")

base_m2 = float(frame["m2"].iloc[0])
base_date = frame.index[0].date().isoformat()
frame["adjusted"] = frame["nominal"] * (base_m2 / frame["m2"])

latest = frame.iloc[-1]
latest_nominal = float(latest["nominal"])
latest_adjusted = float(latest["adjusted"])

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

ax.plot(frame.index, frame["nominal"], color="#d6d6d6", linewidth=2.4, label="Credit card debt")
ax2 = ax.twinx()
ax2.plot(frame.index, frame["adjusted"], color="#e07a5f", linewidth=2.4, label="M2-adjusted")
ax2.set_ylabel("M2-adjusted ($B)", color="#e07a5f")
ax2.tick_params(axis="y", colors="#e07a5f")
ax2.spines["right"].set_color("#e07a5f")
ax.set_ylim(0, float(frame["nominal"].max()) * 1.12)
ax2.set_ylim(0, float(frame["adjusted"].max()) * 1.12)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"${v:.0f}B"))
ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"${v:.0f}B"))

ax.set_title(
    f"Credit card debt\nLast: {latest_nominal:,.0f}B  |  M2-adjusted: {latest_adjusted:,.0f}B",
    color="white",
    fontsize=13,
    pad=16,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white")
ax.set_ylabel("Credit card debt ($B)", color="white")
ax.grid(True, alpha=0.3)
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(plt.matplotlib.dates.YearLocator(2))
plt.xticks(rotation=45)
ax.margins(x=0)
ax.set_xlim(frame.index.min(), frame.index.max())
h1, l1 = ax.get_legend_handles_labels()
h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc="upper left", framealpha=0.95)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

summary = (
    "This is what households owe on bank credit cards and other revolving plans. "
    "The white line is the actual dollar pile. The orange line holds that pile still "
    f"against M2 growth, using {base_date} as the starting money-supply level. "
    "If card balances and the money supply grow at the same speed, orange stays flat. "
    "The 2010 jump is mostly accounting — banks brought card loans back onto the balance sheet — not a sudden borrowing binge."
)

papers = [
    {"title": "FRED: Consumer Loans, Credit Cards (CCLACBW027SBOG)", "url": "https://fred.stlouisfed.org/series/CCLACBW027SBOG"},
    {"title": "Fed H.8 Assets and Liabilities of Commercial Banks", "url": "https://www.federalreserve.gov/releases/h8/"},
    {"title": "Fed G.19 Consumer Credit", "url": "https://www.federalreserve.gov/releases/g19/current/"},
    {"title": "FRED: M2 (M2SL)", "url": "https://fred.stlouisfed.org/series/M2SL"},
]

observations = []
for index, row in frame.iterrows():
    observations.append({
        "date": index.date().isoformat(),
        "value": round(float(row["nominal"]), 3),
        "nominal": round(float(row["nominal"]), 3),
        "adjusted": round(float(row["adjusted"]), 3),
        "m2": round(float(row["m2"]), 1),
    })

metadata = {
    "title": "Credit Card Debt",
    "latest": round(latest_nominal, 2),
    "latest_adjusted": round(latest_adjusted, 2),
    "base_m2": round(base_m2, 1),
    "base_date": base_date,
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED CCLACBW027SBOG, M2SL",
    "chart_path": "/charts/credit_cards.png",
    "description": "Bank credit-card balances, plus the same balances held against M2 growth.",
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
print(f"Nominal ${latest_nominal:.1f}B | M2-adjusted ${latest_adjusted:.1f}B | base M2 {base_m2:.1f} on {base_date}")
