export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  address: string;
  notes: string;
}

export interface Vehicle {
  id: string;
  type: 'Carro' | 'Van' | 'Ônibus';
  plate: string;
  modelo: string;
  ano: number | null;
  renavam: string;
  chassi: string;
  capacity: number;
  status: 'Ativo' | 'Manutenção' | 'Inativo';
  lastMaintenance: string;
  nextReview: string;
  oilChangeKm: number | null;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  cnh: string;
  cnhCategory: string;
  cnhExpiry: string; // ISO date
}

export interface TripPassenger {
  patientId: string;
  hasCompanion: boolean;
}

export interface Trip {
  id: string;
  date: string; // ISO date
  departureTime: string;
  destination: string;
  consultLocation: string;
  vehicleId: string;
  driverId: string;
  passengers: TripPassenger[];
  notes: string;
  status: 'Confirmada' | 'Cancelada' | 'Concluída';
}
