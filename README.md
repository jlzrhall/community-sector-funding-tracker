# Community Sector Funding Tracker

A static dashboard comparing community sector program funding with SCHADS-based labour costs.
**Version 1 covers Financial Wellbeing and Financial Capability programs only.**
All data is placeholder sample data.

## Pages
Overview, Funding vs SCHADS, Funding Composition, Methodology.

## Structure
```
index.html        page shell and navigation
css/styles.css    styles
js/app.js         data loading, calculations, charts
data/             CSVs and schema.json
methodology.md    rendered in the Methodology page
```

## Run locally
Browsers block `fetch` on `file://`, so serve the folder:
```
python3 -m http.server 8000
```
Open http://localhost:8000

## Deploy on GitHub Pages
1. Push this folder to a GitHub repository.
2. Settings > Pages > Source: deploy from branch `main`, folder `/ (root)`.
3. Visit `https://<user>.github.io/<repo>/`.

## Update data
Edit the CSVs in `data/` following `data/schema.json`, commit and push. The dashboard shows a warning if funding lines do not sum to total funding.

## Dependencies
Chart.js 4.4.1 loaded from the jsDelivr CDN.

## Roadmap
Multi-year trends, state filters, inflation adjustment, mixed-classification staffing, CSV validation in CI.
