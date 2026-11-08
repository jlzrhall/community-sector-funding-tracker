# Methodology

**Status:** Version 1 draft. All data in this repository is placeholder sample data.

## Scope
Version 1 covers Financial Wellbeing and Financial Capability programs only.

## Data sources
- `data/programs.csv`: program-level funding, FTE and staff classification.
- `data/funding_lines.csv`: funding split by cost category.
- `data/schads_rates.csv`: SCHADS benchmark salaries and on-cost rates.

## Calculations
- **Funded labour cost per FTE** = (Salaries + On-costs) / FTE funded.
- **SCHADS benchmark per FTE** = annual full-time salary x (1 + on-cost rate), for the program's classification and financial year.
- **Coverage %** = funded labour cost per FTE / SCHADS benchmark per FTE.
- **Gap per FTE** = benchmark - funded labour cost per FTE. Positive means underfunded against the benchmark.
- **Funding composition** = each category as a share of total funding.

## Assumptions and limitations
- Each program is benchmarked against a single classification; real teams mix levels.
- On-cost rate is a flat assumption.
- Benchmark covers labour only, not operating or overhead costs.
- Funding is compared by financial year without inflation adjustment.
- Sample SCHADS rates are illustrative and must be replaced with published Fair Work rates.

## Data quality checks
- Funding lines must sum to `total_funding` (the dashboard flags mismatches).
- Every `staff_level` must exist in `schads_rates.csv` for that year.

## Change log
- v1.0.0: Initial MVP.
