import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, Vehicle, Driver, Trip, TripPassenger, Maintenance, FixedTrip } from '@/types';

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
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (v: Omit<Vehicle, 'id'>) => {
    await supabase.from('vehicles').insert({
      type: v.type, plate: v.plate, capacity: v.capacity, status: v.status,
      modelo: v.modelo, ano: v.ano, renavam: v.renavam, chassi: v.chassi,
    } as any);
    await fetch();
  };

  const update = async (id: string, v: Omit<Vehicle, 'id'>) => {
    await supabase.from('vehicles').update({
      type: v.type, plate: v.plate, capacity: v.capacity, status: v.status,
      modelo: v.modelo, ano: v.ano, renavam: v.renavam, chassi: v.chassi,
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
    // Try full table first (admin/gestor). If RLS blocks, fall back to summary function (visualizador).
    const { data, error } = await supabase.from('drivers').select('*').order('name');
    if (data && !error) {
      setDrivers(data.map(r => ({ id: r.id, name: r.name, cpf: (r as any).cpf || '', phone: r.phone, cnh: r.cnh, cnhCategory: r.cnh_category, cnhExpiry: r.cnh_expiry || '' })));
    } else {
      // Visualizador fallback – only id & name via security definer function
      const { data: summary } = await supabase.rpc('get_drivers_summary');
      if (summary) {
        setDrivers((summary as any[]).map(r => ({ id: r.id, name: r.name, cpf: '', phone: '', cnh: '', cnhCategory: '', cnhExpiry: '' })));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (d: Omit<Driver, 'id'>) => {
    await supabase.from('drivers').insert({ name: d.name, cpf: d.cpf, phone: d.phone, cnh: d.cnh, cnh_category: d.cnhCategory, cnh_expiry: d.cnhExpiry || null } as any);
    await fetch();
  };

  const update = async (id: string, d: Omit<Driver, 'id'>) => {
    await supabase.from('drivers').update({ name: d.name, cpf: d.cpf, phone: d.phone, cnh: d.cnh, cnh_category: d.cnhCategory, cnh_expiry: d.cnhExpiry || null } as any).eq('id', id);
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
      arr.push({
        patientId: p.patient_id,
        hasCompanion: p.has_companion,
        boardingLocation: (p as any).boarding_location || '',
        consultTime: (p as any).consult_time || '',
        consultLocation: (p as any).consult_location || '',
      });
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
      fixedTripId: (r as any).fixed_trip_id || '',
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

// ── Maintenances ──
export function useMaintenances() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('maintenances').select('*').order('date', { ascending: false });
    if (data) setMaintenances((data as any[]).map(r => ({
      id: r.id,
      vehicleId: r.vehicle_id,
      date: r.date,
      type: r.type,
      partReplaced: r.part_replaced || '',
      description: r.description || '',
      cost: Number(r.cost) || 0,
      workshop: r.workshop || '',
      nextReviewDate: r.next_review_date || '',
      nextReviewKm: r.next_review_km || null,
      vehicleKm: r.vehicle_km || null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (m: Omit<Maintenance, 'id'>) => {
    await supabase.from('maintenances').insert({
      vehicle_id: m.vehicleId, date: m.date, type: m.type,
      part_replaced: m.partReplaced, description: m.description,
      cost: m.cost, workshop: m.workshop,
      next_review_date: m.nextReviewDate || null,
      next_review_km: m.nextReviewKm, vehicle_km: m.vehicleKm,
    } as any);
    await fetch();
  };

  const update = async (id: string, m: Omit<Maintenance, 'id'>) => {
    await supabase.from('maintenances').update({
      vehicle_id: m.vehicleId, date: m.date, type: m.type,
      part_replaced: m.partReplaced, description: m.description,
      cost: m.cost, workshop: m.workshop,
      next_review_date: m.nextReviewDate || null,
      next_review_km: m.nextReviewKm, vehicle_km: m.vehicleKm,
    } as any).eq('id', id);
    await fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('maintenances').delete().eq('id', id);
    await fetch();
  };

  return { maintenances, loading, save, update, remove, refetch: fetch };
}

export interface RegistroHoras {
  idRegistro: number;
  idMotorista: string; // UUID
  tipo: 'credito' | 'debito';
  quantidadeHoras: number;
  descricao: string;
  dataRegistro: string;
  createdAt?: string;
}

export function useBancoHoras(driverId?: string) {
  const [registros, setRegistros] = useState<RegistroHoras[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Função de Busca (Fetch)
  const fetch = useCallback(async () => {
    setLoading(true);
    
    // Inicia a query ordenando do mais recente para o mais antigo
    let query = supabase
      .from('banco_horas')
      .select('*')
      .order('data_registro', { ascending: false })
      .order('created_at', { ascending: false });

    // Se passarmos o ID de um motorista específico, ele filtra a busca
    if (driverId) {
      query = query.eq('id_motorista', driverId);
    }

    const { data, error } = await query;

    if (data && !error) {
      // Mapeia os dados do banco (snake_case) para o formato do TypeScript (camelCase)
      setRegistros(data.map(r => ({
        idRegistro: r.id_registro,
        idMotorista: r.id_motorista,
        tipo: r.tipo as 'credito' | 'debito',
        quantidadeHoras: Number(r.quantidade_horas), // Garante que volta como número
        descricao: r.descricao,
        dataRegistro: r.data_registro,
        createdAt: r.created_at,
      })));
    } else {
      // Se der erro ou for bloqueado por RLS, zera a lista
      setRegistros([]);
      console.error("Erro ao buscar banco de horas:", error);
    }
    
    setLoading(false);
  }, [driverId]); // Refaz a função se o ID do motorista mudar

  useEffect(() => { 
    fetch(); 
  }, [fetch]);

  // 3. Função para Salvar um novo registro
  const save = async (r: Omit<RegistroHoras, 'idRegistro' | 'createdAt'>) => {
    // Mapeia do TypeScript (camelCase) para o Banco (snake_case)
    await supabase.from('banco_horas').insert({
      id_motorista: r.idMotorista,
      tipo: r.tipo,
      quantidade_horas: r.quantidadeHoras,
      descricao: r.descricao,
      data_registro: r.dataRegistro
    });
    await fetch(); // Recarrega a lista após salvar
  };

  // 4. Função para Atualizar um registro existente
  const update = async (id: number, r: Omit<RegistroHoras, 'idRegistro' | 'createdAt'>) => {
    await supabase.from('banco_horas').update({
      id_motorista: r.idMotorista,
      tipo: r.tipo,
      quantidade_horas: r.quantidadeHoras,
      descricao: r.descricao,
      data_registro: r.dataRegistro
    }).eq('id_registro', id);
    await fetch();
  };

  // 5. Função para Deletar um registro (caso tenham lançado errado)
  const remove = async (id: number) => {
    await supabase.from('banco_horas').delete().eq('id_registro', id);
    await fetch();
  };

  return { registros, loading, save, update, remove, refetch: fetch };
}