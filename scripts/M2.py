#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
MAJOR-REGION MONEY SUPPLY | USD trillions + four-region total | Dark Mode
===============================================================================
US M2, euro-area M2, China M2, Japan broad money, all converted to USD.
Left axis: regional levels (lines). Right axis: four-region total in USD.

China monthly FRED ends 2019; later years use World Bank annual broad money,
interpolated. Japan monthly FRED ends 2023-11; later years use World Bank.

Global share uses World Bank world broad money (% of GDP) times world GDP
in USD, compared with this four-region total in the same year. That is an
estimate: definitions are not identical, and the world print lags.
===============================================================================
"""

import json
from pathlib import Path
from datetime import datetime
from io import StringIO
from urllib.request import Request, urlopen

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "m2.png"
DATA_PATH = ROOT / "public" / "data" / "m2.json"

START = datetime(1999, 1, 1)
END = datetime.now()
CHINA_PBOC_MAY_2026_YUAN = 353.67e12  # PBOC print, yuan. Used only after last WB year.


def read_fred(series_id, start, end):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    data = pd.read_csv(url, parse_dates=["observation_date"], na_values=".")
    data = data.rename(columns={"observation_date": "DATE"}).set_index("DATE")
    data = data.loc[(data.index >= pd.Timestamp(start)) & (data.index <= pd.Timestamp(end))]
    col = data.columns[0]
    return data[col].dropna().rename(series_id)


def to_month_start(series):
    series = series.dropna().copy()
    series.index = series.index.to_period("M").to_timestamp()
    return series.groupby(level=0).last().sort_index()


def read_ecb_m2():
    url = (
        "https://data-api.ecb.europa.eu/service/data/BSI/"
        "M.U2.Y.V.M20.X.1.U2.2300.Z01.E?format=csvdata"
    )
    req = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/csv"})
    with urlopen(req, timeout=60) as resp:
        text = resp.read().decode("utf-8")
    df = pd.read_csv(StringIO(text))
    df["DATE"] = pd.to_datetime(df["TIME_PERIOD"].astype(str) + "-01")
    s = pd.to_numeric(df["OBS_VALUE"], errors="coerce")
    s.index = df["DATE"]
    return s.dropna().sort_index()


def read_world_bank_annual(iso3, indicator):
    url = (
        "https://api.worldbank.org/v2/country/"
        + iso3
        + "/indicator/"
        + indicator
        + "?format=json&per_page=200"
    )
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    rows = payload[1] if len(payload) > 1 else []
    points = {}
    for row in rows:
        if row.get("value") is None:
            continue
        points[int(row["date"])] = float(row["value"])
    return points


def read_world_bank_lcu(iso3):
    url = (
        "https://api.worldbank.org/v2/country/"
        + iso3
        + "/indicator/FM.LBL.BMNY.CN?format=json&per_page=200"
    )
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    rows = payload[1] if len(payload) > 1 else []
    points = []
    for row in rows:
        if row.get("value") is None:
            continue
        points.append((pd.Timestamp(int(row["date"]), 12, 1), float(row["value"])))
    if not points:
        return pd.Series(dtype=float)
    series = pd.Series({d: v for d, v in points}).sort_index()
    return series


def extend_with_annual(monthly_lcu, annual_lcu, extra_points=None):
    """Keep monthly prints, then interpolate annual (and optional extra) LCU levels."""
    out = monthly_lcu.copy().sort_index()
    anchors = annual_lcu.copy()
    if extra_points:
        for date, value in extra_points:
            anchors.loc[pd.Timestamp(date)] = value
    anchors = anchors.sort_index()
    if out.empty:
        monthly_index = pd.date_range(anchors.index.min(), anchors.index.max(), freq="MS")
        return anchors.reindex(anchors.index.union(monthly_index)).interpolate().resample("MS").last()
    last_monthly = out.index.max()
    future = anchors[anchors.index > last_monthly]
    if future.empty:
        return out
    bridge = pd.concat([out.iloc[[-1]], future]).sort_index()
    monthly_index = pd.date_range(bridge.index.min(), bridge.index.max(), freq="MS")
    filled = bridge.reindex(bridge.index.union(monthly_index)).interpolate(method="time")
    filled = filled.resample("MS").last()
    filled = filled[filled.index > last_monthly]
    return pd.concat([out, filled]).sort_index()


try:
    print("Fetching money-supply series...")
    us = to_month_start(read_fred("M2SL", START, END))  # billions USD
    china_m = to_month_start(read_fred("MYAGM2CNM189N", START, END))  # yuan
    japan_m = to_month_start(read_fred("MABMM301JPM189S", START, END))  # yen
    euro_m = to_month_start(read_ecb_m2())  # millions EUR
    rec = to_month_start(read_fred("USREC", START, END))
    usd_eur = to_month_start(read_fred("DEXUSEU", START, END))
    cny_usd = to_month_start(read_fred("DEXCHUS", START, END))
    jpy_usd = to_month_start(read_fred("DEXJPUS", START, END))
    wb_china = read_world_bank_lcu("CHN")
    wb_japan = read_world_bank_lcu("JPN")
except Exception as exc:
    print(f"WARNING: Could not fetch data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

wb_m2gdp = {}
wb_gdp = {}
try:
    wb_m2gdp = read_world_bank_annual("WLD", "FM.LBL.BMNY.GD.ZS")
    wb_gdp = read_world_bank_annual("WLD", "NY.GDP.MKTP.CD")
except Exception as exc:
    print(f"WARNING: World Bank global aggregate unavailable: {exc}")

china_m = extend_with_annual(
    china_m,
    wb_china,
    extra_points=[(datetime(2026, 5, 1), CHINA_PBOC_MAY_2026_YUAN)],
)
japan_m = extend_with_annual(japan_m, wb_japan)

us_t = (us / 1000.0).rename("us")  # billions -> trillions
ea_t = (euro_m * usd_eur / 1_000_000.0).rename("europe")  # millions EUR * USD/EUR -> trillions USD
cn_t = (china_m / cny_usd / 1e12).rename("china")  # yuan / (CNY per USD) -> trillions USD
jp_t = (japan_m / jpy_usd / 1e12).rename("japan")

frame = pd.concat([us_t, ea_t, cn_t, jp_t], axis=1)
frame = frame.loc[frame.index >= pd.Timestamp(START)]
frame = frame.sort_index().ffill()
frame = frame.dropna(how="all")
frame["total"] = frame[["us", "europe", "china", "japan"]].sum(axis=1, min_count=1)
frame["yoy"] = frame["total"].pct_change(12) * 100
frame = frame.dropna(subset=["total"])

if frame.empty:
    raise RuntimeError("No overlapping regional money-supply observations.")

latest = frame.iloc[-1]
latest_total = float(latest["total"])
latest_yoy = None if pd.isna(latest["yoy"]) else round(float(latest["yoy"]), 1)
shares = {}
for key in ("us", "europe", "china", "japan"):
    val = latest[key]
    shares[key] = None if pd.isna(val) or latest_total == 0 else round(float(val) / latest_total * 100, 1)

global_share = None
global_year = None
global_m2_t = None
four_at_global_year = None
overlap_years = sorted(set(wb_m2gdp) & set(wb_gdp))
for year in reversed(overlap_years):
    year_rows = frame[frame.index.year == year]
    if year_rows.empty:
        continue
    four = float(year_rows["total"].iloc[-1])
    glob = wb_gdp[year] * wb_m2gdp[year] / 100.0 / 1e12
    if glob <= 0 or four <= 0:
        continue
    global_year = year
    global_m2_t = round(glob, 1)
    four_at_global_year = round(four, 1)
    global_share = round(four / glob * 100, 1)
    break

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

colors = {
    "japan": "#6f9e78",
    "europe": "#5b8fc7",
    "us": "#d6d6d6",
    "china": "#c4a35a",
}

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

ax.plot(frame.index, frame["japan"], color=colors["japan"], linewidth=2.4, label="Japan")
ax.plot(frame.index, frame["europe"], color=colors["europe"], linewidth=2.4, label="Europe")
ax.plot(frame.index, frame["us"], color=colors["us"], linewidth=2.4, label="United States")
ax.plot(frame.index, frame["china"], color=colors["china"], linewidth=2.4, label="China")

ax2 = ax.twinx()
ax2.plot(frame.index, frame["total"], color="#e07a5f", linewidth=2.4, label="Total")
ax2.set_ylabel("Four-region total ($T)", color="#e07a5f")
ax2.tick_params(axis="y", colors="#e07a5f")
ax2.spines["right"].set_color("#e07a5f")
ax2.set_ylim(0, float(frame["total"].max()) * 1.12)
ax.set_ylim(0, float(frame[["japan", "europe", "us", "china"]].max().max()) * 1.12)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"${v:.0f}T"))
ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"${v:.0f}T"))

global_txt = (
    f"  |  ≈{global_share:.0f}% of global money supply ({global_year})"
    if global_share is not None and global_year is not None
    else ""
)
ax.set_title(
    f"Major-region money supply in USD\nLast total: ${latest_total:.1f}T"
    + global_txt,
    color="white",
    fontsize=13,
    pad=16,
    fontweight="bold",
)
ax.set_xlabel("Year", color="white")
ax.set_ylabel("Trillions of dollars", color="white")
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

if global_share is not None and global_year is not None:
    global_sentence = (
        f"In {global_year}, these four were about {global_share:.0f}% of World Bank global broad money "
        f"(${four_at_global_year:.0f}T of ${global_m2_t:.0f}T). "
        "UK, India, and the rest of EM make up most of the remainder. "
    )
else:
    global_sentence = (
        "These four regions are a large share of global M2 — UK, India, and the rest of EM are not in the lines. "
    )

summary = (
    "This is US, euro-area, Chinese, and Japanese money, all converted into dollars. "
    "Each colored line is one region; the orange line is the four-region total. "
    + global_sentence
    + f"Of this basket, China is about {shares['china']}%, the US {shares['us']}%, Europe {shares['europe']}%, Japan {shares['japan']}%. "
    "China after 2019 and Japan after late 2023 use World Bank annual figures (plus a PBOC May 2026 China print), so the last few years are less precise. "
    "FX moves the dollar lines even when local money is unchanged."
)

papers = [
    {"title": "Fed H.6 Money Stock Measures (US M2)", "url": "https://www.federalreserve.gov/releases/h6/current/default.htm"},
    {"title": "ECB Statistical Data Warehouse: euro-area M2", "url": "https://data.ecb.europa.eu/data/datasets/BSI"},
    {"title": "FRED: Broad money for Japan", "url": "https://fred.stlouisfed.org/series/MABMM301JPM189S"},
    {"title": "FRED: M2 for China", "url": "https://fred.stlouisfed.org/series/MYAGM2CNM189N"},
    {"title": "World Bank: Broad money (current LCU)", "url": "https://data.worldbank.org/indicator/FM.LBL.BMNY.CN"},
    {"title": "World Bank: Broad money (% of GDP)", "url": "https://data.worldbank.org/indicator/FM.LBL.BMNY.GD.ZS"},
    {"title": "World Bank: GDP (current US$)", "url": "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"},
]

observations = []
for index, row in frame.iterrows():
    observations.append({
        "date": index.date().isoformat(),
        "us": None if pd.isna(row["us"]) else round(float(row["us"]), 3),
        "europe": None if pd.isna(row["europe"]) else round(float(row["europe"]), 3),
        "china": None if pd.isna(row["china"]) else round(float(row["china"]), 3),
        "japan": None if pd.isna(row["japan"]) else round(float(row["japan"]), 3),
        "total": round(float(row["total"]), 3),
        "yoy": None if pd.isna(row["yoy"]) else round(float(row["yoy"]), 2),
        "value": round(float(row["total"]), 3),
    })

metadata = {
    "title": "Major-region money supply (USD)",
    "latest": round(latest_total, 2),
    "latest_yoy": latest_yoy,
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "FRED M2SL, ECB M2, FRED/World Bank China and Japan, FRED FX",
    "chart_path": "/charts/m2.png",
    "description": "US, euro-area, China, and Japan money supply converted to trillions of USD, plus the four-region total.",
    "summary": summary,
    "papers": papers,
    "shares": shares,
    "global_share_pct": global_share,
    "global_year": global_year,
    "global_m2_t": global_m2_t,
    "four_region_at_global_year": four_at_global_year,
    "basket_note": (
        f"Four-region total is about {global_share:.0f}% of World Bank global broad money ({global_year}). Omitted: UK, India, Korea, and other EM."
        if global_share is not None and global_year is not None
        else "Four-region total is a lower bound on global M2. Omitted: UK, India, Korea, and other EM."
    ),
    "observations": observations,
    "recessions": recessions,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(
    f"Total ${latest_total:.2f}T | YoY {latest_yoy} | shares US {shares['us']} China {shares['china']} EA {shares['europe']} JP {shares['japan']}"
    + (f" | global {global_share}% of ${global_m2_t}T ({global_year})" if global_share is not None else "")
)
