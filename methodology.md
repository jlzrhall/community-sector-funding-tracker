# Methodology

**Status:** Version 2 draft. All data is placeholder sample data.

## Purpose
This tool analyses how funding for community sector programs has moved over time and compares it with what funding would have been if it had kept pace with SCHADS wage increases. Version 2 covers Financial Wellbeing and Financial Capability programs.

## Data model
Each record is one program in one year, with four funding components:
- **Baseline funding:** recurrent base funding for the year, before that year's additions.
- **Indexation funding:** amount added in the year through indexation.
- **Supplementation funding:** amount added in the year through supplementation.
- **One-off funding:** non-recurrent amounts for the year.

## Calculations
- **Total funding** = baseline + indexation + supplementation + one-off.
- **Actual funding (for comparison)** = baseline + indexation + supplementation. One-off funding is excluded by default because it is not recurrent. A control on the dashboard includes it.
- **SCHADS-indexed funding:** the program's first-year baseline, increased each following year by the SCHADS percentage increase for that year.
- **Annual funding gap** = SCHADS-indexed funding - actual funding. Positive values are a shortfall; negative values mean funding is ahead of SCHADS.
- **Cumulative funding gap** = sum of annual gaps from the first year to each year.
- **Baseline change** = baseline this year - baseline last year.

## Funding event register
Built from the data. Each non-zero indexation, supplementation and one-off amount is an event, and each year-on-year baseline change is recorded as a baseline adjustment.

## Assumptions and limitations
- The SCHADS-indexed line starts from the first year's baseline and assumes funding was adequate in that year.
- A single SCHADS percentage applies to all programs in a year.
- Figures are nominal and not adjusted for inflation or demand.
- The comparison is whole-of-funding, not tied to staffing levels or classifications.
- The SCHADS percentages in this repository are placeholders and must be verified before use.

## Data checks
- Every year in funding.csv must have a row in schads_index.csv.
- All funding components must be zero or greater.

## Change log
- v2.0.0: Rebuilt as a policy analysis tool. Removed FTE and labour-cost benchmarking.
