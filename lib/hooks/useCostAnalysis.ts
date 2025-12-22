'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBom } from './useBom';
import { 
  CostAnalysisSummary,
  CostSummary,
  AssemblyCost,
  CostTrendPoint,
  CostDriverSummary,
  PriceVolatilityItem,
  calculateCostSummary,
  calculateCostByAssembly,
  buildCostTrend,
  getCostDriversSummary,
  calculatePriceVolatility,
  getTopCostlyItems,
  getFullCostAnalysis,
} from '@/lib/bom/costAnalysisService';
import { getVersions, getLatestVersion, getEarliestVersion } from '@/lib/bom/versionService';
import { compareVersions } from '@/lib/bom/comparisonService';
import type { BomItem, BomVersion, VersionComparison } from '@/types';

export interface CostAnalysisState {
  // Current BOM data
  currentCost: CostSummary | null;
  costByAssembly: AssemblyCost[];
  topCostlyItems: BomItem[];
  
  // Historical data
  costTrend: CostTrendPoint[];
  costDrivers: CostDriverSummary[];
  priceVolatility: PriceVolatilityItem[];
  
  // Version data
  versions: BomVersion[];
  latestVersion: BomVersion | null;
  earliestVersion: BomVersion | null;
  versionComparison: VersionComparison | null;
  
  // Computed metrics
  overallChange: number | null;
  overallChangePercent: number | null;
  placeholderRisk: number;
  newPartRisk: number;
  priceConfidence: number;
  
  // Loading states
  isLoading: boolean;
  isLoadingVersions: boolean;
  isLoadingComparison: boolean;
  error: string | null;
}

export function useCostAnalysis(projectId: string | null) {
  const { bomItems, loading: bomLoading, error: bomError, stats } = useBom(projectId);
  
  // State
  const [versions, setVersions] = useState<BomVersion[]>([]);
  const [latestVersion, setLatestVersion] = useState<BomVersion | null>(null);
  const [earliestVersion, setEarliestVersion] = useState<BomVersion | null>(null);
  const [costTrend, setCostTrend] = useState<CostTrendPoint[]>([]);
  const [costDrivers, setCostDrivers] = useState<CostDriverSummary[]>([]);
  const [priceVolatility, setPriceVolatility] = useState<PriceVolatilityItem[]>([]);
  const [versionComparison, setVersionComparison] = useState<VersionComparison | null>(null);
  
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate current costs from BOM items
  const currentCost = useMemo(() => {
    if (!bomItems.length) return null;
    return calculateCostSummary(bomItems);
  }, [bomItems]);
  
  // Calculate cost by assembly
  const costByAssembly = useMemo(() => {
    if (!bomItems.length) return [];
    return calculateCostByAssembly(bomItems);
  }, [bomItems]);
  
  // Get top costly items
  const topCostlyItems = useMemo(() => {
    if (!bomItems.length) return [];
    return getTopCostlyItems(bomItems, 10);
  }, [bomItems]);
  
  // Calculate risk metrics
  const placeholderRisk = useMemo(() => {
    if (!currentCost || currentCost.totalCost <= 0) return 0;
    return (currentCost.placeholderCost / currentCost.totalCost) * 100;
  }, [currentCost]);
  
  const newPartRisk = useMemo(() => {
    if (!currentCost || currentCost.itemCount <= 0) return 0;
    return (currentCost.newPartsCount / currentCost.itemCount) * 100;
  }, [currentCost]);
  
  // Overall change metrics
  const overallChange = useMemo(() => {
    if (!earliestVersion || !latestVersion || earliestVersion.id === latestVersion.id) {
      return null;
    }
    return latestVersion.summary.totalExtendedCost - earliestVersion.summary.totalExtendedCost;
  }, [earliestVersion, latestVersion]);
  
  const overallChangePercent = useMemo(() => {
    if (overallChange === null || !earliestVersion) return null;
    const firstCost = earliestVersion.summary.totalExtendedCost;
    if (firstCost <= 0) return null;
    return (overallChange / firstCost) * 100;
  }, [overallChange, earliestVersion]);
  
  // Load version data
  useEffect(() => {
    async function loadVersionData() {
      if (!projectId) return;
      
      setIsLoadingVersions(true);
      setError(null);
      
      try {
        // Load versions in parallel
        const [versionsData, earliest, latest] = await Promise.all([
          getVersions(projectId),
          getEarliestVersion(projectId),
          getLatestVersion(projectId),
        ]);
        
        setVersions(versionsData);
        setEarliestVersion(earliest);
        setLatestVersion(latest);
        
        // Build cost trend
        const trend = await buildCostTrend(projectId);
        setCostTrend(trend);
        
        // Get cost drivers and volatility if we have multiple versions
        if (earliest && latest && earliest.id !== latest.id) {
          const [drivers, volatility] = await Promise.all([
            getCostDriversSummary(projectId),
            calculatePriceVolatility(projectId),
          ]);
          setCostDrivers(drivers);
          setPriceVolatility(volatility);
          
          // Get full comparison
          setIsLoadingComparison(true);
          const comparison = await compareVersions(projectId, earliest.id, latest.id);
          setVersionComparison(comparison);
          setIsLoadingComparison(false);
        }
      } catch (err) {
        console.error('Failed to load version data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cost analysis data');
      } finally {
        setIsLoadingVersions(false);
      }
    }
    
    loadVersionData();
  }, [projectId]);
  
  // Refresh function
  const refresh = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoadingVersions(true);
    try {
      const [versionsData, earliest, latest] = await Promise.all([
        getVersions(projectId),
        getEarliestVersion(projectId),
        getLatestVersion(projectId),
      ]);
      
      setVersions(versionsData);
      setEarliestVersion(earliest);
      setLatestVersion(latest);
      
      const trend = await buildCostTrend(projectId);
      setCostTrend(trend);
      
      if (earliest && latest && earliest.id !== latest.id) {
        const [drivers, volatility, comparison] = await Promise.all([
          getCostDriversSummary(projectId),
          calculatePriceVolatility(projectId),
          compareVersions(projectId, earliest.id, latest.id),
        ]);
        setCostDrivers(drivers);
        setPriceVolatility(volatility);
        setVersionComparison(comparison);
      }
    } catch (err) {
      console.error('Failed to refresh cost analysis:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [projectId]);
  
  return {
    // Current BOM data
    currentCost,
    costByAssembly,
    topCostlyItems,
    bomItems,
    
    // Historical data
    costTrend,
    costDrivers,
    priceVolatility,
    
    // Version data
    versions,
    latestVersion,
    earliestVersion,
    versionComparison,
    
    // Computed metrics
    overallChange,
    overallChangePercent,
    placeholderRisk,
    newPartRisk,
    priceConfidence: currentCost?.priceConfidenceScore || 0,
    
    // Loading states
    isLoading: bomLoading || isLoadingVersions,
    isLoadingVersions,
    isLoadingComparison,
    error: error || (bomError?.message ?? null),
    
    // Actions
    refresh,
  };
}



