import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, Vehicle, Driver, Trip, TripPassenger } from '@/types';

// ── Patients ──
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('patients').select('*').order('name');
    if (data) setPatients(data.map(r => ({ id: r.id, name: r.name, cpf: r.cpf, phone: r.phone, address: r.address, notes: r.notes })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (patient: Omit<Patient, 'id'>) => {
    const { data } = await supabase.from('patients').insert({ name: patient.name, cpf: patient.cpf, phone: patient.phone, address: patient.address, notes: patient.notes }).select().single();
    if (data) await fetch();
    return data;
  };

  const update = async (id: string, patient: Omit<Patient, 'id'>) => {
    await supabase.from('patients').update({ name: patient.name, cpf: patient.cpf, phone: patient.phone, address: patient.address, notes: patient.notes }).eq('id', id);
    await fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('patients').delete().eq('id', id);
    await fetch();
  };

  return { patients, loading, save, update, remove, refetch: fetch };
}

// ── Vehicles ──
export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('*').order('plate');
    if (data) setVehicles(data.map(r => ({
      id: r.id, type: r.type as Vehicle['type'], plate: r.plate,
      modelo: (r as any).modelo || '', ano: (r as any).ano || null,
      renavam: (r as any).renavam || '', chassi: (r as any).chassi || '',
      capacity: r.capacity, status: r.status as Vehicle['status'],
      lastMaintenance: (r as any).last_maintenance || '',
      nextReview: (r as any).next_review || '',
      oilChangeKm: (r as any).oil_change_km || null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (v: Omit<Vehicle, 'id'>) => {
    await supabase.from('vehicles').insert({
      type: v.type, plate: v.plate, capacity: v.capacity, status: v.status,
      modelo: v.modelo, ano: v.ano, renavam: v.renavam, chassi: v.chassi,
      last_maintenance: v.lastMaintenance || null, next_review: v.nextReview || null, oil_change_km: v.oilChangeKm,
    } as any);
    await fetch();
  };

  const update = async (id: string, v: Omit<Vehicle, 'id'>) => {
    await supabase.from('vehicles').update({
      type: v.type, plate: v.plate, capacity: v.capacity, status: v.status,
      modelo: v.modelo, ano: v.ano, renavam: v.renavam, chassi: v.chassi,
      last_maintenance: v.lastMaintenance || null, next_review: v.nextReview || null, oil_change_km: v.oilChangeKm,
    } as any).eq('id', id);
    await fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('vehicles').delete().eq('id', id);
    await fetch();
  };

  return { vehicles, loading, save, update, remove, refetch: fetch };
}

// ── Drivers ──
export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data.map(r => ({ id: r.id, name: r.name, phone: r.phone, cnh: r.cnh, cnhCategory: r.cnh_category, cnhExpiry: r.cnh_expiry || '' })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (d: Omit<Driver, 'id'>) => {
    await supabase.from('drivers').insert({ name: d.name, phone: d.phone, cnh: d.cnh, cnh_category: d.cnhCategory, cnh_expiry: d.cnhExpiry || null });
    await fetch();
  };

  const update = async (id: string, d: Omit<Driver, 'id'>) => {
    await supabase.from('drivers').update({ name: d.name, phone: d.phone, cnh: d.cnh, cnh_category: d.cnhCategory, cnh_expiry: d.cnhExpiry || null }).eq('id', id);
    await fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('drivers').delete().eq('id', id);
    await fetch();
  };

  return { drivers, loading, save, update, remove, refetch: fetch };
}

// ── Trips ──
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data: tripsData } = await supabase.from('trips').select('*').order('date', { ascending: false });
    if (!tripsData) { setLoading(false); return; }

    const { data: passengersData } = await supabase.from('trip_passengers').select('*');
    const passMap = new Map<string, TripPassenger[]>();
    (passengersData || []).forEach(p => {
      const arr = passMap.get(p.trip_id) || [];
      arr.push({ patientId: p.patient_id, hasCompanion: p.has_companion });
      passMap.set(p.trip_id, arr);
    });

    setTrips(tripsData.map(r => ({
      id: r.id,
      date: r.date,
      departureTime: r.departure_time,
      destination: r.destination,
      consultLocation: r.consult_location,
      vehicleId: r.vehicle_id || '',
      driverId: r.driver_id || '',
      passengers: passMap.get(r.id) || [],
      notes: r.notes,
      status: r.status as Trip['status'],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (t: Omit<Trip, 'id'>) => {
    const { data } = await supabase.from('trips').insert({
      date: t.date, departure_time: t.departureTime, destination: t.destination,
      consult_location: t.consultLocation, vehicle_id: t.vehicleId || null,
      driver_id: t.driverId || null, notes: t.notes, status: t.status,
    }).select().single();
    if (data && t.passengers.length > 0) {
      await supabase.from('trip_passengers').insert(
        t.passengers.map(p => ({ trip_id: data.id, patient_id: p.patientId, has_companion: p.hasCompanion }))
      );
    }
    await fetch();
  };

  const update = async (id: string, t: Omit<Trip, 'id'>) => {
    await supabase.from('trips').update({
      date: t.date, departure_time: t.departureTime, destination: t.destination,
      consult_location: t.consultLocation, vehicle_id: t.vehicleId || null,
      driver_id: t.driverId || null, notes: t.notes, status: t.status,
    }).eq('id', id);
    // Replace passengers
    await supabase.from('trip_passengers').delete().eq('trip_id', id);
    if (t.passengers.length > 0) {
      await supabase.from('trip_passengers').insert(
        t.passengers.map(p => ({ trip_id: id, patient_id: p.patientId, has_companion: p.hasCompanion }))
      );
    }
    await fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('trips').delete().eq('id', id);
    await fetch();
  };

  return { trips, loading, save, update, remove, refetch: fetch };
}
