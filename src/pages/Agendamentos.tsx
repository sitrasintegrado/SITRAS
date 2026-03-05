import { useState, useMemo } from 'react';
import { Trip, TripPassenger } from '@/types';
import { useTrips, useVehicles, useDrivers, usePatients } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, AlertTriangle, Ban, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { exportDriverSchedulePDF } from '@/lib/pdf-export';

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

/** Occupancy bar component */
const OccupancyBar = ({ used, total }: { used: number; total: number }) => {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color =
    pct >= 100 ? 'bg-destructive' :
    pct >= 75 ? 'bg-warning' :
    'bg-secondary';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Ocupação</span>
        <span className="font-semibold">
          {used}/{total} vagas ({pct}%)
          {pct >= 100 && <span className="ml-1 text-destructive font-bold">LOTADO</span>}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};

const Agendamentos = () => {
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = useAuth();
  const { trips, save, update, remove } = useTrips();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { patients } = usePatients();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTrip);
  const [dateFilter, setDateFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');

  const filtered = useMemo(() => {
    return trips.filter(t => {
      if (dateFilter && t.date !== dateFilter) return false;
      if (vehicleFilter !== 'all' && t.vehicleId !== vehicleFilter) return false;
      if (driverFilter !== 'all' && t.driverId !== driverFilter) return false;
      return true;
    });
  }, [trips, dateFilter, vehicleFilter, driverFilter]);

  const currentVehicle = vehicles.find(v => v.id === form.vehicleId);
  const usedSeats = form.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
  const available = currentVehicle ? currentVehicle.capacity - usedSeats : 0;
  const isFull = currentVehicle ? usedSeats >= currentVehicle.capacity : false;

  // Calculate occupancy for each vehicle across all trips on the same date
  const vehicleOccupancyOnDate = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach(t => {
      if (t.date === form.date && t.status !== 'Cancelada' && t.id !== editId) {
        const seats = t.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
        map.set(t.vehicleId, (map.get(t.vehicleId) || 0) + seats);
      }
    });
    return map;
  }, [trips, form.date, editId]);

  const openNew = () => { setEditId(null); setForm(emptyTrip); setDialogOpen(true); };
  const openEdit = (t: Trip) => { setEditId(t.id); setForm({ ...t }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.destination || !form.vehicleId || !form.driverId) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    if (currentVehicle && usedSeats > currentVehicle.capacity) {
      toast({ title: 'Capacidade do veículo excedida!', description: `Máximo: ${currentVehicle.capacity} vagas`, variant: 'destructive' });
      return;
    }
    if (editId) {
      await update(editId, form);
    } else {
      await save(form);
    }
    setDialogOpen(false);
    toast({ title: editId ? 'Viagem atualizada' : 'Viagem criada' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast({ title: 'Viagem excluída' });
  };

  const togglePassenger = (patientId: string) => {
    const exists = form.passengers.find(p => p.patientId === patientId);
    if (exists) {
      setForm({ ...form, passengers: form.passengers.filter(p => p.patientId !== patientId) });
    } else {
      if (available <= 0) { toast({ title: 'Veículo lotado!', description: 'Não é possível adicionar mais passageiros.', variant: 'destructive' }); return; }
      setForm({ ...form, passengers: [...form.passengers, { patientId, hasCompanion: false }] });
    }
  };

  const toggleCompanion = (patientId: string) => {
    const passenger = form.passengers.find(p => p.patientId === patientId);
    if (!passenger) return;
    if (!passenger.hasCompanion && available <= 0) { toast({ title: 'Sem vagas para acompanhante', variant: 'destructive' }); return; }
    setForm({
      ...form,
      passengers: form.passengers.map(p =>
        p.patientId === patientId ? { ...p, hasCompanion: !p.hasCompanion } : p
      ),
    });
  };

  const statusColor = (s: string) => {
    if (s === 'Confirmada') return 'bg-secondary text-secondary-foreground';
    if (s === 'Cancelada') return 'bg-destructive text-destructive-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const handleExportPDF = async () => {
    if (!filtered.length) {
      toast({ title: 'Sem viagens para exportar', variant: 'destructive' });
      return;
    }

    // Group by driver for the PDF
    const driverGroups = new Map<string, typeof filtered>();
    filtered.forEach(t => {
      const key = t.driverId || 'sem-motorista';
      const arr = driverGroups.get(key) || [];
      arr.push(t);
      driverGroups.set(key, arr);
    });

    for (const [driverId, driverTrips] of driverGroups) {
      const driver = drivers.find(d => d.id === driverId);
      const firstTrip = driverTrips[0];
      const vehicle = vehicles.find(v => v.id === firstTrip.vehicleId);

      await exportDriverSchedulePDF({
        driverName: driver?.name || 'Sem motorista',
        vehicleLabel: vehicle ? `${vehicle.type} — ${vehicle.plate}` : '—',
        date: firstTrip.date,
        trips: driverTrips.map(t => {
          const paxNames = t.passengers.map(p => {
            const pat = patients.find(x => x.id === p.patientId);
            return pat?.name || 'Paciente';
          });
          return {
            departureTime: t.departureTime,
            destination: t.destination,
            consultLocation: t.consultLocation,
            passengers: t.passengers.map(p => ({
              name: patients.find(x => x.id === p.patientId)?.name || 'Paciente',
              hasCompanion: p.hasCompanion,
            })),
            notes: t.notes,
            status: t.status,
          };
        }),
        userName: 'Administração',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie as viagens de transporte</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
          {canCreate && <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Nova Viagem</Button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" />
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Veículo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.type} - {v.plate}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Motorista" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma viagem encontrada.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(trip => {
            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
            const driver = drivers.find(d => d.id === trip.driverId);
            const seats = trip.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
            const capacity = vehicle?.capacity || 0;
            const full = capacity > 0 && seats >= capacity;
            return (
              <Card key={trip.id} className={full ? 'border-destructive/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {trip.date} {trip.departureTime} — {trip.destination}
                      {full && <Ban className="h-4 w-4 text-destructive" />}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor(trip.status)}>{trip.status}</Badge>
                      {canEdit && <Button size="icon" variant="ghost" onClick={() => openEdit(trip)}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button size="icon" variant="ghost" onClick={() => handleDelete(trip.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><span className="text-muted-foreground">Veículo:</span> {vehicle?.type} {vehicle?.plate}</div>
                    <div><span className="text-muted-foreground">Motorista:</span> {driver?.name}</div>
                    <div><span className="text-muted-foreground">Local:</span> {trip.consultLocation}</div>
                  </div>
                  {capacity > 0 && <OccupancyBar used={seats} total={capacity} />}
                  {trip.passengers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trip.passengers.map(p => {
                        const pat = patients.find(pt => pt.id === p.patientId);
                        return <Badge key={p.patientId} variant="outline" className="text-xs">{pat?.name}{p.hasCompanion ? ' +Acomp.' : ''}</Badge>;
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar Viagem' : 'Nova Viagem'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Horário de saída</Label><Input type="time" value={form.departureTime} onChange={e => setForm({ ...form, departureTime: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Destino</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Município" /></div>
              <div><Label>Local da consulta</Label><Input value={form.consultLocation} onChange={e => setForm({ ...form, consultLocation: e.target.value })} placeholder="Hospital/Clínica" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Veículo</Label>
                <Select value={form.vehicleId} onValueChange={v => setForm({ ...form, vehicleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === 'Ativo').map(v => {
                      const otherSeats = vehicleOccupancyOnDate.get(v.id) || 0;
                      const vehicleFull = otherSeats >= v.capacity;
                      return (
                        <SelectItem key={v.id} value={v.id} disabled={vehicleFull}>
                          {v.type} - {v.plate} ({v.capacity - otherSeats}/{v.capacity} vagas)
                          {vehicleFull && ' — LOTADO'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motorista</Label>
                <Select value={form.driverId} onValueChange={v => setForm({ ...form, driverId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentVehicle && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Pacientes</Label>
                  {isFull && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Ban className="h-3 w-3" /> Veículo Lotado
                    </Badge>
                  )}
                </div>
                <OccupancyBar used={usedSeats} total={currentVehicle.capacity} />
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {patients.map(pat => {
                    const isSelected = form.passengers.some(p => p.patientId === pat.id);
                    const passenger = form.passengers.find(p => p.patientId === pat.id);
                    return (
                      <div key={pat.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePassenger(pat.id)}
                            disabled={!isSelected && isFull}
                          />
                          <span className={`text-sm ${!isSelected && isFull ? 'text-muted-foreground' : ''}`}>{pat.name}</span>
                          <span className="text-xs text-muted-foreground">{pat.cpf}</span>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={passenger?.hasCompanion}
                              onCheckedChange={() => toggleCompanion(pat.id)}
                              disabled={!passenger?.hasCompanion && available <= 0}
                            />
                            <span className="text-xs text-muted-foreground">Acompanhante</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {patients.length === 0 && <p className="text-sm text-muted-foreground">Cadastre pacientes primeiro.</p>}
                </div>
              </div>
            )}

            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={currentVehicle ? usedSeats > currentVehicle.capacity : false}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agendamentos;
