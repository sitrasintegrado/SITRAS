import { useState, useMemo } from 'react';
import { Trip, TripPassenger } from '@/types';
import { useTrips, useVehicles, useDrivers, usePatients } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

  const openNew = () => { setEditId(null); setForm(emptyTrip); setDialogOpen(true); };
  const openEdit = (t: Trip) => { setEditId(t.id); setForm({ ...t }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.destination || !form.vehicleId || !form.driverId) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
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
      if (available <= 0) { toast({ title: 'Veículo lotado!', variant: 'destructive' }); return; }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie as viagens de transporte</p>
        </div>
        {canCreate && <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Nova Viagem</Button>}
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
            const full = vehicle ? seats >= vehicle.capacity : false;
            return (
              <Card key={trip.id} className={full ? 'border-destructive/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {trip.date} {trip.departureTime} — {trip.destination}
                      {full && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor(trip.status)}>{trip.status}</Badge>
                      {canEdit && <Button size="icon" variant="ghost" onClick={() => openEdit(trip)}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button size="icon" variant="ghost" onClick={() => handleDelete(trip.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><span className="text-muted-foreground">Veículo:</span> {vehicle?.type} {vehicle?.plate}</div>
                    <div><span className="text-muted-foreground">Ocupação:</span> {seats}/{vehicle?.capacity}</div>
                    <div><span className="text-muted-foreground">Motorista:</span> {driver?.name}</div>
                    <div><span className="text-muted-foreground">Local:</span> {trip.consultLocation}</div>
                  </div>
                  {trip.passengers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
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
                  <SelectContent>{vehicles.filter(v => v.status === 'Ativo').map(v => <SelectItem key={v.id} value={v.id}>{v.type} - {v.plate} ({v.capacity} vagas)</SelectItem>)}</SelectContent>
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
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label>Pacientes</Label>
                  <Badge variant={available <= 0 ? 'destructive' : 'outline'}>{usedSeats}/{currentVehicle.capacity} vagas</Badge>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {patients.map(pat => {
                    const isSelected = form.passengers.some(p => p.patientId === pat.id);
                    const passenger = form.passengers.find(p => p.patientId === pat.id);
                    return (
                      <div key={pat.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} onCheckedChange={() => togglePassenger(pat.id)} />
                          <span className="text-sm">{pat.name}</span>
                          <span className="text-xs text-muted-foreground">{pat.cpf}</span>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <Checkbox checked={passenger?.hasCompanion} onCheckedChange={() => toggleCompanion(pat.id)} />
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
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agendamentos;
