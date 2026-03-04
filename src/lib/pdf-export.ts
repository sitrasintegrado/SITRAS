import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip, Vehicle, Driver, Patient } from '@/types';
import { getVehicles, getDrivers, getPatients } from './store';

export function exportTripsPDF(trips: Trip[], title: string) {
  const doc = new jsPDF();
  const vehicles = getVehicles();
  const drivers = getDrivers();
  const patients = getPatients();

  doc.setFontSize(16);
  doc.text('SITRAS Saúde', 14, 15);
  doc.setFontSize(11);
  doc.text(title, 14, 23);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 29);

  let y = 35;

  trips.forEach((trip) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const driver = drivers.find(d => d.id === trip.driverId);
    const totalSeats = trip.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);

    doc.setFontSize(10);
    doc.setFont(undefined!, 'bold');
    doc.text(`${trip.date} - ${trip.departureTime} | ${trip.destination} - ${trip.consultLocation}`, 14, y);
    y += 5;
    doc.setFont(undefined!, 'normal');
    doc.text(`Veículo: ${vehicle?.type} ${vehicle?.plate || ''} | Motorista: ${driver?.name || ''} | Status: ${trip.status}`, 14, y);
    y += 5;
    doc.text(`Ocupação: ${totalSeats}/${vehicle?.capacity || '?'}`, 14, y);
    y += 3;

    const rows = trip.passengers.map(p => {
      const pat = patients.find(pt => pt.id === p.patientId);
      return [pat?.name || '—', pat?.cpf || '—', pat?.phone || '—', p.hasCompanion ? 'Sim' : 'Não'];
    });

    autoTable(doc, {
      startY: y,
      head: [['Paciente', 'CPF', 'Telefone', 'Acompanhante']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8 },
      margin: { left: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 260) { doc.addPage(); y = 15; }
  });

  doc.save(`sitras_${Date.now()}.pdf`);
}
