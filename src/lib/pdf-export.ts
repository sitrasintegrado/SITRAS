import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip, Vehicle, Driver, Patient } from '@/types';

// ── helpers ──
function genCode() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REL-${ts}-${rand}`;
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface ReportOptions {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  patients: Patient[];
  title: string;
  subtitle?: string;
  userName: string;
}

function addHeader(doc: jsPDF, title: string, subtitle: string, code: string, userName: string) {
  const w = doc.internal.pageSize.getWidth();

  // Blue header bar
  doc.setFillColor(30, 64, 120);
  doc.rect(0, 0, w, 32, 'F');

  // Accent line
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 32, w, 2, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SITRAS Saúde', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema Integrado de Transporte Sanitário', 14, 20);

  // Report title right-aligned
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, w - 14, 14, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${code}`, w - 14, 20, { align: 'right' });
  doc.text(`Emitido: ${new Date().toLocaleString('pt-BR')}`, w - 14, 25, { align: 'right' });
  doc.text(`Usuário: ${userName}`, w - 14, 30, { align: 'right' });

  // Subtitle
  if (subtitle) {
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(subtitle, 14, 42);
  }

  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number, code: string, totals?: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Footer line
  doc.setDrawColor(30, 64, 120);
  doc.setLineWidth(0.5);
  doc.line(14, h - 25, w - 14, h - 25);

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);

  if (totals) {
    doc.text(totals, 14, h - 20);
  }

  doc.text(`${code}`, 14, h - 12);
  doc.text('SITRAS Saúde — Documento gerado eletronicamente', w / 2, h - 12, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, w - 14, h - 12, { align: 'right' });

  // Signature area
  doc.setDrawColor(0, 0, 0);
  doc.line(w - 80, h - 30, w - 14, h - 30);
  doc.setFontSize(6);
  doc.text('Assinatura do responsável', w - 47, h - 27, { align: 'center' });
}

function buildTripRows(
  trips: Trip[],
  vehicles: Vehicle[],
  drivers: Driver[],
  patients: Patient[],
) {
  return trips.map((trip, i) => {
    const v = vehicles.find(x => x.id === trip.vehicleId);
    const d = drivers.find(x => x.id === trip.driverId);
    const totalPax = trip.passengers.length;
    const totalAcomp = trip.passengers.filter(p => p.hasCompanion).length;
    return [
      String(i + 1),
      fmtDate(trip.date),
      trip.departureTime || '—',
      trip.destination || '—',
      trip.consultLocation || '—',
      v ? `${v.type} ${v.plate}` : '—',
      d?.name || '—',
      String(totalPax),
      String(totalAcomp),
      trip.status,
    ];
  });
}

const tripHead = [['#', 'Data', 'Hora', 'Destino', 'Local Consulta', 'Veículo', 'Motorista', 'Pac.', 'Acomp.', 'Status']];

function buildDoc(opts: ReportOptions, extraSubtitle?: string): void {
  const { trips, vehicles, drivers, patients, title, subtitle, userName } = opts;
  const code = genCode();
  const doc = new jsPDF({ orientation: 'landscape' });

  const fullSubtitle = [subtitle, extraSubtitle].filter(Boolean).join(' — ');

  addHeader(doc, title, fullSubtitle, code, userName);

  const rows = buildTripRows(trips, vehicles, drivers, patients);

  autoTable(doc, {
    startY: fullSubtitle ? 48 : 40,
    head: tripHead,
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 120], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2 },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    margin: { left: 14, right: 14, bottom: 35 },
    didDrawPage: () => {},
  });

  // Totals summary
  const totalPax = trips.reduce((s, t) => s + t.passengers.length, 0);
  const totalAcomp = trips.reduce((s, t) => s + t.passengers.filter(p => p.hasCompanion).length, 0);
  const totalsStr = `Total de viagens: ${trips.length} | Pacientes transportados: ${totalPax} | Acompanhantes: ${totalAcomp}`;

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, code, i === totalPages ? totalsStr : undefined);
  }

  doc.save(`sitras_${code}.pdf`);
}

// ── Detailed passenger table for single-trip reports ──
function buildPassengerSection(
  doc: jsPDF,
  trip: Trip,
  patients: Patient[],
  startY: number,
): number {
  const rows = trip.passengers.map((p, i) => {
    const pat = patients.find(pt => pt.id === p.patientId);
    return [String(i + 1), pat?.name || '—', pat?.cpf || '—', pat?.phone || '—', p.hasCompanion ? 'Sim' : 'Não'];
  });

  autoTable(doc, {
    startY,
    head: [['#', 'Paciente', 'CPF', 'Telefone', 'Acompanhante']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [34, 139, 34], fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2 },
    margin: { left: 14, right: 14, bottom: 35 },
  });

  return (doc as any).lastAutoTable.finalY + 5;
}

// ══════════════════════════════════════════════
// PUBLIC EXPORT FUNCTIONS
// ══════════════════════════════════════════════

/** Relatório Diário */
export function exportDailyReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, date: string,
) {
  const filtered = trips.filter(t => t.date === date);
  if (!filtered.length) return false;
  buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório Diário', subtitle: `Data: ${fmtDate(date)}`, userName });
  return true;
}

/** Relatório por Veículo */
export function exportVehicleReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, vehicleId: string,
) {
  const filtered = trips.filter(t => t.vehicleId === vehicleId);
  if (!filtered.length) return false;
  const v = vehicles.find(x => x.id === vehicleId);
  buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Veículo', subtitle: `${v?.type} ${v?.modelo} — Placa: ${v?.plate}`, userName });
  return true;
}

/** Relatório por Motorista */
export function exportDriverReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, driverId: string,
) {
  const filtered = trips.filter(t => t.driverId === driverId);
  if (!filtered.length) return false;
  const d = drivers.find(x => x.id === driverId);
  buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Motorista', subtitle: `Motorista: ${d?.name} — CNH: ${d?.cnh}`, userName });
  return true;
}

/** Relatório por Paciente */
export function exportPatientReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, patientId: string,
) {
  const filtered = trips.filter(t => t.passengers.some(p => p.patientId === patientId));
  if (!filtered.length) return false;
  const pat = patients.find(x => x.id === patientId);
  buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Paciente', subtitle: `Paciente: ${pat?.name} — CPF: ${pat?.cpf}`, userName });
  return true;
}

/** Relatório por Período */
export function exportPeriodReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, dateFrom: string, dateTo: string,
) {
  const filtered = trips.filter(t => t.date >= dateFrom && t.date <= dateTo);
  if (!filtered.length) return false;
  buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Período', subtitle: `Período: ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`, userName });
  return true;
}

/** Relatório Gerencial Consolidado */
export function exportConsolidatedReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, dateFrom: string, dateTo: string,
) {
  const filtered = trips.filter(t => t.date >= dateFrom && t.date <= dateTo);
  if (!filtered.length) return false;

  const code = genCode();
  const doc = new jsPDF({ orientation: 'landscape' });
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, 'Relatório Gerencial Consolidado', `Período: ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`, code, userName);

  let y = 50;

  // Summary cards
  const totalTrips = filtered.length;
  const confirmedTrips = filtered.filter(t => t.status === 'Confirmada').length;
  const concludedTrips = filtered.filter(t => t.status === 'Concluída').length;
  const cancelledTrips = filtered.filter(t => t.status === 'Cancelada').length;
  const totalPax = filtered.reduce((s, t) => s + t.passengers.length, 0);
  const totalAcomp = filtered.reduce((s, t) => s + t.passengers.filter(p => p.hasCompanion).length, 0);

  // Stats table
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de Viagens', String(totalTrips)],
      ['Confirmadas', String(confirmedTrips)],
      ['Concluídas', String(concludedTrips)],
      ['Canceladas', String(cancelledTrips)],
      ['Total de Pacientes Transportados', String(totalPax)],
      ['Total de Acompanhantes', String(totalAcomp)],
      ['Veículos Utilizados', String(new Set(filtered.map(t => t.vehicleId).filter(Boolean)).size)],
      ['Motoristas Atuantes', String(new Set(filtered.map(t => t.driverId).filter(Boolean)).size)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 120], fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    margin: { left: 14, right: w / 2 + 10, bottom: 35 },
  });

  // Trips by vehicle
  const byVehicle = new Map<string, number>();
  filtered.forEach(t => {
    const v = vehicles.find(x => x.id === t.vehicleId);
    const label = v ? `${v.type} ${v.plate}` : 'Sem veículo';
    byVehicle.set(label, (byVehicle.get(label) || 0) + 1);
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Veículo', 'Viagens']],
    body: Array.from(byVehicle.entries()).sort((a, b) => b[1] - a[1]),
    theme: 'striped',
    headStyles: { fillColor: [34, 139, 34], fontSize: 8 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14, bottom: 35 },
  });

  // Trips by driver
  const byDriver = new Map<string, number>();
  filtered.forEach(t => {
    const d = drivers.find(x => x.id === t.driverId);
    const label = d?.name || 'Sem motorista';
    byDriver.set(label, (byDriver.get(label) || 0) + 1);
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Motorista', 'Viagens']],
    body: Array.from(byDriver.entries()).sort((a, b) => b[1] - a[1]),
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 120], fontSize: 8 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14, bottom: 35 },
  });

  // Footers
  const totalPages = doc.getNumberOfPages();
  const totalsStr = `Total: ${totalTrips} viagens | ${totalPax} pacientes | ${totalAcomp} acompanhantes`;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, code, i === totalPages ? totalsStr : undefined);
  }

  doc.save(`sitras_${code}.pdf`);
  return true;
}

// Legacy compat
export function exportTripsPDF(trips: Trip[], title: string) {
  buildDoc({ trips, vehicles: [], drivers: [], patients: [], title, subtitle: '', userName: 'Sistema' });
}
