import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  type: 'wallet_update' | 'commission_change' | 'withdrawal_status' | 'order_delivery' | 'general';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

type NotificationHandler = (notification: Notification) => void;

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generate unique notification ID
  const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add notification to state
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const fullNotification: Notification = {
      ...notification,
      id: generateId(),
      read: false,
      createdAt: new Date(),
    };

    setNotifications(prev => [fullNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Show toast
    toast({
      title: notification.title,
      description: notification.message,
    });

    return fullNotification;
  }, [toast]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to seller_wallets changes
    const walletChannel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seller_wallets',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Check what changed
          if (newData.available_balance > oldData.available_balance) {
            const diff = newData.available_balance - oldData.available_balance;
            addNotification({
              type: 'wallet_update',
              title: '💰 Fondos Liberados',
              message: `Se han liberado $${diff.toFixed(2)} a tu saldo disponible`,
              data: { amount: diff, newBalance: newData.available_balance },
            });
          }

          if (newData.pending_balance !== oldData.pending_balance) {
            addNotification({
              type: 'wallet_update',
              title: '⏳ Saldo Pendiente Actualizado',
              message: `Tu saldo pendiente ahora es $${newData.pending_balance.toFixed(2)}`,
              data: { pending: newData.pending_balance },
            });
          }
        }
      )
      .subscribe();

    channels.push(walletChannel);

    // Subscribe to withdrawal_requests changes
    const withdrawalChannel = supabase
      .channel('withdrawal-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdrawal_requests',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (newData.status !== oldData.status) {
            const statusMessages: Record<string, { title: string; message: string }> = {
              approved: { title: '✅ Retiro Aprobado', message: 'Tu solicitud de retiro ha sido aprobada' },
              processing: { title: '🔄 Retiro en Proceso', message: 'Tu retiro está siendo procesado' },
              completed: { title: '💸 Retiro Completado', message: `Se han transferido $${newData.amount}` },
              rejected: { title: '❌ Retiro Rechazado', message: newData.admin_notes || 'Tu solicitud fue rechazada' },
            };

            const msg = statusMessages[newData.status];
            if (msg) {
              addNotification({
                type: 'withdrawal_status',
                title: msg.title,
                message: msg.message,
                data: { status: newData.status, amount: newData.amount },
              });
            }
          }
        }
      )
      .subscribe();

    channels.push(withdrawalChannel);

    // Subscribe to commission_overrides changes
    const commissionChannel = supabase
      .channel('commission-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_commission_overrides',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = payload.new as any;
            addNotification({
              type: 'commission_change',
              title: '📊 Comisión Actualizada',
              message: `Tu comisión personalizada es ahora ${data.commission_percentage}%`,
              data: {
                percentage: data.commission_percentage,
                fixed: data.commission_fixed,
              },
            });
          }
        }
      )
      .subscribe();

    channels.push(commissionChannel);

    // Subscribe to order_deliveries for pickup confirmations
    const deliveryChannel = supabase
      .channel('delivery-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_deliveries',
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (newData.status === 'picked_up' && oldData.status !== 'picked_up') {
            addNotification({
              type: 'order_delivery',
              title: '📦 Entrega Confirmada',
              message: 'Un cliente ha recogido su pedido',
              data: {
                orderId: newData.order_id,
                deliveryCode: newData.delivery_code,
              },
            });
          }

          if (newData.funds_released && !oldData.funds_released) {
            addNotification({
              type: 'wallet_update',
              title: '💵 Fondos Liberados',
              message: 'Los fondos de una orden han sido liberados a tu wallet',
              data: { orderId: newData.order_id },
            });
          }
        }
      )
      .subscribe();

    channels.push(deliveryChannel);

    // Cleanup
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user?.id, addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};
