# Macro Dashboard

A modern self-updating financial and macro dashboard built with Next.js, Tailwind CSS, Python chart scripts, GitHub Actions, and Vercel.

## Stack

- Next.js, React, TypeScript, and Tailwind CSS for the website
- Python, pandas, matplotlib, pandas_datareader, and yfinance for chart generation
- GitHub Actions for daily chart updates
- Vercel for hosting

## Local Website

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Generate Charts Locally

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/yield_curve.py
```

The script writes:

- `public/charts/yield_curve.png`
- `public/data/yield_curve.json`

## Automation

`.github/workflows/update-charts.yml` runs daily at `22:30 UTC`, installs Python dependencies, regenerates charts, and commits updated files when there are changes.

Vercel will redeploy when GitHub receives the generated chart commit.

## Build Order

1. Confirm the homepage renders locally.
2. Generate the first chart locally.
3. Push to GitHub.
4. Deploy the repo on Vercel.
5. Confirm the GitHub Action can run manually.
6. Add more chart scripts one at a time.
