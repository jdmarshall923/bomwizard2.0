# BOM Wizard

Modern BOM (Bill of Materials) cost control and version management system built with Next.js 16, Firebase, and TypeScript.

## 📊 Current Status

| Phase | Status |
|-------|--------|
| Phase 1-8 | ✅ Complete |
| **Phase 9: Project Management** | 📋 **Next** |
| Phase 10: Parts Order Timeline | 📋 Planned |
| Phase 11: Final Polish & Deploy | 📋 Planned |
| Phase 12: AI Integration | 📋 Future |

**📄 See [docs/plans/](./docs/plans/) for complete phase documentation and tracking.**

---

## Features

- **Import Wizard** - Import CSV data from Infor with saved templates
- **BOM Explorer** - View/edit BOM with hierarchical tree and table views
- **BOM Control Panel** - Master-detail layout with template selection
- **Version Control** - Track all changes with visual diffs and history
- **Cost Analysis** - Interactive charts and cost driver analysis
- **New Part Tracker** - Kanban board: Design → Engineering → Procurement → Complete
- **Project Management** - (Phase 9) PACE gates and project metrics
- **Parts Timeline** - (Phase 10) Gantt chart for order tracking
- **AI Assistant** - (Phase 12) Natural language BOM queries and suggestions

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| State | TanStack Query + Zustand |
| Charts | Recharts |
| Toasts | Sonner |

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
├── (auth)/                     # Login, Register
├── (dashboard)/
│   ├── projects/               # Project list
│   └── project/[projectId]/
│       ├── overview/           # Project Overview (Phase 9)
│       ├── bom/                # BOM Control Panel
│       ├── configure/          # Group selection
│       ├── costs/              # Cost Analysis
│       ├── versions/           # Version History
│       ├── new-parts/          # New Part Tracker
│       ├── parts-timeline/     # Parts Timeline (Phase 10)
│       └── import/             # Import Wizard

components/
├── bom/                        # BOM components
├── charts/                     # Cost analysis charts
├── new-parts/                  # New Part Tracker
├── projects/                   # Project management
└── ui/                         # shadcn/ui components

lib/
├── bom/                        # BOM services
├── hooks/                      # React hooks
└── firebase/                   # Firebase config

types/                          # TypeScript interfaces
functions/src/                  # Cloud Functions
docs/plans/                     # Phase documentation
```

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck

# Deploy
npm run deploy              # Full deployment
npm run deploy:hosting      # Hosting only
npm run deploy:functions    # Functions only
npm run deploy:rules        # Security rules only
```

---

## Documentation

- **[docs/plans/](./docs/plans/)** - All phase plans with status tracking
- **[docs/plans/upcoming/](./docs/plans/upcoming/)** - Next phases to implement
- **[scripts/README.md](./scripts/README.md)** - Database setup scripts
- **[public/test-data/README.md](./public/test-data/README.md)** - Test data files

---

## License

[Add your license here]

---

**Last Updated**: December 20, 2024  
**Version**: 0.9.0
