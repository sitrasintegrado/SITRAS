import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip, Vehicle, Driver, Patient, Maintenance } from '@/types';
import logoUrl from '@/assets/logo.png';

// ── Logo cache ──
let logoBase64: string | null = null;

async function getLogoBase64(): Promise<string | null> {
  if (logoBase64) return logoBase64;
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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

function addHeader(doc: jsPDF, title: string, subtitle: string, code: string, userName: string, logo: string | null) {
  const w = doc.internal.pageSize.getWidth();

  // Blue header bar
  doc.setFillColor(30, 64, 120);
  doc.rect(0, 0, w, 32, 'F');

  // Accent line
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 32, w, 2, 'F');

  // Logo
  const textStartX = logo ? 30 : 14;
  if (logo) {
    try {
      // White circle background for logo
      doc.setFillColor(255, 255, 255);
      doc.circle(16, 16, 10, 'F');
      doc.addImage(logo, 'PNG', 7, 7, 18, 18);
    } catch {
      // fallback: no logo
    }
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SITRAS Saúde', textStartX, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema Integrado de Transporte da Saúde', textStartX, 20);

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

  doc.setDrawColor(30, 64, 120);
  doc.setLineWidth(0.5);
  doc.line(14, h - 25, w - 14, h - 25);

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);

  if (totals) {
    doc.text(totals, 14, h - 20);
  }

  doc.text(`${code}`, 14, h - 12);
  doc.text('SITRAS — Documento gerado eletronicamente', w / 2, h - 12, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, w - 14, h - 12, { align: 'right' });

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

async function buildDoc(opts: ReportOptions, extraSubtitle?: string): Promise<void> {
  const { trips, vehicles, drivers, patients, title, subtitle, userName } = opts;
  const code = genCode();
  const doc = new jsPDF({ orientation: 'landscape' });
  const logo = await getLogoBase64();

  const fullSubtitle = [subtitle, extraSubtitle].filter(Boolean).join(' — ');

  addHeader(doc, title, fullSubtitle, code, userName, logo);

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

  const totalPax = trips.reduce((s, t) => s + t.passengers.length, 0);
  const totalAcomp = trips.reduce((s, t) => s + t.passengers.filter(p => p.hasCompanion).length, 0);
  const totalsStr = `Total de viagens: ${trips.length} | Pacientes transportados: ${totalPax} | Acompanhantes: ${totalAcomp}`;

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, code, i === totalPages ? totalsStr : undefined);
  }

  doc.save(`sitras_${code}.pdf`);
}

// ══════════════════════════════════════════════
// PUBLIC EXPORT FUNCTIONS
// ══════════════════════════════════════════════

export async function exportDailyReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, date: string,
) {
  const filtered = trips.filter(t => t.date === date);
  if (!filtered.length) return false;
  await buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório Diário', subtitle: `Data: ${fmtDate(date)}`, userName });
  return true;
}

export async function exportVehicleReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, vehicleId: string,
) {
  const filtered = trips.filter(t => t.vehicleId === vehicleId);
  if (!filtered.length) return false;
  const v = vehicles.find(x => x.id === vehicleId);
  await buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Veículo', subtitle: `${v?.type} ${v?.modelo} — Placa: ${v?.plate}`, userName });
  return true;
}

export async function exportDriverReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, driverId: string,
) {
  const filtered = trips.filter(t => t.driverId === driverId);
  if (!filtered.length) return false;
  const d = drivers.find(x => x.id === driverId);
  await buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Motorista', subtitle: `Motorista: ${d?.name} — CNH: ${d?.cnh}`, userName });
  return true;
}

export async function exportPatientReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, patientId: string,
) {
  const filtered = trips.filter(t => t.passengers.some(p => p.patientId === patientId));
  if (!filtered.length) return false;
  const pat = patients.find(x => x.id === patientId);
  await buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Paciente', subtitle: `Paciente: ${pat?.name} — CPF: ${pat?.cpf}`, userName });
  return true;
}

export async function exportPeriodReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, dateFrom: string, dateTo: string,
) {
  const filtered = trips.filter(t => t.date >= dateFrom && t.date <= dateTo);
  if (!filtered.length) return false;
  await buildDoc({ trips: filtered, vehicles, drivers, patients, title: 'Relatório por Período', subtitle: `Período: ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`, userName });
  return true;
}

export async function exportConsolidatedReport(
  trips: Trip[], vehicles: Vehicle[], drivers: Driver[], patients: Patient[], userName: string, dateFrom: string, dateTo: string,
) {
  const filtered = trips.filter(t => t.date >= dateFrom && t.date <= dateTo);
  if (!filtered.length) return false;

  const code = genCode();
  const doc = new jsPDF({ orientation: 'landscape' });
  const w = doc.internal.pageSize.getWidth();
  const logo = await getLogoBase64();

  addHeader(doc, 'Relatório Gerencial Consolidado', `Período: ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`, code, userName, logo);

  let y = 50;

  const totalTrips = filtered.length;
  const confirmedTrips = filtered.filter(t => t.status === 'Confirmada').length;
  const concludedTrips = filtered.filter(t => t.status === 'Concluída').length;
  const cancelledTrips = filtered.filter(t => t.status === 'Cancelada').length;
  const totalPax = filtered.reduce((s, t) => s + t.passengers.length, 0);
  const totalAcomp = filtered.reduce((s, t) => s + t.passengers.filter(p => p.hasCompanion).length, 0);

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

  const totalPages = doc.getNumberOfPages();
  const totalsStr = `Total: ${totalTrips} viagens | ${totalPax} pacientes | ${totalAcomp} acompanhantes`;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, code, i === totalPages ? totalsStr : undefined);
  }

  doc.save(`sitras_${code}.pdf`);
  return true;
}

// ══════════════════════════════════════════════
// MAINTENANCE REPORT
// ══════════════════════════════════════════════

export async function exportMaintenanceReport(
  maintenances: Maintenance[], vehicles: Vehicle[], userName: string, dateFrom: string, dateTo: string,
) {
  const filtered = maintenances.filter(m => m.date >= dateFrom && m.date <= dateTo);
  if (!filtered.length) return false;

  const code = genCode();
  const doc = new jsPDF({ orientation: 'landscape' });
  const logo = await getLogoBase64();

  addHeader(doc, 'Relatório de Manutenção da Frota', `Período: ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}`, code, userName, logo);

  // ── Summary indicators ──
  const totalCost = filtered.reduce((s, m) => s + (m.cost || 0), 0);
  const byType = { preventiva: 0, corretiva: 0, emergencial: 0 };
  filtered.forEach(m => { byType[m.type] = (byType[m.type] || 0) + 1; });
  const uniqueVehicles = new Set(filtered.map(m => m.vehicleId)).size;

  autoTable(doc, {
    startY: 48,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de Manutenções', String(filtered.length)],
      ['Preventivas', String(byType.preventiva)],
      ['Corretivas', String(byType.corretiva)],
      ['Emergenciais', String(byType.emergencial)],
      ['Veículos Atendidos', String(uniqueVehicles)],
      ['Custo Total', `R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 120], fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    margin: { left: 14, right: 160, bottom: 35 },
  });

  // ── Detailed list ──
  const rows = filtered
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m, i) => {
      const v = vehicles.find(x => x.id === m.vehicleId);
      const typeLabel = m.type === 'preventiva' ? 'Preventiva' : m.type === 'corretiva' ? 'Corretiva' : 'Emergencial';
      return [
        String(i + 1),
        fmtDate(m.date),
        v ? `${v.type} ${v.plate}` : '—',
        typeLabel,
        m.partReplaced || '—',
        m.description || '—',
        m.workshop || '—',
        m.vehicleKm ? `${m.vehicleKm.toLocaleString('pt-BR')} km` : '—',
        m.cost ? `R$ ${m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
        m.nextReviewDate ? fmtDate(m.nextReviewDate) : '—',
      ];
    });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['#', 'Data', 'Veículo', 'Tipo', 'Peça', 'Descrição', 'Oficina', 'KM', 'Custo', 'Próx. Revisão']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 120], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2 },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    margin: { left: 14, right: 14, bottom: 35 },
  });

  // ── Cost by vehicle ──
  const costByVehicle = new Map<string, { count: number; cost: number }>();
  filtered.forEach(m => {
    const v = vehicles.find(x => x.id === m.vehicleId);
    const label = v ? `${v.type} ${v.plate}` : 'Sem veículo';
    const entry = costByVehicle.get(label) || { count: 0, cost: 0 };
    entry.count++;
    entry.cost += m.cost || 0;
    costByVehicle.set(label, entry);
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Veículo', 'Manutenções', 'Custo Total']],
    body: Array.from(costByVehicle.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([label, data]) => [label, String(data.count), `R$ ${data.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]),
    theme: 'striped',
    headStyles: { fillColor: [34, 139, 34], fontSize: 8 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14, bottom: 35 },
  });

  const totalPages = doc.getNumberOfPages();
  const totalsStr = `Total: ${filtered.length} manutenções | Custo: R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Veículos: ${uniqueVehicles}`;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, code, i === totalPages ? totalsStr : undefined);
  }

  doc.save(`sitras_${code}.pdf`);
  return true;
}

export async function exportMaintenanceByVehicleReport(
  maintenances: Maintenance[], vehicles: Vehicle[], userName: string, vehicleId: string,
) {
  const filtered = maintenances.filter(m => m.vehicleId === vehicleId);
  if (!filtered.length) return false;

  const v = vehicles.find(x => x.id === vehicleId);
  const vLabel = v ? `${v.type} ${v.modelo} — Placa: ${v.plate}` : 'Veículo não encontrado';

  const code = genCode();
  const doc = new jsPDF({ orientation: 'landscape' });
  const logo = await getLogoBase64();

  addHeader(doc, 'Manutenção por Veículo', vLabel, code, userName, logo);

  const totalCost = filtered.reduce((s, m) => s + (m.cost || 0), 0);
  const byType = { preventiva: 0, corretiva: 0, emergencial: 0 };
  filtered.forEach(m => { byType[m.type] = (byType[m.type] || 0) + 1; });

  autoTable(doc, {
    startY: 48,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de Manutenções', String(filtered.length)],
      ['Preventivas', String(byType.preventiva)],
      ['Corretivas', String(byType.corretiva)],
      ['Emergenciais', String(byType.emergencial)],
      ['Custo Total', `R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 120], fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    margin: { left: 14, right: 160, bottom: 35 },
  });

  const rows = filtered
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m, i) => {
      const typeLabel = m.type === 'preventiva' ? 'Preventiva' : m.type === 'corretiva' ? 'Corretiva' : 'Emergencial';
      return [
        String(i + 1),
        fmtDate(m.date),
        typeLabel,
        m.partReplaced || '—',
        m.description || '—',
        m.workshop || '—',
        m.vehicleKm ? `${m.vehicleKm.toLocaleString('pt-BR')} km` : '—',
        m.cost ? `R$ ${m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
        m.nextReviewDate ? fmtDate(m.nextReviewDate) : '—',
      ];
    });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['#', 'Data', 'Tipo', 'Peça', 'Descrição', 'Oficina', 'KM', 'Custo', 'Próx. Revisão']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 120], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2 },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    margin: { left: 14, right: 14, bottom: 35 },
  });

  const totalPages = doc.getNumberOfPages();
  const totalsStr = `Total: ${filtered.length} manutenções | Custo: R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, code, i === totalPages ? totalsStr : undefined);
  }

  doc.save(`sitras_${code}.pdf`);
  return true;
}

// ══════════════════════════════════════════════
// DRIVER SCHEDULE PDF (Agenda do Motorista)
// ══════════════════════════════════════════════

interface DriverScheduleData {
  driverName: string;
  vehicleLabel: string;
  date: string;
  trips: {
    departureTime: string;
    destination: string;
    consultLocation: string;
    passengers: { name: string; hasCompanion: boolean }[];
    notes: string;
    status: string;
  }[];
  userName: string;
}

export async function exportDriverSchedulePDF(data: DriverScheduleData) {
  if (!data.trips.length) return false;

  const code = genCode();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const logo = await getLogoBase64();

  addHeader(doc, 'Agenda do Motorista', `Data: ${fmtDate(data.date)} — Motorista: ${data.driverName} — Veículo: ${data.vehicleLabel}`, code, data.userName, logo);

  // Trip table
  const rows = data.trips.map((t, i) => {
    const paxNames = t.passengers.map(p => p.name).join(', ') || '—';
    const companions = t.passengers.filter(p => p.hasCompanion).map(p => p.name).join(', ') || 'Nenhum';
    return [
      String(i + 1),
      t.departureTime || '—',
      paxNames,
      t.destination || '—',
      t.consultLocation || '—',
      companions,
      t.notes || '—',
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Horário', 'Paciente(s)', 'Destino', 'Local de Saída', 'Acompanhante(s)', 'Observações']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 120], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      6: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14, bottom: 60 },
  });

  // Signature area on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();

    if (i === totalPages) {
      const sigY = Math.max((doc as any).lastAutoTable?.finalY + 25 || h - 55, h - 55);

      // Signature lines
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.3);

      // Driver signature
      doc.line(14, sigY, 90, sigY);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Assinatura do Motorista', 52, sigY + 4, { align: 'center' });
      doc.setFontSize(7);
      doc.text(data.driverName, 52, sigY + 8, { align: 'center' });

      // Fleet manager signature
      doc.line(w - 90, sigY, w - 14, sigY);
      doc.setFontSize(8);
      doc.text('Responsável da Frota', w - 52, sigY + 4, { align: 'center' });
    }

    // Footer
    doc.setDrawColor(30, 64, 120);
    doc.setLineWidth(0.5);
    const h2 = doc.internal.pageSize.getHeight();
    doc.line(14, h2 - 18, w - 14, h2 - 18);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(code, 14, h2 - 12);
    doc.text('SITRAS — Documento gerado eletronicamente', w / 2, h2 - 12, { align: 'center' });
    doc.text(`Página ${i} de ${totalPages}`, w - 14, h2 - 12, { align: 'right' });
  }

  doc.save(`sitras_agenda_${code}.pdf`);
  return true;
}

// Legacy compat
export async function exportTripsPDF(trips: Trip[], title: string) {
  await buildDoc({ trips, vehicles: [], drivers: [], patients: [], title, subtitle: '', userName: 'Sistema' });
}
