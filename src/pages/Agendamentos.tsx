import { useState, useMemo } from 'react';
import { Trip } from '@/types';
import { useTrips, useVehicles, useDrivers, usePatients } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import DialogAgendamentos from '@/components/Dialogs/DialogAgendamentos';
import OccupancyBar from '@/components/OccupancyBar';

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
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return trips.filter(t => {
      if (dateFilter && t.date !== dateFilter) return false;
      if (vehicleFilter !== 'all' && t.vehicleId !== vehicleFilter) return false;
      if (driverFilter !== 'all' && t.driverId !== driverFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  }, [trips, dateFilter, vehicleFilter, driverFilter, statusFilter]);

  const currentVehicle = vehicles.find(v => v.id === form.vehicleId);
  const usedSeats = form.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
  const available = currentVehicle ? currentVehicle.capacity - usedSeats : 0;
  const isFull = currentVehicle ? usedSeats >= currentVehicle.capacity : false;

  const openNew = () => { setEditId(null); setForm(emptyTrip); setDialogOpen(true); };
  const openEdit = (t: Trip) => { setEditId(t.id); setForm({ ...t }); setDialogOpen(true); };

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Confirmada">Confirmada</SelectItem>
            <SelectItem value="Cancelada">Cancelada</SelectItem>
            <SelectItem value="Concluída">Concluída</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
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
                      {trip.date.split("-").reverse().join('/')} {"    "} {trip.departureTime} — {trip.destination}
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

      <DialogAgendamentos 
        setForm={setForm} 
        currentVehicle={currentVehicle} 
        dialogOpen={dialogOpen}
        editId={editId} 
        form={form} 
        isFull={isFull}
        setDialogOpen={setDialogOpen}
        usedSeats={usedSeats}
      />
    </div>
  );
};

export default Agendamentos;
