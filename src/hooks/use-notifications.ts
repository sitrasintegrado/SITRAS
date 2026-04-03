import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  relatedRequestId: string | null;
  relatedTripId: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        readAt: n.read_at,
        createdAt: n.created_at,
        relatedRequestId: n.related_request_id,
        relatedTripId: n.related_trip_id,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    await fetch();
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return { notifications, loading, unreadCount, markAsRead, refetch: fetch };
}
