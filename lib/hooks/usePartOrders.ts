'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  PartOrder, 
  GanttChartData, 
  PartOrderStats, 
  OrderType, 
  FreightType, 
  OrderStatus 
} from '@/types';
import {
  getGanttChartData,
  calculateOrderStats,
  createPartOrder,
  updatePartOrder,
  deletePartOrder,
  toggleFreightType,
  updateOrderStatus,
  isOrderLate,
} from '@/lib/bom/orderTrackingService';
import { toast } from 'sonner';

interface UsePartOrdersReturn {
  orders: PartOrder[];
  ganttData: GanttChartData | null;
  stats: PartOrderStats | null;
  loading: boolean;
  error: string | null;
  // Actions
  createOrder: (orderData: Omit<PartOrder, 'id' | 'createdAt' | 'updatedAt' | 'isLate'>) => Promise<PartOrder | null>;
  updateOrder: (orderId: string, updates: Partial<PartOrder>) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  toggleFreight: (orderId: string, newFreightType: FreightType) => Promise<PartOrder | null>;
  setOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<boolean>;
  refreshGanttData: () => Promise<void>;
}

export function usePartOrders(projectId: string | null): UsePartOrdersReturn {
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [ganttData, setGanttData] = useState<GanttChartData | null>(null);
  const [stats, setStats] = useState<PartOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to orders in real-time
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, 'projects', projectId, 'partOrders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map(doc => {
          const data = doc.data();
          const order = { id: doc.id, ...data } as PartOrder;
          // Update isLate flag
          order.isLate = isOrderLate(order);
          return order;
        });
        
        setOrders(ordersData);
        setStats(calculateOrderStats(ordersData));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // Refresh gantt data
  const refreshGanttData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const data = await getGanttChartData(projectId);
      setGanttData(data);
    } catch (err) {
      console.error('Error loading gantt data:', err);
    }
  }, [projectId]);

  // Load gantt data when orders change
  useEffect(() => {
    if (projectId && orders.length >= 0) {
      refreshGanttData();
    }
  }, [projectId, orders.length, refreshGanttData]);

  // Create order
  const createOrder = useCallback(async (
    orderData: Omit<PartOrder, 'id' | 'createdAt' | 'updatedAt' | 'isLate'>
  ): Promise<PartOrder | null> => {
    if (!projectId) return null;
    
    try {
      const order = await createPartOrder(projectId, orderData);
      toast.success('Order created');
      return order;
    } catch (err) {
      console.error('Error creating order:', err);
      toast.error('Failed to create order');
      return null;
    }
  }, [projectId]);

  // Update order
  const updateOrder = useCallback(async (
    orderId: string,
    updates: Partial<PartOrder>
  ): Promise<boolean> => {
    if (!projectId) return false;
    
    try {
      await updatePartOrder(projectId, orderId, updates);
      toast.success('Order updated');
      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      toast.error('Failed to update order');
      return false;
    }
  }, [projectId]);

  // Delete order
  const deleteOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!projectId) return false;
    
    try {
      await deletePartOrder(projectId, orderId);
      toast.success('Order deleted');
      return true;
    } catch (err) {
      console.error('Error deleting order:', err);
      toast.error('Failed to delete order');
      return false;
    }
  }, [projectId]);

  // Toggle freight type
  const toggleFreight = useCallback(async (
    orderId: string,
    newFreightType: FreightType
  ): Promise<PartOrder | null> => {
    if (!projectId) return null;
    
    try {
      const order = await toggleFreightType(projectId, orderId, newFreightType);
      const freightLabel = newFreightType === 'air' ? '✈️ Air' : '🚢 Sea';
      toast.success(`Switched to ${freightLabel} freight`);
      return order;
    } catch (err) {
      console.error('Error toggling freight:', err);
      toast.error('Failed to update freight type');
      return null;
    }
  }, [projectId]);

  // Set order status
  const setOrderStatus = useCallback(async (
    orderId: string,
    newStatus: OrderStatus
  ): Promise<boolean> => {
    if (!projectId) return false;
    
    try {
      await updateOrderStatus(projectId, orderId, newStatus);
      const statusLabels: Record<OrderStatus, string> = {
        not_ordered: 'Not Ordered',
        ordered: 'Ordered',
        in_transit: 'In Transit',
        received: 'Received',
      };
      toast.success(`Status: ${statusLabels[newStatus]}`);
      return true;
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
      return false;
    }
  }, [projectId]);

  return {
    orders,
    ganttData,
    stats,
    loading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    toggleFreight,
    setOrderStatus,
    refreshGanttData,
  };
}



