# Phase 6: Cost Analysis

**Status**: ✅ Complete  
**Completed**: December 2024

---

## Overview

Interactive cost analysis dashboard with charts, metrics, and Pareto analysis.

---

## What Was Built

### Components
- [x] `CostSummaryCards.tsx` - Key metrics at a glance
- [x] `CostTrendChart.tsx` - Cost evolution over versions
- [x] `CostByAssemblyChart.tsx` - Donut/Treemap breakdown
- [x] `CostDriversChart.tsx` - Why costs changed
- [x] `PriceVolatilityChart.tsx` - Items with price swings
- [x] `TopItemsTable.tsx` - Pareto analysis (80/20)
- [x] `DeltaIndicator.tsx` - Change indicators

### Services
- [x] `costAnalysisService.ts` - Analysis calculations

### Hooks
- [x] `useCostAnalysis.ts` - Cost data hook

---

## Dashboard Tabs

| Tab | Content |
|-----|---------|
| Overview | Trend + Assembly + Drivers charts |
| Trends | Full trend chart + Volatility |
| Assemblies | Assembly breakdown + table |
| Cost Drivers | Drivers chart + explanations |
| Top Items | Pareto table |

---

## Key Metrics

### Summary Cards
| Metric | Description |
|--------|-------------|
| Total Cost | Sum of all extended costs |
| Material Cost | Raw material costs |
| Landing Cost | Freight and import costs |
| Labour Cost | Manufacturing labour |
| Avg Item Cost | Total / item count |

### Confidence Metrics
| Metric | Formula |
|--------|---------|
| Price Confidence | (Contract + Quote) / Total × 100 |
| Placeholder Risk | Placeholder Cost / Total Cost × 100 |
| Pareto (80%) | Top N items = 80% of cost |

---

## Charts

### Cost Trend Chart
```
£60k ─┤                              ●───●
      │                         ●────┘
£50k ─┤                    ●────┘
      │               ●────┘
£40k ─┤          ●────┘
      │     ●────┘
£30k ─┤●────┘
      └─────┬─────┬─────┬─────┬─────┬─────→
           v1    v2    v3    v4    v5    v6
```

### Assembly Breakdown (Donut)
```
        ┌──────────┐
       ╱   Frame    ╲
      │    35%      │
      │  ┌─────┐    │
      │  │Other│    │
      │  │ 15% │    │
       ╲ └─────┘   ╱
        │ Gear  │
        │  25%  │
        └──────┘
         Seat 25%
```

### Price Volatility
- Items with highest price variance over time
- Standard deviation indicator
- Min/max price range

---

## Pareto Analysis

The 80/20 rule applied to BOM costs:

```
Top Items by Extended Cost:
┌────────────────────────────────────────────────────┐
│ Item          │ Cost    │ Cumulative % │ Bar      │
├───────────────┼─────────┼──────────────┼──────────┤
│ B103985       │ £8,500  │ 18.8%        │ ████████ │
│ B104001       │ £6,200  │ 32.5%        │ ██████   │
│ B105023       │ £4,800  │ 43.1%        │ █████    │
│ B106789       │ £3,100  │ 50.0%        │ ███      │
│ ...           │         │              │          │
│ Top 12 items  │         │ 80.0%        │          │
└────────────────────────────────────────────────────┘
```

---

## Files Created

```
components/charts/
├── CostSummaryCards.tsx
├── CostTrendChart.tsx
├── CostByAssemblyChart.tsx
├── CostDriversChart.tsx
├── PriceVolatilityChart.tsx
├── TopItemsTable.tsx
├── DeltaIndicator.tsx
├── CostBreakdown.tsx
└── TrendChart.tsx

lib/bom/
└── costAnalysisService.ts

lib/hooks/
└── useCostAnalysis.ts

app/(dashboard)/project/[projectId]/costs/
└── page.tsx
```

---

## Key Features

### Interactive Charts
- Recharts library
- Tooltips with details
- Click to drill down
- Export as image

### Comparison Mode
- Compare costs between versions
- Show delta (absolute and %)
- Highlight increases/decreases

### Export
- Export data to CSV
- Print-friendly reports
- Share analysis link



