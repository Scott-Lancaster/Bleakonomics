#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
US TREASURY DEBT | Remaining-life buckets × original term | Dark Mode
===============================================================================
Snapshot of marketable Treasuries still outstanding, from Treasury MSPD
Table III. X-axis is how soon the bond comes due (next 4 quarters, then
2Y / 5Y / 10Y / 20Y / 30Y remaining). Stacked colors are the original
auction term (Bills, 2Y, 10Y, 30Y, ...).

TIPS and FRNs are omitted.
===============================================================================
"""

import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import Request, urlopen

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "us_debt.png"
DATA_PATH = ROOT / "public" / "data" / "us_debt.json"

API = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/mspd/mspd_table_3"

TERM_ORDER = ["Bills", "2Y", "3Y", "5Y", "7Y", "10Y", "20Y", "30Y"]
COLORS = {
    "Bills": "#e07a5f",
    "2Y": "#6f9e78",
    "3Y": "#5b8fc7",
    "5Y": "#c4a35a",
    "7Y": "#9b7ed9",
    "10Y": "#d6d6d6",
    "20Y": "#7fbfcf",
    "30Y": "#e8c36a",
}
KEEP_CLASS = {"Notes", "Bonds", "Bills Maturity Value"}
BUCKETS = [
    {"key": "Q1", "label": "Q1", "days_min": 0, "days_max": 91},
    {"key": "Q2", "label": "Q2", "days_min": 91, "days_max": 182},
    {"key": "Q3", "label": "Q3", "days_min": 182, "days_max": 273},
    {"key": "Q4", "label": "Q4", "days_min": 273, "days_max": 366},
    {"key": "2Y", "label": "2Y", "days_min": 366, "days_max": 730},
    {"key": "5Y", "label": "5Y", "days_min": 730, "days_max": 1826},
    {"key": "10Y", "label": "10Y", "days_min": 1826, "days_max": 3652},
    {"key": "20Y", "label": "20Y", "days_min": 3652, "days_max": 7305},
    {"key": "30Y", "label": "30Y", "days_min": 7305, "days_max": 20000},
]


def remaining_bucket(days):
    for bucket in BUCKETS:
        if bucket["days_min"] <= days < bucket["days_max"]:
            return bucket["key"]
    return BUCKETS[-1]["key"]


def fetch_json(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def to_float(value):
    if value in (None, "null", "*", "", "-"):
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None


def parse_date(value):
    if not value or value == "null":
        return None
    return datetime.strptime(value[:10], "%Y-%m-%d")


def month_year(dt):
    return str(dt.month) + "/" + str(dt.year)[2:]


def range_label(start, end):
    left = month_year(start)
    right = month_year(end)
    if left == right:
        return left
    return left + "–" + right


def pick_rate(items, cls):
    prefer_yield = cls == "Bills Maturity Value"

    def from_row(item):
        yield_pct = to_float(item.get("yield_pct"))
        coupon = to_float(item.get("interest_rate_pct"))
        if prefer_yield:
            return yield_pct if yield_pct is not None else coupon
        return coupon if coupon is not None else yield_pct

    for item in items:
        if to_float(item.get("outstanding_amt")) is not None:
            rate = from_row(item)
            if rate is not None:
                return rate
    for item in items:
        rate = from_row(item)
        if rate is not None:
            return rate
    return None


def classify_term(cls, orig_years):
    if cls == "Bills Maturity Value":
        return "Bills"
    if cls == "Bonds":
        return "20Y" if orig_years < 25 else "30Y"
    targets = [(2, "2Y"), (3, "3Y"), (5, "5Y"), (7, "7Y"), (10, "10Y")]
    return min(targets, key=lambda item: abs(orig_years - item[0]))[1]


try:
    print("Fetching Treasury MSPD Table III...")
    latest_payload = fetch_json(API + "?fields=record_date&sort=-record_date&page[size]=1")
    as_of = latest_payload["data"][0]["record_date"]
    fields = "security_class1_desc,security_class2_desc,issue_date,maturity_date,outstanding_amt,interest_rate_pct,yield_pct"
    url = (
        API
        + f"?filter=record_date:eq:{as_of},security_type_desc:eq:Marketable"
        + f"&fields={fields}&page[size]=10000"
    )
    rows = fetch_json(url)["data"]
    if not rows:
        raise RuntimeError("MSPD Table III returned no rows.")
except Exception as exc:
    print(f"WARNING: Could not fetch data: {exc}")
    if CHART_PATH.exists() and DATA_PATH.exists():
        print("Keeping existing generated chart/data files.")
        raise SystemExit(0)
    raise

as_of_dt = datetime.strptime(as_of, "%Y-%m-%d")
by_cusip = defaultdict(list)
for row in rows:
    cls = row.get("security_class1_desc") or ""
    if cls not in KEEP_CLASS:
        continue
    cusip = row.get("security_class2_desc")
    if not cusip or cusip == "null":
        continue
    by_cusip[cusip].append(row)

points = []
for cusip, items in by_cusip.items():
    issues = [parse_date(item["issue_date"]) for item in items]
    issues = [item for item in issues if item is not None]
    mats = [parse_date(item["maturity_date"]) for item in items]
    mats = [item for item in mats if item is not None]
    amounts = [to_float(item.get("outstanding_amt")) for item in items]
    amounts = [item for item in amounts if item is not None]
    if not issues or not mats or not amounts:
        continue
    issue = min(issues)
    maturity = mats[0]
    amount_mil = max(amounts)
    remain_days = (maturity - as_of_dt).days
    if remain_days < 0 or amount_mil <= 0:
        continue
    orig_years = (maturity - issue).days / 365.25
    cls = items[0]["security_class1_desc"]
    term = classify_term(cls, orig_years)
    points.append({
        "cusip": cusip,
        "term": term,
        "days": remain_days,
        "amount": round(amount_mil / 1000.0, 3),  # $B
        "rate": pick_rate(items, cls),
        "maturity": maturity.date().isoformat(),
        "issue": issue.date().isoformat(),
    })

if not points:
    raise RuntimeError("No outstanding marketable CUSIPs with amounts.")

bucket_terms = {bucket["key"]: {term: 0.0 for term in TERM_ORDER} for bucket in BUCKETS}
bucket_rate_num = {bucket["key"]: {term: 0.0 for term in TERM_ORDER} for bucket in BUCKETS}
bucket_rate_den = {bucket["key"]: {term: 0.0 for term in TERM_ORDER} for bucket in BUCKETS}
bucket_max_days = {bucket["key"]: bucket["days_min"] for bucket in BUCKETS}
totals = {term: 0.0 for term in TERM_ORDER}
for point in points:
    bucket_key = remaining_bucket(point["days"])
    term = point["term"]
    if term not in totals:
        continue
    bucket_terms[bucket_key][term] += point["amount"]
    totals[term] += point["amount"]
    bucket_max_days[bucket_key] = max(bucket_max_days[bucket_key], point["days"])
    if point["rate"] is not None:
        bucket_rate_num[bucket_key][term] += point["rate"] * point["amount"]
        bucket_rate_den[bucket_key][term] += point["amount"]

buckets = []
for bucket in BUCKETS:
    terms = {term: round(bucket_terms[bucket["key"]][term], 3) for term in TERM_ORDER}
    total = round(sum(terms.values()), 3)
    yields = {}
    yield_num = 0.0
    yield_den = 0.0
    for term in TERM_ORDER:
        den = bucket_rate_den[bucket["key"]][term]
        if den > 0:
            yields[term] = round(bucket_rate_num[bucket["key"]][term] / den, 2)
            yield_num += bucket_rate_num[bucket["key"]][term]
            yield_den += den
        else:
            yields[term] = None
    start = as_of_dt + timedelta(days=bucket["days_min"])
    end = as_of_dt + timedelta(days=max(bucket["days_min"], bucket_max_days[bucket["key"]]))
    buckets.append({
        "key": bucket["key"],
        "label": range_label(start, end),
        "days_min": bucket["days_min"],
        "days_max": bucket["days_max"],
        "terms": terms,
        "yields": yields,
        "avg_yield": round(yield_num / yield_den, 2) if yield_den > 0 else None,
        "total": total,
    })

latest_total = round(sum(totals.values()), 1)
due_1y = round(sum(bucket["total"] for bucket in buckets if bucket["key"] in ("Q1", "Q2", "Q3", "Q4")), 1)

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
labels = [bucket["label"] for bucket in buckets]
x = list(range(len(buckets)))
bottoms = [0.0] * len(buckets)
for term in TERM_ORDER:
    values = [bucket["terms"].get(term, 0.0) / 1000.0 for bucket in buckets]
    if not any(values):
        continue
    ax.bar(
        x,
        values,
        bottom=bottoms,
        color=COLORS[term],
        width=0.72,
        label=term,
        linewidth=0,
    )
    bottoms = [bottom + value for bottom, value in zip(bottoms, values)]

for index, total in enumerate(bottoms):
    ax.text(index, total + 0.12, f"{total:.1f}T", ha="center", va="bottom", color="#d4d4d4", fontsize=9)

ax.set_title(
    f"US Treasury Debt\nAs of {as_of}  |  {latest_total/1000:.1f}T Marketable  |  {due_1y/1000:.1f}T Due In 4 Quarters",
    color="white",
    fontsize=13,
    pad=16,
    fontweight="bold",
)
ax.set_xlabel("How Soon It Comes Due", color="white", fontsize=13, fontweight="bold")
ax.set_ylabel("Outstanding (trillions of dollars)", color="white")
ax.set_xticks(x)
ax.set_xticklabels(labels, rotation=28, ha="right", fontsize=13, fontweight="bold")
ax.set_ylim(0, max(bottoms) * 1.18 if bottoms else 1)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0f}T"))
ax.grid(True, axis="y", alpha=0.3)
ax.set_axisbelow(True)
ax.legend(loc="upper right", framealpha=0.95, ncol=2)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

summary = (
    "Each bar is a window of maturity dates. Hover a color to see the average yield on those bonds. "
    "Color is the original auction term — a 30-year bond that is almost due sits in the nearest window. "
    "TIPS and floating-rate notes are left off."
)
papers = [
    {
        "title": "Treasury Fiscal Data: Monthly Statement of the Public Debt",
        "url": "https://fiscaldata.treasury.gov/datasets/monthly-statement-public-debt/",
    },
    {
        "title": "MSPD Table III: Detail of Treasury Securities Outstanding",
        "url": "https://fiscaldata.treasury.gov/datasets/monthly-statement-public-debt/detail-of-treasury-securities-outstanding",
    },
    {
        "title": "TreasuryDirect: Treasury securities",
        "url": "https://www.treasurydirect.gov/marketable-securities/",
    },
]

metadata = {
    "title": "US Treasury Debt",
    "latest": latest_total,
    "due_1y": due_1y,
    "as_of": as_of,
    "updated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "source": "Treasury Fiscal Data MSPD Table III",
    "chart_path": "/charts/us_debt.png",
    "description": "Marketable Treasuries outstanding by remaining life, stacked by original auction term.",
    "summary": summary,
    "papers": papers,
    "totals": {term: round(amount, 1) for term, amount in totals.items() if amount > 0},
    "buckets": buckets,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"As of {as_of} | {latest_total}B | due 4Q {due_1y}B")
print("bucket totals T", {bucket["label"]: round(bucket["total"] / 1000, 2) for bucket in buckets})
print("totals B", {k: round(v, 0) for k, v in totals.items() if v})
