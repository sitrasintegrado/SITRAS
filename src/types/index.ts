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
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  date: string;
  type: 'preventiva' | 'corretiva' | 'emergencial';
  partReplaced: string;
  description: string;
  cost: number;
  workshop: string;
  nextReviewDate: string;
  nextReviewKm: number | null;
  vehicleKm: number | null;
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
  status: 'Confirmada' | 'Cancelada' | 'Concluída' | 'Pendente';
}

const emptyTrip: Omit<Trip, 'id'> = {
  date: new Date().toISOString().split('T')[0],
  departureTime: '06:00',
  destination: '',
  consultLocation: '',
  vehicleId: '',
  driverId: '',
  passengers: [],
  notes: '',
  status: 'Confirmada',
};
export interface DialogAgendamento {
  form: typeof emptyTrip;
  dialogOpen: boolean;
  setDialogOpen: (boolean) => void;
  setForm: (form: typeof emptyTrip) => void;
  currentVehicle: Vehicle;
  editId: string | null;
  isFull: boolean;
  usedSeats: number;
}
