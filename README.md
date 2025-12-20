# BOM Wizard

Modern BOM (Bill of Materials) cost control and version management system built with Next.js 16, Firebase, and TypeScript.

## 📊 Current Status

| Phase | Status |
|-------|--------|
| Phase 1: Foundation | ✅ Complete |
| Phase 2: Import System | ✅ Complete |
| Phase 3: BOM Explorer | ✅ Complete |
| Phase 3.7: Batch Item Entry | ✅ Complete |
| Phase 4: BOM Control Panel | ✅ Complete |
| Phase 5: Version Control | ✅ Complete |
| Phase 6: Cost Analysis | ✅ Complete |
| Phase 7: New Part Tracker | ✅ Complete |
| Phase 8: Polish & Launch | ✅ Complete |
| Phase 9: AI Integration | 📋 Planned |

**📄 See [FULL_PROJECT_PLAN.md](./FULL_PROJECT_PLAN.md) for complete documentation of all phases.**

---

## Features

- **Import Wizard** - Import CSV data from Infor with saved templates
- **BOM Explorer** - View/edit BOM with hierarchical tree and table views
- **BOM Control Panel** - Master-detail layout with template selection
- **Version Control** - Track all changes with visual diffs and history
- **Cost Analysis** - Interactive charts and cost driver analysis
- **New Part Tracker** - Kanban board: Design → Engineering → Procurement → Complete
- **AI Assistant** - (Phase 9) Natural language BOM queries and suggestions

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
│       ├── bom/                # BOM Control Panel
│       ├── costs/              # Cost Analysis
│       ├── versions/           # Version History
│       ├── new-parts/          # New Part Tracker
│       └── import/             # Import Wizard

components/
├── bom/                        # BOM components
├── charts/                     # Cost analysis charts
├── new-parts/                  # New Part Tracker
└── ui/                         # shadcn/ui components

lib/
├── bom/                        # BOM services
├── hooks/                      # React hooks
└── firebase/                   # Firebase config

types/                          # TypeScript interfaces
functions/src/                  # Cloud Functions
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

- **[FULL_PROJECT_PLAN.md](./FULL_PROJECT_PLAN.md)** - Complete phase documentation, data models, workflows
- **[scripts/README.md](./scripts/README.md)** - Database setup scripts
- **[public/test-data/README.md](./public/test-data/README.md)** - Test data files

---

## License

[Add your license here]

---

**Last Updated**: December 2024  
**Version**: 0.8.0
