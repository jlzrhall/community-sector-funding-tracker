# Community Sector Funding Tracker (Version 2)

A static policy analysis dashboard showing how program funding has changed over time and how it compares with SCHADS-indexed funding. Version 2 covers Financial Wellbeing and Financial Capability programs. All data is placeholder.

## Questions answered
1. How has baseline funding changed over time?
2. How much funding came through indexation?
3. How much came through supplementation?
4. What would funding be if indexed to SCHADS?
5. What is the annual funding gap?
6. What is the cumulative funding gap?

## Pages
Overview, Funding History, Funding Composition, Funding vs SCHADS, Event Register, Methodology.

## Structure
```
index.html         page shell
css/styles.css     styles
js/app.js          loading, calculations, charts
data/funding.csv   Program, Year, Baseline, Indexation, Supplementation, One-Off
data/schads_index.csv  annual SCHADS percentage increases
data/schema.json   data schema
methodology.md     rendered in the Methodology page
```

## Run locally
```
python3 -m http.server 8000
```
Open http://localhost:8000 (browsers block data loading from file://).

## Deploy to GitHub Pages
Push to GitHub, then Settings > Pages > deploy from `main`, folder `/ (root)`.

## Update data
Edit the CSVs following `data/schema.json`. Every year in `funding.csv` needs a row in `schads_index.csv`. The dashboard shows warnings for missing years or negative values.

## Dependencies
Chart.js 4.4.1 via jsDelivr CDN.
