from datetime import datetime, timedelta
import json
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from pandas_datareader import data as web


ROOT = Path(__file__).resolve().parents[1]
CHART_PATH = ROOT / "public" / "charts" / "yield_curve.png"
DATA_PATH = ROOT / "public" / "data" / "yield_curve.json"


def fetch_yield_spread() -> pd.Series:
    print("Fetching FRED data...")
    end = datetime.utcnow()
    start = end - timedelta(days=365 * 10)
    data = web.DataReader(["DGS10", "DGS2"], "fred", start, end)
    spread = (data["DGS10"] - data["DGS2"]).dropna()
    spread.name = "10Y - 2Y Treasury Yield Spread"
    return spread


def save_chart(spread: pd.Series) -> None:
    CHART_PATH.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(12, 7), facecolor="#050505")
    ax.set_facecolor("#050505")
    ax.plot(spread.index, spread.values, color="#22c55e", linewidth=2.2)
    ax.axhline(0, color="#ef4444", linewidth=1.1, alpha=0.75)
    ax.set_title("10Y - 2Y Treasury Yield Spread", color="white", fontsize=18, pad=18)
    ax.set_ylabel("Percentage points", color="#a3a3a3")
    ax.tick_params(colors="#a3a3a3")
    ax.grid(True, color="#262626", linewidth=0.8)

    for spine in ax.spines.values():
        spine.set_color("#262626")

    plt.savefig(CHART_PATH, dpi=300, bbox_inches="tight", facecolor="#050505")
    plt.close(fig)
    print(f"Generated {CHART_PATH.relative_to(ROOT)}")


def save_metadata(spread: pd.Series) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    latest = float(spread.iloc[-1])
    metadata = {
        "title": "10Y - 2Y Treasury Yield Spread",
        "latest": latest,
        "updated_at": datetime.utcnow().isoformat(),
        "source": "FRED",
        "description": "Tracks the spread between 10-year and 2-year U.S. Treasury yields.",
    }

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        f.write("\n")

    print(f"Generated {DATA_PATH.relative_to(ROOT)}")
    print(f"Latest: {latest:.2f}%")


def main() -> None:
    spread = fetch_yield_spread()
    if spread.empty:
        raise RuntimeError("No FRED data returned for yield spread.")

    save_chart(spread)
    save_metadata(spread)
    print("Done.")


if __name__ == "__main__":
    main()
