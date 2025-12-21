/**
 * Order Tracking Service
 * 
 * Manages part orders, lead time calculations, and timeline tracking
 * for the Parts Timeline (Gantt chart) feature.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  PartOrder, 
  PartOrderSummary, 
  GanttChartData, 
  PartOrderStats,
  OrderType,
  FreightType,
  OrderStatus,
  NewPart
} from '@/types';
import { ProjectGates, GateKey, GATE_METADATA } from '@/types/project';
import { getProjectGates } from './projectMetricsService';

// ============================================
// Lead Time Calculations
// ============================================

/**
 * Calculate effective lead time based on freight type
 */
export function calculateEffectiveLeadTime(
  baseLeadTimeDays: number,
  freightType: FreightType,
  airFreightDays: number,
  seaFreightDays: number
): number {
  const transitDays = freightType === 'air' ? airFreightDays : seaFreightDays;
  return baseLeadTimeDays + transitDays;
}

/**
 * Calculate order-by date based on required date and lead time
 */
export function calculateOrderByDate(
  requiredByDate: Date,
  effectiveLeadTimeDays: number
): Date {
  const orderDate = new Date(requiredByDate);
  orderDate.setDate(orderDate.getDate() - effectiveLeadTimeDays);
  return orderDate;
}

/**
 * Calculate expected arrival based on order date and lead time
 */
export function calculateExpectedArrival(
  orderDate: Date,
  effectiveLeadTimeDays: number
): Date {
  const arrivalDate = new Date(orderDate);
  arrivalDate.setDate(arrivalDate.getDate() + effectiveLeadTimeDays);
  return arrivalDate;
}

/**
 * Check if an order is late (should have been ordered by now)
 */
export function isOrderLate(order: PartOrder): boolean {
  if (order.orderStatus !== 'not_ordered') return false;
  if (!order.orderByDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const orderByDate = order.orderByDate.toDate();
  orderByDate.setHours(0, 0, 0, 0);
  
  return orderByDate < today;
}

/**
 * Calculate order quantity with scrap rate
 */
export function calculateOrderQuantity(quantity: number, scrapRate: number): number {
  return Math.ceil(quantity * (1 + scrapRate / 100));
}

// ============================================
// Firestore Operations
// ============================================

/**
 * Get all part orders for a project
 */
export async function getPartOrders(projectId: string): Promise<PartOrder[]> {
  const ordersRef = collection(db, 'projects', projectId, 'partOrders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as PartOrder));
}

/**
 * Get part orders by type (sprint or mass_production)
 */
export async function getPartOrdersByType(
  projectId: string, 
  orderType: OrderType
): Promise<PartOrder[]> {
  const ordersRef = collection(db, 'projects', projectId, 'partOrders');
  const q = query(
    ordersRef, 
    where('orderType', '==', orderType),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as PartOrder));
}

/**
 * Create a new part order
 */
export async function createPartOrder(
  projectId: string,
  orderData: Omit<PartOrder, 'id' | 'createdAt' | 'updatedAt' | 'isLate'>
): Promise<PartOrder> {
  const ordersRef = collection(db, 'projects', projectId, 'partOrders');
  
  const now = Timestamp.now();
  const order: Omit<PartOrder, 'id'> = {
    ...orderData,
    isLate: false,
    createdAt: now,
    updatedAt: now,
  };
  
  // Recalculate effective lead time
  order.effectiveLeadTime = calculateEffectiveLeadTime(
    order.baseLeadTimeDays,
    order.freightType,
    order.airFreightDays,
    order.seaFreightDays
  );
  
  // Calculate order-by date if required date is set
  if (order.requiredByDate) {
    const requiredDate = order.requiredByDate.toDate();
    const orderByDate = calculateOrderByDate(requiredDate, order.effectiveLeadTime);
    order.orderByDate = Timestamp.fromDate(orderByDate);
  }
  
  const docRef = await addDoc(ordersRef, order);
  
  return {
    id: docRef.id,
    ...order,
  };
}

/**
 * Update a part order
 */
export async function updatePartOrder(
  projectId: string,
  orderId: string,
  updates: Partial<PartOrder>
): Promise<void> {
  const orderRef = doc(db, 'projects', projectId, 'partOrders', orderId);
  
  await updateDoc(orderRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete a part order
 */
export async function deletePartOrder(
  projectId: string,
  orderId: string
): Promise<void> {
  const orderRef = doc(db, 'projects', projectId, 'partOrders', orderId);
  await deleteDoc(orderRef);
}

/**
 * Toggle freight type and recalculate lead times
 */
export async function toggleFreightType(
  projectId: string,
  orderId: string,
  newFreightType: FreightType
): Promise<PartOrder> {
  const orderRef = doc(db, 'projects', projectId, 'partOrders', orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (!orderSnap.exists()) {
    throw new Error('Order not found');
  }
  
  const order = { id: orderSnap.id, ...orderSnap.data() } as PartOrder;
  
  // Recalculate effective lead time
  const effectiveLeadTime = calculateEffectiveLeadTime(
    order.baseLeadTimeDays,
    newFreightType,
    order.airFreightDays,
    order.seaFreightDays
  );
  
  // Recalculate order-by date
  let orderByDate: Timestamp | undefined;
  if (order.requiredByDate) {
    const requiredDate = order.requiredByDate.toDate();
    const calculatedOrderBy = calculateOrderByDate(requiredDate, effectiveLeadTime);
    orderByDate = Timestamp.fromDate(calculatedOrderBy);
  }
  
  // Recalculate expected arrival if already ordered
  let expectedArrivalDate: Timestamp | undefined;
  if (order.actualOrderDate) {
    const orderDate = order.actualOrderDate.toDate();
    const arrivalDate = calculateExpectedArrival(orderDate, effectiveLeadTime);
    expectedArrivalDate = Timestamp.fromDate(arrivalDate);
  }
  
  const updates: Partial<PartOrder> = {
    freightType: newFreightType,
    effectiveLeadTime,
    orderByDate,
    expectedArrivalDate,
    updatedAt: Timestamp.now(),
  };
  
  await updateDoc(orderRef, updates);
  
  return {
    ...order,
    ...updates,
  };
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  projectId: string,
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  const updates: Partial<PartOrder> = {
    orderStatus: newStatus,
    updatedAt: Timestamp.now(),
  };
  
  // Set actual dates based on status change
  if (newStatus === 'ordered') {
    updates.actualOrderDate = Timestamp.now();
  } else if (newStatus === 'received') {
    updates.actualArrivalDate = Timestamp.now();
  }
  
  const orderRef = doc(db, 'projects', projectId, 'partOrders', orderId);
  await updateDoc(orderRef, updates);
}

// ============================================
// Gantt Chart Data
// ============================================

/**
 * Get Gantt chart data for a project
 */
export async function getGanttChartData(projectId: string): Promise<GanttChartData> {
  const [orders, gates] = await Promise.all([
    getPartOrders(projectId),
    getProjectGates(projectId),
  ]);
  
  // Separate by order type
  const sprintOrders = orders.filter(o => o.orderType === 'sprint');
  const massProductionOrders = orders.filter(o => o.orderType === 'mass_production');
  
  // Update isLate flag for each order
  const updateLateStatus = (order: PartOrder): PartOrder => ({
    ...order,
    isLate: isOrderLate(order),
  });
  
  // Create gate markers
  const gateMarkers = GATE_METADATA
    .filter(meta => gates[meta.key].date)
    .map(meta => ({
      key: meta.key,
      name: meta.name,
      date: gates[meta.key].date!.toDate(),
    }));
  
  // Calculate timeline bounds
  const today = new Date();
  
  // Calculate implied end dates for orders based on their lead times
  // This ensures the timeline is long enough to show the full lead time bars
  const impliedEndDates = orders.map(o => {
    const startDate = o.actualOrderDate?.toDate() || o.orderByDate?.toDate() || today;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + o.effectiveLeadTime);
    return endDate;
  });
  
  const allDates = [
    ...orders.map(o => o.orderByDate?.toDate()).filter(Boolean) as Date[],
    ...orders.map(o => o.requiredByDate?.toDate()).filter(Boolean) as Date[],
    ...orders.map(o => o.actualOrderDate?.toDate()).filter(Boolean) as Date[],
    ...impliedEndDates,
    ...gateMarkers.map(g => g.date),
    today,
  ];
  
  const timelineStart = new Date(Math.min(...allDates.map(d => d.getTime())));
  timelineStart.setDate(timelineStart.getDate() - 7); // Add buffer
  
  const timelineEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
  timelineEnd.setDate(timelineEnd.getDate() + 14); // Add buffer
  
  return {
    sprintOrders: sprintOrders.map(updateLateStatus),
    massProductionOrders: massProductionOrders.map(updateLateStatus),
    gateMarkers,
    timelineStart,
    timelineEnd,
  };
}

// ============================================
// Statistics & Risk Analysis
// ============================================

/**
 * Calculate order statistics
 */
export function calculateOrderStats(orders: PartOrder[]): PartOrderStats {
  const stats: PartOrderStats = {
    total: orders.length,
    byType: { sprint: 0, mass_production: 0 },
    byStatus: { not_ordered: 0, ordered: 0, in_transit: 0, received: 0 },
    lateCount: 0,
    receivedCount: 0,
    sprintReadinessPercent: 0,
    massProdReadinessPercent: 0,
  };
  
  orders.forEach(order => {
    stats.byType[order.orderType]++;
    stats.byStatus[order.orderStatus]++;
    if (isOrderLate(order)) stats.lateCount++;
    if (order.orderStatus === 'received') stats.receivedCount++;
  });
  
  // Calculate readiness percentages
  const sprintOrders = orders.filter(o => o.orderType === 'sprint');
  const massProdOrders = orders.filter(o => o.orderType === 'mass_production');
  
  if (sprintOrders.length > 0) {
    const sprintReceived = sprintOrders.filter(o => o.orderStatus === 'received').length;
    stats.sprintReadinessPercent = (sprintReceived / sprintOrders.length) * 100;
  }
  
  if (massProdOrders.length > 0) {
    const massProdReceived = massProdOrders.filter(o => o.orderStatus === 'received').length;
    stats.massProdReadinessPercent = (massProdReceived / massProdOrders.length) * 100;
  }
  
  return stats;
}

/**
 * Get parts at risk of missing gates
 */
export async function getPartsAtRisk(projectId: string): Promise<{
  sprintAtRisk: PartOrder[];
  massProductionAtRisk: PartOrder[];
}> {
  const orders = await getPartOrders(projectId);
  
  return {
    sprintAtRisk: orders.filter(o => o.orderType === 'sprint' && isOrderLate(o)),
    massProductionAtRisk: orders.filter(o => o.orderType === 'mass_production' && isOrderLate(o)),
  };
}

// ============================================
// Order Creation Helpers
// ============================================

/**
 * Create orders from new parts
 */
export async function createOrdersFromNewParts(
  projectId: string,
  newParts: NewPart[],
  orderType: OrderType,
  gates: ProjectGates,
  defaults: {
    scrapRate?: number;
    baseLeadTimeDays?: number;
    airFreightDays?: number;
    seaFreightDays?: number;
  } = {}
): Promise<PartOrder[]> {
  const createdOrders: PartOrder[] = [];
  
  // Get required date from gate
  const gateKey: GateKey = orderType === 'sprint' ? 'sprint' : 'massProduction';
  const requiredByDate = gates[gateKey].date;
  
  for (const part of newParts) {
    const orderData: Omit<PartOrder, 'id' | 'createdAt' | 'updatedAt' | 'isLate'> = {
      projectId,
      newPartId: part.id,
      bomItemId: part.bomItemId,
      orderType,
      itemCode: part.finalItemCode || part.placeholderCode,
      description: part.description,
      groupCode: part.groupCode,
      quantity: part.quantity,
      scrapRate: defaults.scrapRate || 5,
      orderQuantity: calculateOrderQuantity(part.quantity, defaults.scrapRate || 5),
      baseLeadTimeDays: part.quotedLeadTimeDays || defaults.baseLeadTimeDays || 30,
      freightType: 'sea',
      airFreightDays: defaults.airFreightDays || 5,
      seaFreightDays: defaults.seaFreightDays || 35,
      effectiveLeadTime: 0, // Will be calculated
      requiredByDate,
      orderStatus: 'not_ordered',
      vendorCode: part.vendorCode,
      vendorName: part.vendorName,
      unitPrice: part.quotedPrice,
    };
    
    const order = await createPartOrder(projectId, orderData);
    createdOrders.push(order);
  }
  
  return createdOrders;
}

/**
 * Create a sample/demo order for testing
 */
export async function createSampleOrder(
  projectId: string,
  orderType: OrderType = 'sprint'
): Promise<PartOrder> {
  const gates = await getProjectGates(projectId);
  const gateKey: GateKey = orderType === 'sprint' ? 'sprint' : 'massProduction';
  
  const orderData: Omit<PartOrder, 'id' | 'createdAt' | 'updatedAt' | 'isLate'> = {
    projectId,
    orderType,
    itemCode: 'SAMPLE-001',
    description: 'Sample Part for Testing',
    quantity: 100,
    scrapRate: 5,
    orderQuantity: 105,
    baseLeadTimeDays: 30,
    freightType: 'sea',
    airFreightDays: 5,
    seaFreightDays: 35,
    effectiveLeadTime: 65,
    requiredByDate: gates[gateKey].date,
    orderStatus: 'not_ordered',
  };
  
  return createPartOrder(projectId, orderData);
}

