#!/usr/bin/env python3
import os
os.environ["MATPLOTLIB_NO_SECURE_CODING_WARNING"] = "1"

"""
===============================================================================
US TREASURY DEBT | Days until due × dollars outstanding | Dark Mode
===============================================================================
Snapshot of marketable Treasuries still outstanding, from Treasury MSPD
Table III. X-axis is remaining days to maturity. Left Y-axis is face
amount by original term. Right Y-axis is the running total of all those
issues that come due by that remaining-day count.

TIPS and FRNs are omitted so the lines stay nominal coupon terms.
===============================================================================
"""

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

import pandas as pd
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
    fields = "security_class1_desc,security_class2_desc,issue_date,maturity_date,outstanding_amt"
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
    term = classify_term(items[0]["security_class1_desc"], orig_years)
    points.append({
        "cusip": cusip,
        "term": term,
        "days": remain_days,
        "amount": round(amount_mil / 1000.0, 3),  # $B
        "maturity": maturity.date().isoformat(),
        "issue": issue.date().isoformat(),
    })

if not points:
    raise RuntimeError("No outstanding marketable CUSIPs with amounts.")

# Sum CUSIPs that share a term and remaining-day count so the line is one y per x.
grouped = defaultdict(float)
meta_by_key = {}
for point in points:
    key = (point["term"], point["days"])
    grouped[key] += point["amount"]
    meta_by_key[key] = point

observations = []
for (term, days), amount in sorted(grouped.items(), key=lambda item: (TERM_ORDER.index(item[0][0]) if item[0][0] in TERM_ORDER else 99, item[0][1])):
    sample = meta_by_key[(term, days)]
    observations.append({
        "term": term,
        "days": days,
        "amount": round(amount, 3),
        "maturity": sample["maturity"],
        "value": round(amount, 3),
    })

totals = {term: 0.0 for term in TERM_ORDER}
for point in observations:
    if point["term"] in totals:
        totals[point["term"]] += point["amount"]
latest_total = round(sum(totals.values()), 1)
due_1y = round(sum(point["amount"] for point in observations if point["days"] <= 365), 1)

by_day = defaultdict(float)
for point in observations:
    by_day[point["days"]] += point["amount"]
cumulative = []
running = 0.0
for days in sorted(by_day):
    running += by_day[days]
    cumulative.append({"days": days, "amount": round(running, 3)})

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
for term in TERM_ORDER:
    series = sorted(
        [point for point in observations if point["term"] == term],
        key=lambda point: point["days"],
    )
    if not series:
        continue
    ax.plot(
        [point["days"] for point in series],
        [point["amount"] for point in series],
        color=COLORS[term],
        linewidth=1.8,
        marker="o",
        markersize=3.2,
        label=term,
    )

ax2 = ax.twinx()
ax2.plot(
    [point["days"] for point in cumulative],
    [point["amount"] / 1000.0 for point in cumulative],
    color="#f0f0f0",
    linewidth=2.4,
    label="Cumulative",
)
ax2.set_ylabel("Cumulative (trillions of dollars)", color="#f0f0f0")
ax2.tick_params(axis="y", colors="#f0f0f0")
ax2.spines["right"].set_color("#f0f0f0")
ax2.set_ylim(0, (cumulative[-1]["amount"] / 1000.0) * 1.12)
ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0f}T"))

ax.set_title(
    f"US Treasury debt by days remaining\nAs of {as_of}  |  {latest_total/1000:.1f}T marketable  |  {due_1y/1000:.1f}T due within 1 year",
    color="white",
    fontsize=13,
    pad=16,
    fontweight="bold",
)
ax.set_xlabel("Days until due", color="white")
ax.set_ylabel("Outstanding (billions of dollars)", color="white")
ax.set_xlim(left=0)
ax.set_ylim(bottom=0)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0f}B"))
year_ticks = [0, 365, 730, 1826, 3652, 7305, 10957]
year_labels = ["0d", "1Y", "2Y", "5Y", "10Y", "20Y", "30Y"]
visible = [i for i, tick in enumerate(year_ticks) if tick <= max(point["days"] for point in observations) + 30]
ax.set_xticks([year_ticks[i] for i in visible])
ax.set_xticklabels([year_labels[i] for i in visible])
ax.grid(True, alpha=0.3)
h1, l1 = ax.get_legend_handles_labels()
h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc="upper right", framealpha=0.95, ncol=2)
plt.tight_layout()

CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#0a0a0a")
plt.close(fig)

summary = (
    "This is every marketable Treasury still outstanding, lined up by how many days until it comes due. "
    "Each colored line is the original term — a 10-year note with 80 days left sits on the left of the 10Y line; "
    "a 30-year bond issued last year sits far right. Height is the dollar face still out. "
    "TIPS and floating-rate notes are left off. The pile on the left is the near-term refinancing wall. "
    "The white line is the running total: at any day-count, how many dollars come due by then."
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
    "description": "Marketable Treasuries outstanding by remaining days to maturity, split by original term, plus the running total.",
    "summary": summary,
    "papers": papers,
    "totals": {term: round(amount, 1) for term, amount in totals.items() if amount > 0},
    "cumulative": cumulative,
    "observations": observations,
}

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)
    f.write("\n")

print(f"Generated {CHART_PATH.relative_to(ROOT)}")
print(f"Generated {DATA_PATH.relative_to(ROOT)}")
print(f"As of {as_of} | {latest_total}B | due 1y {due_1y}B | points {len(observations)}")
print("totals B", {k: round(v, 0) for k, v in totals.items() if v})
