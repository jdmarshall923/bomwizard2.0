# BOM Wizard

Modern BOM (Bill of Materials) cost control and version management system built with Next.js 16, Firebase, and TypeScript.

## Current Status

**Phase 1: Foundation** ✅ **COMPLETE**

The foundation is fully implemented and ready for use:
- ✅ Firebase project setup (Auth, Firestore, Storage, Hosting)
- ✅ Next.js 16 project with TypeScript + Tailwind CSS
- ✅ Modern dark theme with glass morphism and gradient effects
- ✅ Firebase Auth integration (Google + Email)
- ✅ Navigation shell with dynamic sidebars
- ✅ Project CRUD operations
- ✅ All routes and component stubs created
- ✅ TypeScript types and interfaces
- ✅ Firebase security rules and indexes deployed

**Phase 2: Import System** ✅ **COMPLETE**

The complete import wizard system is now functional:
- ✅ File upload component with drag & drop
- ✅ CSV parser with papaparse
- ✅ Template builder UI and management
- ✅ Column mapping interface with auto-detection
- ✅ Firestore batch write for imports
- ✅ Import history tracking
- ✅ Multi-step import wizard

**Phase 3: BOM Explorer** ✅ **COMPLETE**

Full BOM Explorer with tree/table views:
- ✅ Tree view with expand/collapse assemblies
- ✅ Table view with TanStack Table (sorting, pagination)
- ✅ Real-time updates with Firestore onSnapshot
- ✅ Search & filter system
- ✅ Inline editing with optimistic updates
- ✅ Item edit drawer with cost calculations

**Phase 3.7/3.75: Batch Item Entry** ✅ **COMPLETE**

Enhanced item entry workflow:
- ✅ Batch add multiple items in one dialog
- ✅ Inline group creation
- ✅ Smart search vs placeholder detection
- ✅ "New Part" and "Track" flags for design/procurement workflow
- ✅ Per-item group selection

**Phase 4: BOM Control Panel** ✅ **COMPLETE**

Master-detail panel layout:
- ✅ Template BOM panel (left) with cascading checkbox tree
- ✅ Working BOM panel (right) with stats and editing
- ✅ Transfer bar for copying items between panels
- ✅ Duplicate detection and vendor price lookup
- ✅ Batch transfer with landing cost calculation

**Phase 5: Version Control** ✅ **COMPLETE**

Comprehensive version control system:
- ✅ Manual version snapshots with name/description
- ✅ Auto-version on import and bulk operations (10+ items)
- ✅ Version timeline with cost trend visualization
- ✅ Compare any two versions with cost driver breakdown
- ✅ Date range comparison across time periods
- ✅ Cost trend charts and aggregated analysis
- ✅ Changes grouped by driver and assembly

**Next Phase: Phase 6 - Cost Analysis** 🚀

## Features

- **Project Management**: Create and manage multiple BOM projects
- **BOM Explorer**: View and edit BOM data with hierarchical tree and table views
- **Cost Analysis**: Analyze BOM costs with visualizations and breakdowns
- **Version Control**: Track all changes with visual diffs and version history
- **Import Wizard**: Import CSV data from Infor with saved templates
- **New Part Tracker**: Track new parts through design, engineering, and procurement
- **Manufacturing Log**: Track labour costs for manufactured items
- **Master Data**: Manage items, vendors, contract prices, and landing rates

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components**: Shadcn/ui + Radix UI
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **State Management**: Zustand, TanStack Query, React Firebase Hooks
- **Charts**: Recharts
- **Icons**: Lucide React
- **File Processing**: PapaParse (CSV), XLSX (Excel)

## Prerequisites

- Node.js 18+ and npm
- Firebase account (free tier is sufficient for development)

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Note your project ID

### 2. Enable Firebase Services

#### Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider (optional but recommended)
   - Add your OAuth consent screen details if needed

#### Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Start in **production mode** (we'll set up security rules)
4. Choose a location (e.g., `us-central1`)

#### Cloud Storage

1. Go to **Storage**
2. Click **Get started**
3. Start in **production mode**
4. Use the same location as Firestore

#### Cloud Functions

1. Go to **Functions**
2. Click **Get started** (if prompted)
3. Enable billing (required for Cloud Functions, but free tier includes generous limits)

### 3. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click the web icon (`</>`) to add a web app
4. Register your app (e.g., "BOM Wizard")
5. Copy the Firebase configuration object

### 4. Configure Environment Variables

1. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

2. Replace the values with your Firebase configuration

### 5. Deploy Security Rules and Indexes

1. Install Firebase CLI (if not already installed):

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase in your project:

```bash
firebase init
```

Select:
- Firestore: Configure security rules and indexes files
- Storage: Configure a security rules file for Cloud Storage
- Functions: Configure a Cloud Functions directory and files

4. Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bom_wizard2.0
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (see Firebase Setup above)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
bom-wizard/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application routes
│   │   ├── projects/      # Project management
│   │   ├── project/       # Project-scoped pages
│   │   ├── data/          # Global master data
│   │   ├── settings/      # App settings
│   │   └── integrations/  # Integrations config
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # Shadcn/ui components
│   ├── layout/            # Layout components
│   ├── projects/          # Project components
│   ├── bom/               # BOM components
│   ├── import/            # Import wizard components
│   ├── charts/            # Chart components
│   ├── versions/           # Version components
│   └── quotes/            # New Part Tracker components
├── lib/                   # Utilities and helpers
│   ├── firebase/          # Firebase configuration
│   ├── hooks/             # Custom React hooks
│   └── context/           # React context providers
├── functions/             # Firebase Cloud Functions
├── types/                 # TypeScript type definitions
└── styles/                # Global styles
```

## Development

### Running the Development Server

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Firebase Cloud Functions

### Setup

1. Navigate to the functions directory:

```bash
cd functions
```

2. Install dependencies:

```bash
npm install
```

### Deploy Functions

```bash
npm run deploy
```

Or from the project root:

```bash
firebase deploy --only functions
```

### Available Functions

- **autoCreateNewPart**: Automatically creates a New Part Tracker entry when a new part is flagged in the BOM
- **createSnapshot**: Creates a version snapshot of the current BOM state
- **calculateCosts**: Calculates cost rollups for a version

## Deployment

### Deploy to Firebase Hosting

1. Build the Next.js app:

```bash
npm run build
```

2. Deploy:

```bash
firebase deploy --only hosting
```

Note: Firebase Hosting configuration is set up in `firebase.json`. You may need to adjust the build output directory based on your Next.js configuration.

### Environment Variables in Production

Set environment variables in Firebase Hosting:
1. Go to Firebase Console > Hosting
2. Configure environment variables in the hosting settings
3. Or use Firebase Functions config:

```bash
firebase functions:config:set app.api_key="your_key"
```

## Security Rules

Security rules are defined in:
- `firestore.rules` - Firestore database rules
- `storage.rules` - Cloud Storage rules

These rules ensure that:
- Only authenticated users can access data
- Users can only modify their own projects
- Master data is readable by all authenticated users

## Firestore Indexes

Compound query indexes are defined in `firestore.indexes.json`. Firebase will automatically create these indexes when you deploy, or you can create them manually in the Firebase Console.

## Design System

The application uses a modern dark-mode-first design system with:

- **Color Palette**: Deep dark backgrounds with vibrant indigo/purple gradients
- **Glass Morphism**: Backdrop blur effects on sidebars and cards
- **Gradient Accents**: Indigo-to-purple gradients for branding and active states
- **Typography**: Inter font family with clear hierarchy
- **Animations**: Smooth hover effects with lift animations
- **Visual Effects**: Glow effects, gradient borders, and subtle shadows
- **Components**: Shadcn/ui components with custom modern styling

**Key Design Features:**
- Glass morphism sidebars with backdrop blur
- Gradient logo with glow effects
- Animated hover states with lift effects
- Gradient active state indicators
- Modern color scheme (indigo/purple/orange accents)
- Subtle radial gradient background overlays

See `app/globals.css` for all design tokens and CSS variables.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Add your license here]

## Implementation Progress

### Phase 1: Foundation ✅ COMPLETE
- [x] Firebase project setup (Auth, Firestore, Storage, Hosting)
- [x] Next.js project with TypeScript + Tailwind
- [x] Modern dark theme implementation with design system
- [x] Firebase Auth integration (Google + Email)
- [x] Navigation shell with sidebar
- [x] Basic CRUD for Projects collection
- [x] All route stubs created
- [x] Component stubs for all modules
- [x] TypeScript interfaces for all data models
- [x] Firebase security rules and indexes

### Phase 2: Import System ✅ COMPLETE
- [x] File upload component (to Firebase Storage)
- [x] CSV parser with papaparse
- [x] Template builder UI
- [x] Column mapping interface with preview
- [x] Firestore batch write for imports
- [x] Import history tracking

### Phase 3: BOM Explorer ✅ COMPLETE
- [x] Tree view component with expand/collapse
- [x] Table view with TanStack Table
- [x] Real-time updates with onSnapshot
- [x] Search & filter system
- [x] Inline editing with optimistic updates
- [x] Assembly/Item detail panels

### Phase 3.7/3.75: Batch Item Entry ✅ COMPLETE
- [x] Batch add dialog for multiple items
- [x] Inline group creation
- [x] Smart search vs placeholder detection
- [x] "New Part" and "Track" flags
- [x] Per-item group selection
- [x] Simplified UI (Phase 3.75)

### Phase 4: BOM Control Panel ✅ COMPLETE
- [x] Master-detail layout (Template BOM / Working BOM)
- [x] Cascading checkbox tree for selection
- [x] Transfer bar for copying items
- [x] Duplicate detection
- [x] Vendor price lookup and landing cost calculation

### Phase 5: Version Control ✅ COMPLETE
- [x] Version service for snapshot CRUD
- [x] Version timeline component
- [x] Diff algorithm with cost driver detection
- [x] Change categorization by driver and assembly
- [x] Date range comparison view
- [x] Auto-version on import/bulk operations

### Phase 6: Cost Analysis (Planned)
- [ ] Dashboard summary cards
- [ ] Cost breakdown by assembly (Recharts)
- [ ] Trend chart over versions
- [ ] Cloud Function for cost rollup calculations
- [ ] Export to PDF/Excel

### Phase 7: New Part Tracker & Manufacturing Logs (Planned)
- [ ] New Part Tracker CRUD (Added → Design → Engineering → Procurement → Complete)
- [ ] Kanban view component for part lifecycle
- [ ] Cloud Function: auto-create NewPart when flagged in BOM
- [ ] Cloud Function: update BomItem when part complete (assign final B-code)
- [ ] Manufacturing cost tracking

### Phase 8: Polish & Launch (Planned)
- [ ] Performance optimization (pagination, virtualization)
- [ ] Error handling & loading states
- [ ] Firestore security rules audit
- [ ] Help documentation
- [ ] User testing with real data
- [ ] Deploy to Firebase Hosting

## Next Steps

To continue development:

1. **Start Phase 5: Version Control**
   - Implement Cloud Function for snapshot creation
   - Build version timeline component
   - Create diff algorithm to compare versions
   - Add change categorization logic
   - Build side-by-side comparison UI

2. **Test Current Features**
   - Test BOM Control Panel with real data
   - Verify transfer logic and duplicate detection
   - Test batch item entry workflow

3. **Future Phases**
   - Phase 6: Cost Analysis dashboards
   - Phase 7: New Part Tracker & Manufacturing Logs
   - Phase 8: Polish & Launch

## Firebase Collections Setup

Collections are created automatically when you use the app. No manual setup required!

If you want to pre-populate with sample data, see `scripts/README.md` for instructions.

## Support

For issues and questions, please [create an issue](link-to-issues) or contact the development team.

---

**Last Updated**: December 2024  
**Current Version**: 0.5.0  
**Status**: Phase 5 Complete - Ready for Phase 6 (Cost Analysis)
