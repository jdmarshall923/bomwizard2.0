/**
 * Firebase Collections Setup Script
 * 
 * This script creates initial collections and sample data in Firestore.
 * Run with: node scripts/setup-firebase-collections.js
 * 
 * Make sure you have Firebase Admin SDK credentials set up.
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// You'll need to download your service account key from Firebase Console
// and place it in the project root as 'serviceAccountKey.json'
try {
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.log('\nTo use this script:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save the JSON file as "serviceAccountKey.json" in the project root');
  console.log('4. Run this script again\n');
  process.exit(1);
}

const db = admin.firestore();

async function setupCollections() {
  console.log('🚀 Setting up Firebase collections...\n');

  try {
    // Create sample vendor
    const vendorRef = db.collection('vendors').doc('sample-vendor-1');
    await vendorRef.set({
      code: 'VEND-001',
      name: 'Sample Vendor',
      country: 'UK',
      currency: 'GBP',
      landingRate: 0.15,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created sample vendor');

    // Create sample item
    const itemRef = db.collection('items').doc('sample-item-1');
    await itemRef.set({
      code: 'ITEM-001',
      description: 'Sample Item',
      isManufactured: false,
      isPlaceholder: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created sample item');

    // Create sample landing rate
    const landingRateRef = db.collection('landingRates').doc('uk-rate');
    await landingRateRef.set({
      country: 'UK',
      rate: 0.15,
      effectiveFrom: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created sample landing rate');

    // Create sample import template
    const templateRef = db.collection('importTemplates').doc('default-infor-bom');
    await templateRef.set({
      name: 'Default Infor BOM Template',
      description: 'Standard template for importing BOM data from Infor',
      sourceType: 'infor_bom',
      columnMappings: {
        sourceColumns: ['Item Code', 'Description', 'Quantity', 'Assembly'],
        mappings: {
          itemCode: { source: 'Item Code', transform: 'uppercase' },
          itemDescription: { source: 'Description', transform: null },
          quantity: { source: 'Quantity', transform: 'parseFloat' },
          assemblyCode: { source: 'Assembly', transform: 'uppercase' },
        },
        skipRows: 1,
        delimiter: ',',
      },
      isDefault: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
    console.log('✅ Created sample import template');

    console.log('\n✨ Firebase collections setup complete!');
    console.log('\nCollections created:');
    console.log('  - vendors (with 1 sample)');
    console.log('  - items (with 1 sample)');
    console.log('  - landingRates (with 1 sample)');
    console.log('  - importTemplates (with 1 sample)');
    console.log('\nYou can now start using the application!');

  } catch (error) {
    console.error('❌ Error setting up collections:', error);
    process.exit(1);
  }
}

// Run the setup
setupCollections().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

