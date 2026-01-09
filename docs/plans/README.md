# BOM Wizard - Project Plans

> **Last Updated**: January 9, 2026  
> **Current Phase**: Phase 14 - Draft PBoM, Excel-Like Table & Collaboration (NEXT)

---

## Project Status Dashboard

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 1 | Foundation | Completed | Dec 2024 | Dec 2024 |
| 2 | Import System | Completed | Dec 2024 | Dec 2024 |
| 3 | BOM Explorer | Completed | Dec 2024 | Dec 2024 |
| 3.7 | Batch Item Entry | Completed | Dec 2024 | Dec 2024 |
| 4 | BOM Control Panel | Completed | Dec 2024 | Dec 2024 |
| 5 | Version Control | Completed | Dec 2024 | Dec 2024 |
| 6 | Cost Analysis | Completed | Dec 2024 | Dec 2024 |
| 7 | New Part Tracker | Completed | Dec 2024 | Dec 2024 |
| 8 | Polish & Launch | Completed | Dec 2024 | Dec 2024 |
| 9.5 | Merge Parts Timeline | Completed | Dec 2024 | Dec 2024 |
| 10.1 | New Parts & BOM Integration | Completed | Dec 2024 | Dec 2024 |
| 10.15 | Project Management (PACE Gates) | Completed | Dec 2024 | Dec 2024 |
| 10.5 | New Parts PPL (Timeline & Upgrade) | Completed | Dec 2024 | Dec 2024 |
| **14** | **Draft PBoM, Excel-Like Table & Collaboration** | **NEXT** | - | - |
| 15 | Spec Management System | Future | - | - |
| 12 | AI Integration | Future | - | - |
| 13 | Final Polish & Deploy | Planned | - | - |

---

## Plan Files Index

### Completed Phases
| File | Description |
|------|-------------|
| [phase-01-foundation.md](./completed/phase-01-foundation.md) | Project setup, Firebase, auth, navigation |
| [phase-02-import-system.md](./completed/phase-02-import-system.md) | CSV import, templates, column mapping |
| [phase-03-bom-explorer.md](./completed/phase-03-bom-explorer.md) | Tree/table views, filtering, editing |
| [phase-03.7-batch-entry.md](./completed/phase-03.7-batch-entry.md) | Batch add items dialog |
| [phase-04-bom-control-panel.md](./completed/phase-04-bom-control-panel.md) | Template to Working BOM transfer |
| [phase-05-version-control.md](./completed/phase-05-version-control.md) | Versioning, comparison, cost drivers |
| [phase-06-cost-analysis.md](./completed/phase-06-cost-analysis.md) | Charts, metrics, Pareto analysis |
| [phase-07-new-part-tracker.md](./completed/phase-07-new-part-tracker.md) | Kanban board, part lifecycle |
| [phase-08-polish-launch.md](./completed/phase-08-polish-launch.md) | Error handling, loading states, security |
| [phase-9.5-merge-timeline.md](./completed/phase-9.5-merge-timeline.md) | Merged Parts Timeline into New Parts page |
| [phase-10.1-new-parts-bom-integration.md](./completed/phase-10.1-new-parts-bom-integration.md) | BOM to New Parts sync, order data on parts |
| [phase-10.15-project-management.md](./completed/phase-10.15-project-management.md) | PACE gates, metrics dashboard, project overview |
| [phase-10.5-new-parts-ppl.md](./completed/phase-10.5-new-parts-ppl.md) | Timeline & New Parts Page Upgrade, PPL replacement |

### Upcoming Phases
| File | Description |
|------|-------------|
| [phase-14-draft-pbom.md](./upcoming/phase-14-draft-pbom.md) | Excel-like table, inline editing, comments, activity feed |
| [phase-15-spec-management.md](./upcoming/phase-15-spec-management.md) | Spec as hub, learning system, group mapping |
| [phase-12-ai-integration.md](./upcoming/phase-12-ai-integration.md) | Gemini AI assistant |
| [phase-13-final-polish.md](./upcoming/phase-13-final-polish.md) | Final testing, deployment |

---

## Phase 14 Summary (Current)

**Draft PBoM, Excel-Like Table & Collaboration** introduces:

1. **All 29 CCM Columns** - Full column support with visibility controls
2. **Excel-Like Editing** - Inline cell editing with Tab/Enter navigation
3. **Override Tracking** - Track when values differ from master data
4. **Cell-Level History** - Granular change tracking per field
5. **Cell Comments** - @mention teammates, create tasks
6. **Activity Feed** - Notifications bell, /activity page
7. **Column Settings** - Org → Project → User visibility hierarchy

Sub-phases:
- 14A: Foundation (types, settings, toggle chips)
- 14B: Excel-Like Table (inline editing, overrides)
- 14C: Change Tracking (history, logging)
- 14D: Comments & Tasks
- 14E: Activity System
- 14F: Admin Settings & Polish

---

## Update Log

| Date | Update | Phase |
|------|--------|-------|
| Jan 9, 2026 | Added Phase 14 - Draft PBoM, Excel-Like Table & Collaboration | 14 |
| Jan 9, 2026 | Moved Spec Management to Phase 15 | 15 |
| Dec 22, 2024 | Completed Phase 10.5 - Timeline & New Parts Page Upgrade | 10.5 |
| Dec 21, 2024 | Added Project Overview page with PACE gates | 10.15 |
| Dec 21, 2024 | Cleaned up Gantt chart for rebuild | 10.5 |
| Dec 20, 2024 | Organized all plans into docs/plans folder | - |
| Dec 20, 2024 | Completed Phase 10.1 - New Parts & BOM Integration | 10.1 |
| Dec 20, 2024 | Completed Phase 9.5 - Merge Parts Timeline | 9.5 |
| Dec 20, 2024 | Completed Phase 8 - Polish & Launch | 8 |
| Dec 20, 2024 | Completed Phase 7 - New Part Tracker | 7 |
| Dec 2024 | Phases 1-6 completed | 1-6 |

---

## Quick Links

- **Start Next Phase**: [Phase 14 - Draft PBoM](./upcoming/phase-14-draft-pbom.md)
- **Spec Management**: [Phase 15 - Spec Management](./upcoming/phase-15-spec-management.md)
- **AI Integration Plan**: [Phase 12 - AI Integration](./upcoming/phase-12-ai-integration.md)
- **Final Polish Plan**: [Phase 13 - Final Polish & Deploy](./upcoming/phase-13-final-polish.md)

---

## How to Use These Plans

1. **Starting a new phase**: Read the phase plan file for requirements and tasks
2. **During development**: Check off tasks as you complete them
3. **Finishing a phase**: Move the file from `upcoming/` to `completed/` and update this README
4. **Tracking progress**: Update the status dashboard and update log above

---

## Project Overview

BOM Wizard is a Bill of Materials management system that helps manufacturers:

- **Import** BOM data from Infor and other ERP systems
- **Configure** product variants by selecting assembly groups
- **Cost** items using vendor contract prices with landing rates
- **Track** new parts through design, engineering, and procurement
- **Version** BOMs to track cost changes over time
- **Analyze** costs with interactive charts and insights
- **Manage** projects with PACE gates and timelines
- **Edit** BOMs with Excel-like inline editing (Phase 14)
- **Collaborate** with cell comments and activity feed (Phase 14)
- **Spec** products using spec sheets with learning system (Phase 15)
- **AI-Assist** users with intelligent suggestions (Phase 12)

---

## Current File Structure

```
docs/plans/
├── README.md                          # This file
├── completed/
│   ├── phase-01-foundation.md
│   ├── phase-02-import-system.md
│   ├── phase-03-bom-explorer.md
│   ├── phase-03.7-batch-entry.md
│   ├── phase-04-bom-control-panel.md
│   ├── phase-05-version-control.md
│   ├── phase-06-cost-analysis.md
│   ├── phase-07-new-part-tracker.md
│   ├── phase-08-polish-launch.md
│   ├── phase-9.5-merge-timeline.md
│   ├── phase-10.1-new-parts-bom-integration.md
│   ├── phase-10.15-project-management.md
│   └── phase-10.5-new-parts-ppl.md
└── upcoming/
    ├── phase-14-draft-pbom.md
    ├── phase-15-spec-management.md
    ├── phase-12-ai-integration.md
    └── phase-13-final-polish.md
```
