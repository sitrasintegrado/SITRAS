import { useState } from 'react';
import { useTransportRequests } from '@/hooks/use-transport-requests';
import { usePatients, useVehicles, useDrivers, useTrips } from '@/hooks/use-supabase-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, Clock, MapPin, Users, CheckCircle, XCircle, Bus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AgendamentosPendentes = () => {
  const { toast } = useToast();
  const { requests, updateRequest, refetch } = useTransportRequests();
  const { patients } = usePatients();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { trips, refetch: refetchTrips } = useTrips();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [selected, setSelected] = useState<typeof requests[0] | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<typeof trips[0] | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    vehicleId: '', driverId: '', departureTime: '',
  });
  const [assignForm, setAssignForm] = useState({ driverId: '', vehicleId: '' });

  const pending = requests.filter(r => r.status === 'Pendente de Aprovação da Frota');
  const others = requests.filter(r => r.status !== 'Pendente de Aprovação da Frota');

  // Trips created by Marcador awaiting driver assignment
  const awaitingDriverTrips = trips.filter(t => t.status === 'Aguardando Motorista');

  const openConfirm = (req: typeof requests[0]) => {
    setSelected(req);
    setConfirmForm({ vehicleId: '', driverId: '', departureTime: req.consultTime || '' });
    setConfirmOpen(true);
  };

  const openAssignDriver = (trip: typeof trips[0]) => {
    setSelectedTrip(trip);
    setAssignForm({ driverId: '', vehicleId: trip.vehicleId || '' });
    setAssignDriverOpen(true);
  };

  const handleConfirm = async () => {
    if (!selected || !confirmForm.vehicleId) {
      toast({ title: 'Selecione um veículo', variant: 'destructive' });
      return;
    }

    const { data: trip, error } = await supabase.from('trips').insert({
      date: selected.date,
      departure_time: confirmForm.departureTime,
      destination: selected.destination,
      consult_location: selected.consultLocation,
      vehicle_id: confirmForm.vehicleId,
      driver_id: confirmForm.driverId || null,
      notes: selected.notes,
      status: confirmForm.driverId ? 'Confirmada' : 'Aguardando Motorista',
      transport_request_id: selected.id,
    } as any).select().single();

    if (error) {
      toast({ title: 'Erro ao criar viagem', description: error.message, variant: 'destructive' });
      return;
    }

    if (trip) {
      await supabase.from('trip_passengers').insert({
        trip_id: trip.id,
        patient_id: selected.patientId,
        has_companion: selected.hasCompanion,
      });
    }

    toast({ title: 'Viagem confirmada com sucesso!' });
    setConfirmOpen(false);
    await refetch();
    await refetchTrips();
  };

  const handleAssignDriver = async () => {
    if (!selectedTrip || !assignForm.driverId) {
      toast({ title: 'Selecione um motorista', variant: 'destructive' });
      return;
    }

    const updateData: any = {
      driver_id: assignForm.driverId,
      status: 'Confirmada',
    };

    // If trip has no vehicle yet (fixed_trip flow), require vehicle selection
    if (!selectedTrip.vehicleId) {
      if (!assignForm.vehicleId) {
        toast({ title: 'Selecione um veículo', variant: 'destructive' });
        return;
      }
      updateData.vehicle_id = assignForm.vehicleId;
    }

    const { error } = await supabase.from('trips').update(updateData).eq('id', selectedTrip.id);

    if (error) {
      toast({ title: 'Erro ao atribuir motorista', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Motorista e veículo atribuídos com sucesso!' });
    setAssignDriverOpen(false);
    await refetchTrips();
  };

  const handleCancel = async (id: string) => {
    await updateRequest(id, { status: 'Cancelada' });
    toast({ title: 'Solicitação cancelada' });
  };

  const statusColor = (s: string) => {
    if (s === 'Pendente de Aprovação da Frota') return 'bg-warning/15 text-warning border-warning/30';
    if (s === 'Aprovada') return 'bg-secondary/15 text-secondary border-secondary/30';
    if (s === 'Cancelada') return 'bg-destructive/15 text-destructive border-destructive/30';
    return 'bg-muted text-muted-foreground';
  };

  const activeVehicles = vehicles.filter(v => v.status === 'Ativo');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agendamentos Pendentes</h1>
        <p className="text-sm text-muted-foreground">Solicitações e viagens aguardando aprovação da frota</p>
      </div>

      {/* Trips awaiting driver assignment */}
      {awaitingDriverTrips.length > 0 && (
        <>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bus className="h-5 w-5 text-warning" /> Viagens Aguardando Motorista
          </h2>
          <div className="grid gap-4">
            {awaitingDriverTrips.map(trip => {
              const vehicle = vehicles.find(v => v.id === trip.vehicleId);
              const seats = trip.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
              return (
                <Card key={trip.id} className="border-warning/30">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4 text-primary" />
                          <span className="font-medium">{trip.destination || 'Sem destino'}</span>
                          <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">
                            Aguardando Motorista
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{trip.date.split('-').reverse().join('/')}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{trip.departureTime || '-'}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.consultLocation || '-'}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{seats} passageiro(s)</span>
                        </div>
                        {vehicle && <p className="text-xs text-muted-foreground">Veículo: {vehicle.type} — {vehicle.plate}</p>}
                        {trip.notes && <p className="text-xs text-muted-foreground italic">{trip.notes}</p>}
                        {trip.passengers.length > 0 && (
                          <div className="text-xs space-y-0.5">
                            {trip.passengers.map((p, i) => {
                              const pat = patients.find(pt => pt.id === p.patientId);
                              return (
                                <span key={i} className="block text-muted-foreground">
                                  • {pat?.name || 'Paciente'}{p.hasCompanion ? ' (+acompanhante)' : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => openAssignDriver(trip)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Atribuir Motorista
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Pending transport requests */}
      <h2 className="text-lg font-semibold">Solicitações Pendentes</h2>
      {pending.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma solicitação pendente.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {pending.map(req => {
            const patient = patients.find(p => p.id === req.patientId);
            return (
              <Card key={req.id} className="border-warning/30">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{patient?.name || 'Paciente'}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(req.status)}`}>
                          {req.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{req.date.split('-').reverse().join('/')}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{req.consultTime || '-'}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.destination || '-'}</span>
                        <span>{req.hasCompanion ? '👤 Acompanhante' : ''}</span>
                      </div>
                      {req.consultLocation && <p className="text-xs text-muted-foreground">Local: {req.consultLocation}</p>}
                      {req.notes && <p className="text-xs text-muted-foreground italic">{req.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openConfirm(req)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Confirmar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(req.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* History */}
      {others.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-6">Histórico</h2>
          <div className="grid gap-3">
            {others.slice(0, 20).map(req => {
              const patient = patients.find(p => p.id === req.patientId);
              return (
                <Card key={req.id} className="opacity-70">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{patient?.name || 'Paciente'}</span>
                      <span className="text-muted-foreground ml-2">{req.date.split('-').reverse().join('/')}</span>
                      <span className="text-muted-foreground ml-2">{req.destination}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColor(req.status)}`}>
                      {req.status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Confirm Request Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Viagem</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Paciente:</strong> {patients.find(p => p.id === selected.patientId)?.name}</p>
                <p><strong>Data:</strong> {selected.date.split('-').reverse().join('/')}</p>
                <p><strong>Destino:</strong> {selected.destination}</p>
                <p><strong>Local:</strong> {selected.consultLocation}</p>
                {selected.hasCompanion && <p><strong>Acompanhante:</strong> Sim</p>}
                {selected.notes && <p><strong>Obs:</strong> {selected.notes}</p>}
              </div>
              <div>
                <Label>Veículo *</Label>
                <Select value={confirmForm.vehicleId} onValueChange={v => setConfirmForm({ ...confirmForm, vehicleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                  <SelectContent>
                    {activeVehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.type} — {v.plate} ({v.capacity} lugares)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motorista</Label>
                <Select value={confirmForm.driverId} onValueChange={v => setConfirmForm({ ...confirmForm, driverId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar motorista (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário de Saída</Label>
                <Input type="time" value={confirmForm.departureTime}
                  onChange={e => setConfirmForm({ ...confirmForm, departureTime: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirm}>
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmar Viagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog open={assignDriverOpen} onOpenChange={setAssignDriverOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Motorista</DialogTitle>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Destino:</strong> {selectedTrip.destination}</p>
                <p><strong>Data:</strong> {selectedTrip.date.split('-').reverse().join('/')}</p>
                <p><strong>Horário:</strong> {selectedTrip.departureTime}</p>
                <p><strong>Veículo:</strong> {vehicles.find(v => v.id === selectedTrip.vehicleId)?.plate || '-'}</p>
                <p><strong>Passageiros:</strong> {selectedTrip.passengers.length}</p>
              </div>
              <div>
                <Label>Motorista *</Label>
                <Select value={assignForm.driverId} onValueChange={v => setAssignForm({ driverId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar motorista" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDriverOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssignDriver}>
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgendamentosPendentes;
