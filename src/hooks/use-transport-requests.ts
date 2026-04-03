import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransportRequest {
  id: string;
  patientId: string;
  date: string;
  consultTime: string;
  destination: string;
  consultLocation: string;
  hasCompanion: boolean;
  notes: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function useTransportRequests() {
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('transport_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data.map(r => ({
        id: r.id,
        patientId: r.patient_id,
        date: r.date,
        consultTime: r.consult_time,
        destination: r.destination,
        consultLocation: r.consult_location,
        hasCompanion: r.has_companion,
        notes: r.notes,
        status: r.status,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (req: Omit<TransportRequest, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const { error } = await supabase.from('transport_requests').insert({
      patient_id: req.patientId,
      date: req.date,
      consult_time: req.consultTime,
      destination: req.destination,
      consult_location: req.consultLocation,
      has_companion: req.hasCompanion,
      notes: req.notes,
    });
    if (!error) await fetch();
    return { error };
  };

  const updateRequest = async (id: string, req: Partial<TransportRequest>) => {
    const updateData: any = {};
    if (req.patientId !== undefined) updateData.patient_id = req.patientId;
    if (req.date !== undefined) updateData.date = req.date;
    if (req.consultTime !== undefined) updateData.consult_time = req.consultTime;
    if (req.destination !== undefined) updateData.destination = req.destination;
    if (req.consultLocation !== undefined) updateData.consult_location = req.consultLocation;
    if (req.hasCompanion !== undefined) updateData.has_companion = req.hasCompanion;
    if (req.notes !== undefined) updateData.notes = req.notes;
    if (req.status !== undefined) updateData.status = req.status;

    await supabase.from('transport_requests').update(updateData).eq('id', id);
    await fetch();
  };

  return { requests, loading, create, updateRequest, refetch: fetch };
}
