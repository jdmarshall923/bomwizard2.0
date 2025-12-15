import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Auto-create quote when new BOM item is added
export const autoCreateQuote = functions.firestore
  .document('projects/{projectId}/versions/{versionId}/bomItems/{itemId}')
  .onCreate(async (snap, context) => {
    const item = snap.data();
    const { projectId } = context.params;

    // Check if this is a new purchased part that needs a quote
    if (item.partCategory === 'new_part' && !item.isManufactured) {
      // Check if quote already exists
      const quotesRef = admin.firestore()
        .collection(`projects/${projectId}/quotes`)
        .where('itemCode', '==', item.itemCode);

      const existingQuotes = await quotesRef.get();

      if (existingQuotes.empty) {
        // Create new quote
        await admin.firestore()
          .collection(`projects/${projectId}/quotes`)
          .add({
            itemCode: item.itemCode,
            description: item.itemDescription,
            status: 'pending',
            currency: 'GBP',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system',
          });
      }
    }

    return null;
  });

// Create version snapshot
export const createSnapshot = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { projectId } = data;
  if (!projectId) {
    throw new functions.https.HttpsError('invalid-argument', 'projectId is required');
  }

  // Get current BOM items
  const bomItemsSnapshot = await admin.firestore()
    .collection(`projects/${projectId}/bomItems`)
    .get();

  const bomItems = bomItemsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Calculate totals
  const totals = bomItems.reduce(
    (acc, item) => ({
      totalCost: acc.totalCost + (item.extendedCost || 0),
      materialCost: acc.materialCost + (item.materialCost || 0) * (item.quantity || 0),
      landingCost: acc.landingCost + (item.landingCost || 0) * (item.quantity || 0),
      labourCost: acc.labourCost + (item.labourCost || 0) * (item.quantity || 0),
    }),
    { totalCost: 0, materialCost: 0, landingCost: 0, labourCost: 0 }
  );

  // Get latest version number
  const versionsSnapshot = await admin.firestore()
    .collection(`projects/${projectId}/versions`)
    .orderBy('versionNumber', 'desc')
    .limit(1)
    .get();

  const nextVersionNumber =
    versionsSnapshot.empty
      ? 1
      : (versionsSnapshot.docs[0].data().versionNumber || 0) + 1;

  // Create version document
  const versionRef = await admin.firestore()
    .collection(`projects/${projectId}/versions`)
    .add({
      versionNumber: nextVersionNumber,
      snapshotDate: admin.firestore.FieldValue.serverTimestamp(),
      changeNote: data.changeNote || '',
      ...totals,
      itemCount: bomItems.length,
      assemblyCount: new Set(bomItems.map((item) => item.assemblyCode)).size,
      createdBy: context.auth.uid,
    });

  // Copy BOM items to version subcollection
  const batch = admin.firestore().batch();
  bomItems.forEach((item) => {
    const itemRef = admin.firestore()
      .collection(`projects/${projectId}/versions/${versionRef.id}/bomItems`)
      .doc();
    batch.set(itemRef, item);
  });
  await batch.commit();

  return { versionId: versionRef.id, versionNumber: nextVersionNumber };
});

// Calculate cost rollups
export const calculateCosts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { projectId, versionId } = data;
  if (!projectId || !versionId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'projectId and versionId are required'
    );
  }

  // Get BOM items for this version
  const bomItemsSnapshot = await admin.firestore()
    .collection(`projects/${projectId}/versions/${versionId}/bomItems`)
    .get();

  const bomItems = bomItemsSnapshot.docs.map((doc) => doc.data());

  // Calculate totals
  const totals = bomItems.reduce(
    (acc, item) => ({
      totalCost: acc.totalCost + (item.extendedCost || 0),
      materialCost: acc.materialCost + (item.materialCost || 0) * (item.quantity || 0),
      landingCost: acc.landingCost + (item.landingCost || 0) * (item.quantity || 0),
      labourCost: acc.labourCost + (item.labourCost || 0) * (item.quantity || 0),
    }),
    { totalCost: 0, materialCost: 0, landingCost: 0, labourCost: 0 }
  );

  // Update version document
  await admin.firestore()
    .collection(`projects/${projectId}/versions`)
    .doc(versionId)
    .update(totals);

  return totals;
});

