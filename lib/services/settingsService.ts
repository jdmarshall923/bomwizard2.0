import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ColumnVisibilitySettings,
  OrganizationColumnSettings,
  ProjectColumnSettings,
  UserColumnPreferences,
  ViewPreset,
  ColumnGroupId,
  COLUMN_GROUPS,
  SYSTEM_PRESETS,
  getDefaultVisibility,
  mergeColumnSettings,
} from '@/types/settings';

/**
 * Phase 14: Column Settings Service
 * 
 * Manages the hierarchical column visibility settings:
 * Organization defaults → Project overrides → User preferences
 */

// ============================================
// ORGANIZATION SETTINGS
// ============================================

/**
 * Get organization column settings
 */
export async function getOrgColumnSettings(
  orgId: string
): Promise<OrganizationColumnSettings | null> {
  const docRef = doc(db, 'organizations', orgId, 'settings', 'columns');
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return snapshot.data() as OrganizationColumnSettings;
}

/**
 * Save organization column settings
 */
export async function saveOrgColumnSettings(
  orgId: string,
  settings: Partial<OrganizationColumnSettings>,
  userId: string
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId, 'settings', 'columns');
  const existing = await getDoc(docRef);
  
  const data: OrganizationColumnSettings = {
    defaultVisibility: settings.defaultVisibility || getDefaultVisibility(),
    presets: settings.presets || [],
    enabledColumns: settings.enabledColumns || Object.keys(COLUMN_GROUPS),
    customColumnNames: settings.customColumnNames,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };
  
  if (existing.exists()) {
    await updateDoc(docRef, { ...data });
  } else {
    await setDoc(docRef, data);
  }
}

/**
 * Add a preset to organization
 */
export async function addOrgPreset(
  orgId: string,
  preset: Omit<ViewPreset, 'id' | 'createdAt'>,
  userId: string
): Promise<string> {
  const settings = await getOrgColumnSettings(orgId);
  const presets = settings?.presets || [];
  
  const newPreset: ViewPreset = {
    ...preset,
    id: `preset-${Date.now()}`,
    createdAt: Timestamp.now(),
    createdBy: userId,
  };
  
  await saveOrgColumnSettings(orgId, {
    ...settings,
    presets: [...presets, newPreset],
  }, userId);
  
  return newPreset.id;
}

// ============================================
// PROJECT SETTINGS
// ============================================

/**
 * Get project column settings
 */
export async function getProjectColumnSettings(
  projectId: string
): Promise<ProjectColumnSettings | null> {
  const docRef = doc(db, 'projects', projectId, 'settings', 'columns');
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return snapshot.data() as ProjectColumnSettings;
}

/**
 * Save project column settings
 */
export async function saveProjectColumnSettings(
  projectId: string,
  settings: Partial<ProjectColumnSettings>,
  userId: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'settings', 'columns');
  const existing = await getDoc(docRef);
  
  const data: ProjectColumnSettings = {
    visibility: settings.visibility,
    presets: settings.presets,
    customColumnNames: settings.customColumnNames,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };
  
  if (existing.exists()) {
    await updateDoc(docRef, { ...data });
  } else {
    await setDoc(docRef, data);
  }
}

// ============================================
// USER PREFERENCES
// ============================================

/**
 * Get user column preferences
 */
export async function getUserColumnPreferences(
  userId: string
): Promise<UserColumnPreferences | null> {
  const docRef = doc(db, 'users', userId, 'preferences', 'bomTable');
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return snapshot.data() as UserColumnPreferences;
}

/**
 * Save user column preferences
 */
export async function saveUserColumnPreferences(
  userId: string,
  preferences: Partial<UserColumnPreferences>
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'preferences', 'bomTable');
  const existing = await getDoc(docRef);
  
  const data: UserColumnPreferences = {
    visibility: preferences.visibility,
    savedViews: preferences.savedViews,
    lastPresetId: preferences.lastPresetId,
    projectOverrides: preferences.projectOverrides,
    updatedAt: Timestamp.now(),
  };
  
  if (existing.exists()) {
    await updateDoc(docRef, { ...data });
  } else {
    await setDoc(docRef, data);
  }
}

/**
 * Save user's visibility for a specific project
 */
export async function saveUserProjectVisibility(
  userId: string,
  projectId: string,
  visibility: ColumnVisibilitySettings
): Promise<void> {
  const prefs = await getUserColumnPreferences(userId);
  const projectOverrides = prefs?.projectOverrides || {};
  
  await saveUserColumnPreferences(userId, {
    ...prefs,
    projectOverrides: {
      ...projectOverrides,
      [projectId]: visibility,
    },
  });
}

/**
 * Add a saved view for user
 */
export async function addUserSavedView(
  userId: string,
  view: Omit<ViewPreset, 'id' | 'createdAt' | 'createdBy'>
): Promise<string> {
  const prefs = await getUserColumnPreferences(userId);
  const savedViews = prefs?.savedViews || [];
  
  const newView: ViewPreset = {
    ...view,
    id: `view-${Date.now()}`,
    createdAt: Timestamp.now(),
    createdBy: userId,
  };
  
  await saveUserColumnPreferences(userId, {
    ...prefs,
    savedViews: [...savedViews, newView],
  });
  
  return newView.id;
}

/**
 * Delete a saved view
 */
export async function deleteUserSavedView(
  userId: string,
  viewId: string
): Promise<void> {
  const prefs = await getUserColumnPreferences(userId);
  const savedViews = prefs?.savedViews || [];
  
  await saveUserColumnPreferences(userId, {
    ...prefs,
    savedViews: savedViews.filter(v => v.id !== viewId),
  });
}

// ============================================
// MERGED SETTINGS
// ============================================

/**
 * Get effective column visibility for a user in a project
 * Merges: org defaults → project settings → user preferences
 */
export async function getEffectiveColumnVisibility(
  projectId: string,
  userId: string,
  orgId?: string
): Promise<ColumnVisibilitySettings> {
  // Fetch all settings in parallel
  const [orgSettings, projectSettings, userPrefs] = await Promise.all([
    orgId ? getOrgColumnSettings(orgId) : Promise.resolve(null),
    getProjectColumnSettings(projectId),
    getUserColumnPreferences(userId),
  ]);
  
  return mergeColumnSettings(
    orgSettings || undefined,
    projectSettings || undefined,
    userPrefs || undefined,
    projectId
  );
}

/**
 * Get all available presets for a user
 * Combines system presets + org presets + user saved views
 */
export async function getAvailablePresets(
  userId: string,
  orgId?: string
): Promise<ViewPreset[]> {
  const presets: ViewPreset[] = [...SYSTEM_PRESETS];
  
  // Add org presets
  if (orgId) {
    const orgSettings = await getOrgColumnSettings(orgId);
    if (orgSettings?.presets) {
      presets.push(...orgSettings.presets);
    }
  }
  
  // Add user saved views
  const userPrefs = await getUserColumnPreferences(userId);
  if (userPrefs?.savedViews) {
    presets.push(...userPrefs.savedViews);
  }
  
  return presets;
}

// ============================================
// QUICK TOGGLE HELPERS
// ============================================

/**
 * Toggle a column group visibility
 */
export function toggleColumnGroup(
  current: ColumnVisibilitySettings,
  groupId: ColumnGroupId
): ColumnVisibilitySettings {
  const group = COLUMN_GROUPS.find(g => g.id === groupId);
  
  // Can't toggle always-visible groups
  if (group?.alwaysVisible) {
    return current;
  }
  
  const isVisible = current.visibleGroups.includes(groupId);
  
  return {
    ...current,
    visibleGroups: isVisible
      ? current.visibleGroups.filter(g => g !== groupId)
      : [...current.visibleGroups, groupId],
  };
}

/**
 * Apply a preset
 */
export function applyPreset(preset: ViewPreset): ColumnVisibilitySettings {
  return { ...preset.visibility };
}

/**
 * Check if current settings match a preset
 */
export function matchesPreset(
  current: ColumnVisibilitySettings,
  preset: ViewPreset
): boolean {
  const currentGroups = [...current.visibleGroups].sort();
  const presetGroups = [...preset.visibility.visibleGroups].sort();
  
  if (currentGroups.length !== presetGroups.length) {
    return false;
  }
  
  return currentGroups.every((g, i) => g === presetGroups[i]);
}
