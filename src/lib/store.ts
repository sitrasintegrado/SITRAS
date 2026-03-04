import { Patient, Vehicle, Driver, Trip } from '@/types';

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Patients
export const getPatients = () => load<Patient>('sitras_patients');
export const savePatients = (d: Patient[]) => save('sitras_patients', d);

// Vehicles
export const getVehicles = () => load<Vehicle>('sitras_vehicles');
export const saveVehicles = (d: Vehicle[]) => save('sitras_vehicles', d);

// Drivers
export const getDrivers = () => load<Driver>('sitras_drivers');
export const saveDrivers = (d: Driver[]) => save('sitras_drivers', d);

// Trips
export const getTrips = () => load<Trip>('sitras_trips');
export const saveTrips = (d: Trip[]) => save('sitras_trips', d);

export function generateId() {
  return crypto.randomUUID();
}
