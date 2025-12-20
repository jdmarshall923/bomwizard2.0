import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// ============================================
// NEW PART TRACKER - Phase 7
// ============================================

/**
 * Auto-create NewPart document when a BOM item is created with isNewPart: true
 * Triggers on: projects/{projectId}/bomItems/{itemId} creation
 */
export const autoCreateNewPart = functions.firestore
  .document('projects/{projectId}/bomItems/{itemId}')
  .onCreate(async (snap, context) => {
    const item = snap.data();
    const { projectId, itemId } = context.params;

    // Only create NewPart if item is flagged as isNewPart and doesn't already have a tracker
    if (item.isNewPart === true && !item.newPartTrackerId) {
      const newPartsRef = admin.firestore().collection(`projects/${projectId}/newParts`);
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Create the NewPart document
      const newPartDoc = await newPartsRef.add({
        projectId,
        bomItemId: itemId,
        placeholderCode: item.itemCode,
        description: item.itemDescription || '',
        groupCode: item.groupCode || '',
        quantity: item.quantity || 1,
        status: 'added',
        priority: 'medium',
        requestedBy: item.updatedBy || 'system',
        requestedAt: now,
        designStatus: 'not_started',
        engineeringStatus: 'not_started',
        procurementStatus: 'not_started',
        createdAt: now,
        updatedAt: now,
      });

      // Update the BomItem with the newPartTrackerId
      await admin.firestore()
        .collection(`projects/${projectId}/bomItems`)
        .doc(itemId)
        .update({
          newPartTrackerId: newPartDoc.id,
          newPartStatus: 'added',
          updatedAt: now,
        });

      functions.logger.info(`Created NewPart ${newPartDoc.id} for BomItem ${itemId}`);
    }

    return null;
  });

/**
 * Update BOM item when NewPart is completed
 * Triggers on: projects/{projectId}/newParts/{newPartId} updates
 */
export const onNewPartComplete = functions.firestore
  .document('projects/{projectId}/newParts/{newPartId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { projectId } = context.params;

    // Check if status changed to 'complete'
    if (before.status !== 'complete' && after.status === 'complete') {
      const bomItemId = after.bomItemId;

      if (bomItemId && after.finalItemCode) {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const landingCost = (after.finalUnitPrice || 0) * ((after.landingPct || 0) / 100);
        const unitCost = (after.finalUnitPrice || 0) + landingCost;
        const extendedCost = unitCost * (after.quantity || 1);

        // Update the BomItem with final details
        await admin.firestore()
          .collection(`projects/${projectId}/bomItems`)
          .doc(bomItemId)
          .update({
            itemCode: after.finalItemCode,
            isPlaceholder: false,
            isNewPart: false,
            newPartStatus: 'complete',
            finalItemCode: after.finalItemCode,
            materialCost: after.finalUnitPrice || 0,
            landingCost,
            landingPct: after.landingPct || 0,
            extendedCost,
            costSource: 'contract',
            vendorCode: after.vendorCode || null,
            vendorName: after.vendorName || null,
            updatedAt: now,
          });

        functions.logger.info(
          `Updated BomItem ${bomItemId} with final B-code ${after.finalItemCode}`
        );
      }
    }

    return null;
  });

// ============================================
// LEGACY FUNCTIONS
// ============================================

// Auto-create quote when new BOM item is added (legacy)
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

