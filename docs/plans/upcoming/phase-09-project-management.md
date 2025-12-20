# Phase 9: Project Management (PACE Gates)

**Status**: 📋 Ready to Start  
**Estimated Duration**: 1-2 weeks

---

## Overview

Add PACE (Phases and Critical Elements) gates to track project milestones and readiness metrics.

---

## Routes

| Route | Description |
|-------|-------------|
| `/projects` | Enhanced with gate indicators |
| `/project/[id]/overview` | NEW - Full gates timeline and metrics |

---

## PACE Gates

The PACE process defines key decision gates throughout the product development lifecycle:

```
[Briefed] → [DTI] → [DA] → [DTX] → [Sprint] → [DTL] → [Mass Prod] → [DTC]
    ✅        ✅      🔵      ⚪        ⚪         ⚪         ⚪          ⚪

Legend: ✅ Passed  🔵 In Progress  ⚪ Not Started  ❌ Failed  ⏭ Skipped
```

| Gate | Full Name | Description |
|------|-----------|-------------|
| Briefed | Project Briefed | Initial project brief approved |
| DTI | Decision to Initiate | Go/no-go for project start |
| DA | Design Approval | Design pens down, drawings complete |
| DTX | Decision to Execute | Approve for production preparation |
| Sprint | Sprint MRD | Test/sprint production run date |
| DTL | Decision to Launch | Final approval for mass production |
| Mass Prod | Mass Production | Full production start date |
| DTC | Decision to Close | Project closure and handover |

---

## Tasks

- [ ] **Extend Project type with gates and metrics interfaces**
- [ ] **Build GatesTimeline component** (horizontal timeline)
- [ ] **Build GateCard component** (individual gate with date picker)
- [ ] **Create MetricsDashboard component** (confidence, risks)
- [ ] **Create projectMetricsService.ts** (calculations)
- [ ] **Create Project Overview page** (`/project/[id]/overview`)
- [ ] **Add gate indicators to projects list page**
- [ ] **Add gate date editing functionality**

---

## Type Definitions

Add to `types/project.ts`:

```typescript
export type GateStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'skipped';

export interface ProjectGate {
  date?: Timestamp;        // Target date for this gate
  status: GateStatus;
  completedAt?: Timestamp; // When gate was passed
  notes?: string;
}

export interface ProjectGates {
  briefed: ProjectGate;
  dti: ProjectGate;
  da: ProjectGate;
  dtx: ProjectGate;
  sprint: ProjectGate;
  dtl: ProjectGate;
  massProduction: ProjectGate;
  dtc: ProjectGate;
}

export interface ProjectMetrics {
  bomConfidence: number;          // 0-100 percentage
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  partsAtRisk: number;            // Parts that won't arrive in time
  partsOnTrack: number;
  sprintReadiness: number;        // 0-100 % ready for sprint
  massProductionReadiness: number; // 0-100 % ready for mass prod
}

// Extend Project interface:
interface Project {
  // ... existing fields ...
  gates?: ProjectGates;
  metrics?: ProjectMetrics;
}
```

---

## Components to Create

### GatesTimeline.tsx
Horizontal timeline showing all 8 gates with their status.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ●───────●───────●───────○───────○───────○───────○───────○             │
│ Briefed  DTI     DA     DTX   Sprint   DTL   Mass Prod  DTC           │
│ Dec 1   Dec 5   Dec 15   -       -       -       -       -            │
│  ✅      ✅      🔵      ⚪      ⚪      ⚪      ⚪      ⚪            │
└────────────────────────────────────────────────────────────────────────┘
```

### GateCard.tsx
Individual gate card with:
- Gate name and description
- Status indicator (icon + color)
- Date picker for target date
- Completed date (if passed)
- Notes field
- Status change buttons

### MetricsDashboard.tsx
Cards showing key project metrics:
- BOM Confidence (% with confirmed pricing)
- Risk Level (based on parts at risk)
- Parts On Track vs At Risk
- Sprint Readiness %
- Mass Production Readiness %

---

## Files to Create/Modify

| Type | Path |
|------|------|
| Modify | `types/project.ts` |
| Create | `components/projects/GatesTimeline.tsx` |
| Create | `components/projects/GateCard.tsx` |
| Create | `components/projects/MetricsDashboard.tsx` |
| Create | `components/projects/RiskIndicator.tsx` |
| Create | `lib/bom/projectMetricsService.ts` |
| Modify | `app/(dashboard)/projects/page.tsx` |
| Create | `app/(dashboard)/project/[projectId]/overview/page.tsx` |
| Modify | `components/layout/ProjectSidebar.tsx` (add Overview link) |

---

## Metrics Calculation

### BOM Confidence
```typescript
bomConfidence = (itemsWithContractPrice + itemsWithQuote) / totalItems * 100
```

### Risk Level
```typescript
const atRiskPercentage = partsAtRisk / totalParts * 100;

if (atRiskPercentage > 20) return 'critical';
if (atRiskPercentage > 10) return 'high';
if (atRiskPercentage > 5) return 'medium';
return 'low';
```

### Readiness
```typescript
sprintReadiness = partsReadyForSprint / totalSprintParts * 100
massProductionReadiness = partsReadyForMassProd / totalMassProdParts * 100
```

---

## Project List Enhancement

Add gate progress indicator to each project card:

```
┌─────────────────────────────────────────┐
│ Project: Mountain Bike 2025             │
│                                         │
│ Gate Progress: ●●●○○○○○  DTX (37%)     │
│ Risk: 🟡 Medium  |  Confidence: 72%     │
│                                         │
│ Next Gate: DTX - Dec 20, 2024           │
└─────────────────────────────────────────┘
```

---

## Navigation Update

Add to Project Sidebar:
```
Project Sidebar:
├── Overview      ← NEW (Phase 9)
├── BOM Explorer
├── Configure
├── New Parts
├── Versions
├── Costs
└── Settings
```

---

## Implementation Order

1. Extend types with gates and metrics
2. Create GateCard component
3. Create GatesTimeline component
4. Create MetricsDashboard component
5. Create projectMetricsService
6. Build Overview page with all components
7. Add gate indicators to project cards
8. Update sidebar navigation

---

## Success Criteria

Phase 9 is complete when:
- [ ] Projects can have PACE gates with dates
- [ ] Gate status can be updated (pass, fail, skip)
- [ ] Project Overview page shows full timeline
- [ ] Metrics dashboard shows BOM confidence and risks
- [ ] Project cards show gate progress indicator
- [ ] Gate dates can be edited with date picker

