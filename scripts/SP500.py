#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
S&P 500 | Dollar index + priced in gold | Dark Mode
===============================================================================
White line: S&P 500 close in dollars.
Gold line: that same index divided by the dollar price of an ounce of gold
(how many ounces the index is worth).

Daily S&P from Yahoo ^GSPC (1978–), with FRED SP500 overlaid when it is
newer. Gold is monthly LBMA-style prints through 2000, then COMEX GC=F.
200-day moving average is computed on the daily dollar index and stored
for the interactive chart (not drawn on the homepage PNG).

DATA SOURCES
  Yahoo ^GSPC, FRED SP500, GitHub datasets/gold-prices, Yahoo GC=F, FRED USREC
===============================================================================
"""

import json
from io import StringIO
from pathlib import Path
from datetime import datetime
from urllib.request import Request, urlopen

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "sp500.png"
DATA_PATH = ROOT / "public" / "data" / "sp500.json"

START_YEAR = 1978
START = datetime(START_YEAR, 1, 1)
END = datetime.now()
UA = {"User-Agent": "BleakonomicsChartBot/1.0"}


def keep_existing_and_exit(reason):
    print(f"WARNING: {reason}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise RuntimeError(reason)


def fetch_text(url, timeout=25):
    req = Request(url, headers=UA)
    with urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def read_fred(series_id, start, end, timeout=25):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    text = fetch_text(url, timeout=timeout)
    data = pd.read_csv(StringIO(text), parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    col = data.columns[0]
    series = data[col].dropna().astype(float)
    series.index = pd.to_datetime(series.index).tz_localize(None).normalize()
    return series.rename(series_id)


def read_yahoo(ticker, start):
    frame = yf.Ticker(ticker).history(start=start.strftime("%Y-%m-%d"), auto_adjust=True)
    if frame is None or frame.empty or "Close" not in frame.columns:
        return pd.Series(dtype=float, name=ticker)
    index = pd.to_datetime(frame.index)
    if getattr(index, "tz", None) is not None:
        index = index.tz_localize(None)
    series = pd.Series(frame["Close"].astype(float).values, index=index.normalize(), name=ticker)
    return series.dropna()


def read_shiller_monthly():
    url = "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv"
    frame = pd.read_csv(StringIO(fetch_text(url)), parse_dates=["Date"])
    series = frame.set_index("Date")["SP500"].dropna().astype(float)
    series.index = pd.to_datetime(series.index).normalize()
    return series.rename("SP500")


def read_monthly_gold():
    url = "https://raw.githubusercontent.com/datasets/gold-prices/master/data/monthly.csv"
    frame = pd.read_csv(StringIO(fetch_text(url)))
    frame["Date"] = pd.to_datetime(frame["Date"])
    series = frame.set_index("Date")["Price"].dropna().astype(float)
    series.index = pd.to_datetime(series.index).normalize()
    return series.rename("gold")


def recession_spans(rec, last_date):
    recessions = []
    in_recession = False
    rec_start = None
    for date, value in rec.items():
        flag = float(value)
        if flag == 1 and not in_recession:
            in_recession = True
            rec_start = date
        elif flag == 0 and in_recession:
            in_recession = False
            recessions.append({
                "start": rec_start.date().isoformat(),
                "end": date.date().isoformat(),
            })
    if in_recession and rec_start is not None:
        recessions.append({
            "start": rec_start.date().isoformat(),
            "end": pd.Timestamp(last_date).date().isoformat(),
        })
    return recessions


print("Fetching S&P 500 and gold...")

yahoo_spx = pd.Series(dtype=float)
fred_spx = pd.Series(dtype=float)
shiller = pd.Series(dtype=float)
gold_monthly = pd.Series(dtype=float)
gold_futures = pd.Series(dtype=float)
rec = pd.Series(dtype=float)

try:
    yahoo_spx = read_yahoo("^GSPC", START)
    print(f"Yahoo ^GSPC: {len(yahoo_spx)} prints")
except Exception as exc:
    print(f"WARNING: Yahoo ^GSPC failed: {exc}")

try:
    fred_spx = read_fred("SP500", START, END)
    print(f"FRED SP500: {len(fred_spx)} prints")
except Exception as exc:
    print(f"WARNING: FRED SP500 failed: {exc}")

if yahoo_spx.empty and fred_spx.empty:
    try:
        shiller = read_shiller_monthly()
        print(f"Shiller monthly fallback: {len(shiller)} prints")
    except Exception as exc:
        print(f"WARNING: Shiller monthly failed: {exc}")

try:
    gold_monthly = read_monthly_gold()
    print(f"Monthly gold: {len(gold_monthly)} prints")
except Exception as exc:
    print(f"WARNING: Monthly gold failed: {exc}")

try:
    gold_futures = read_yahoo("GC=F", START)
    print(f"Yahoo GC=F: {len(gold_futures)} prints")
except Exception as exc:
    print(f"WARNING: Yahoo GC=F failed: {exc}")

try:
    rec = read_fred("USREC", START, END)
    print(f"FRED USREC: {len(rec)} prints")
except Exception as exc:
    print(f"WARNING: FRED USREC failed: {exc}")

spx = yahoo_spx.copy().rename("spx")
if not fred_spx.empty:
    if spx.empty:
        spx = fred_spx.rename("spx")
    else:
        combined = pd.concat([spx, fred_spx.rename("spx")], axis=1)
        # Prefer FRED on overlap (official close, often one session newer).
        spx = combined.iloc[:, 1].combine_first(combined.iloc[:, 0]).rename("spx")

if spx.empty and not shiller.empty:
    spx = shiller.rename("spx")
    if not fred_spx.empty:
        monthly = spx.loc[spx.index < fred_spx.index.min()]
        spx = pd.concat([monthly, fred_spx.rename("spx")]).sort_index()
        spx = spx[~spx.index.duplicated(keep="last")]

spx = spx.dropna().sort_index()
spx = spx.loc[spx.index >= pd.Timestamp(START)]
spx = spx[~spx.index.duplicated(keep="last")]

if spx.empty:
    keep_existing_and_exit("No S&P 500 observations from Yahoo, FRED, or Shiller.")

gold = pd.Series(dtype=float, name="gold")
if not gold_monthly.empty:
    gold = gold_monthly.copy()
if not gold_futures.empty:
    if gold.empty:
        gold = gold_futures.rename("gold")
    else:
        monthly = gold.loc[gold.index < gold_futures.index.min()]
        gold = pd.concat([monthly, gold_futures.rename("gold")]).sort_index()
gold = gold.dropna().sort_index()
gold = gold.loc[gold.index >= pd.Timestamp(START)]
gold = gold[~gold.index.duplicated(keep="last")]

if gold.empty:
    keep_existing_and_exit("No gold price observations.")

aligned_index = spx.index.union(gold.index).sort_values()
gold_on_spx = gold.reindex(aligned_index).ffill().reindex(spx.index)
frame = pd.DataFrame({"spx": spx, "gold": gold_on_spx}).dropna(subset=["spx"])
frame["gold_oz"] = frame["spx"] / frame["gold"]

deltas = frame.index.to_series().diff().dt.days.dropna()
daily_enough = (not deltas.empty) and float(deltas.median()) <= 5
if daily_enough:
    frame["ma200"] = frame["spx"].rolling(window=200, min_periods=200).mean()
else:
    # Monthly fallback: do not pretend a 200-observation average is a 200-day MA.
    frame["ma200"] = pd.NA
    print("WARNING: S&P series is not daily; 200-day MA omitted.")

latest_spx = float(frame["spx"].iloc[-1])
latest_gold_oz = None if pd.isna(frame["gold_oz"].iloc[-1]) else float(frame["gold_oz"].iloc[-1])
latest_ma = None
ma_tail = frame["ma200"].dropna()
if not ma_tail.empty:
    latest_ma = float(ma_tail.iloc[-1])
latest_gold = None if pd.isna(frame["gold"].iloc[-1]) else float(frame["gold"].iloc[-1])
latest_date = frame.index.max()

recession = rec.dropna() if rec is not None else pd.Series(dtype=float)
recessions = recession_spans(recession, latest_date) if not recession.empty else []

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
        ax.axvspan(rec_start, date, color="#cc4444", alpha=0.25, label=label)
        rec_added = True
if in_rec and rec_start is not None:
    ax.axvspan(rec_start, latest_date, color="#cc4444", alpha=0.25, label="" if rec_added else "Recession")

ax.plot(frame.index, frame["spx"], color="#e5e5e5", linewidth=1.6, label="S&P 500")
ax2 = ax.twinx()
ax2.plot(frame.index, frame["gold_oz"], color="#c4a35a", linewidth=1.8, label="S&P priced in gold")
ax2.set_ylabel("S&P in gold (oz)", color="#c4a35a")
ax2.tick_params(axis="y", colors="#c4a35a")
ax2.spines["right"].set_color("#c4a35a")

gold_title = "—" if latest_gold_oz is None else f"{latest_gold_oz:.2f} oz"
ax.set_title(
    f"S&P 500 ({START_YEAR}–Now)\nLast: {latest_spx:,.2f}  |  In Gold: {gold_title}",
    color="white",
    fontsize=14,
    pad=20,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white", fontsize=13, fontweight="bold")
ax.set_ylabel("Index", color="white")
ax.grid(True, alpha=0.3)
ax.margins(x=0)
ax.set_xlim(pd.Timestamp(START), latest_date)
tick_years = list(range(START_YEAR, latest_date.year + 1, 4))
ax.set_xticks([pd.Timestamp(year, 1, 1) for year in tick_years])
ax.xaxis.set_major_formatter(plt.matplotlib.dates.DateFormatter("%Y"))
ax.tick_params(axis="x", labelrotation=45)
plt.setp(ax.get_xticklabels(), fontsize=13, fontweight="bold")
handles, labels = ax.get_legend_handles_labels()
h2, l2 = ax2.get_legend_handles_labels()
ax.legend(handles + h2, labels + l2, loc="upper left", framealpha=0.95)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

summary = (
    "The white line is the S&P 500 in dollars. The gold line is that same index "
    "divided by the dollar price of an ounce of gold — how many ounces the index "
    "is worth. When the gold line falls, stocks are losing to metal even if the "
    "dollar index is making new highs. On the click-through chart, the 200-day "
    "moving average is the ordinary trailing average of the dollar index. Toggle "
    "the extra lines on and off there."
)

papers = [
    {"title": "FRED: S&P 500 (SP500)", "url": "https://fred.stlouisfed.org/series/SP500"},
    {"title": "Yale / Shiller S&P 500 data", "url": "http://www.econ.yale.edu/~shiller/data.htm"},
    {"title": "World Gold Council: gold prices", "url": "https://www.gold.org/goldhub/data/gold-prices"},
    {
        "title": "Erb and Harvey: The Golden Dilemma",
        "url": "https://www.nber.org/papers/w18706",
    },
]

observations = []
for index, row in frame.iterrows():
    ma_val = row["ma200"]
    gold_val = row["gold"]
    oz_val = row["gold_oz"]
    observations.append({
        "date": index.date().isoformat(),
        "value": round(float(row["spx"]), 2),
        "spx": round(float(row["spx"]), 2),
        "ma200": None if pd.isna(ma_val) else round(float(ma_val), 2),
        "gold": None if pd.isna(gold_val) else round(float(gold_val), 2),
        "gold_oz": None if pd.isna(oz_val) else round(float(oz_val), 4),
    })

source_bits = []
if not yahoo_spx.empty:
    source_bits.append("Yahoo ^GSPC")
if not fred_spx.empty:
    source_bits.append("FRED SP500")
if yahoo_spx.empty and fred_spx.empty and not shiller.empty:
    source_bits.append("Shiller monthly S&P 500")
if not gold_monthly.empty:
    source_bits.append("datasets/gold-prices monthly")
if not gold_futures.empty:
    source_bits.append("Yahoo GC=F")

metadata = {
    "title": "S&P 500",
    "latest": round(latest_spx, 2),
    "latest_gold_oz": None if latest_gold_oz is None else round(latest_gold_oz, 4),
    "latest_ma200": None if latest_ma is None else round(latest_ma, 2),
    "latest_gold": None if latest_gold is None else round(latest_gold, 2),
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": ", ".join(source_bits),
    "chart_path": "/charts/sp500.png",
    "description": "S&P 500 in dollars and the same index priced in ounces of gold.",
    "summary": summary,
    "papers": papers,
    "daily": bool(daily_enough),
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(
    f"Latest SPX {latest_spx:.2f} | gold-priced {gold_title} | "
    f"200-day {latest_ma if latest_ma is None else round(latest_ma, 2)} | "
    f"n={len(observations)} daily={daily_enough}"
)
