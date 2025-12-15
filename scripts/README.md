# Firebase Collections Setup

## Quick Setup (Manual - Recommended)

You can create the collections manually in Firebase Console. They will be created automatically when you first add data through the app.

## Automated Setup (Optional)

If you want to pre-populate with sample data:

1. **Get Service Account Key:**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in the project root
   - **Important:** Add `serviceAccountKey.json` to `.gitignore` (never commit this!)

2. **Install Firebase Admin:**
   ```bash
   npm install firebase-admin
   ```

3. **Run the setup script:**
   ```bash
   node scripts/setup-firebase-collections.js
   ```

## Collections That Will Be Created Automatically

The following collections are created automatically when you use the app:

- `projects` - Created when you create your first project
- `projects/{projectId}/versions` - Created when you create a version
- `projects/{projectId}/bomItems` - Created when you import BOM data
- `projects/{projectId}/quotes` - Created when you add quotes
- `items` - Created when you add items
- `vendors` - Created when you add vendors
- `contractPrices` - Created when you add contract prices
- `landingRates` - Created when you add landing rates
- `importTemplates` - Created when you save an import template
- `manufacturingCosts` - Created when you add manufacturing costs

**No manual setup required!** Just start using the app and collections will be created as needed.

