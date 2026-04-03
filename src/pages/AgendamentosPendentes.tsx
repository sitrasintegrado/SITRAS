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
import { CalendarDays, Clock, MapPin, Users, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AgendamentosPendentes = () => {
  const { toast } = useToast();
  const { requests, updateRequest, refetch } = useTransportRequests();
  const { patients } = usePatients();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { refetch: refetchTrips } = useTrips();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<typeof requests[0] | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    vehicleId: '', driverId: '', departureTime: '',
  });

  const pending = requests.filter(r => r.status === 'Pendente de Aprovação da Frota');
  const others = requests.filter(r => r.status !== 'Pendente de Aprovação da Frota');

  const openConfirm = (req: typeof requests[0]) => {
    setSelected(req);
    setConfirmForm({ vehicleId: '', driverId: '', departureTime: req.consultTime || '' });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selected || !confirmForm.vehicleId) {
      toast({ title: 'Selecione um veículo', variant: 'destructive' });
      return;
    }

    // Create the trip from the request
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

    // Add passenger
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
        <p className="text-sm text-muted-foreground">Solicitações de transporte aguardando aprovação da frota</p>
      </div>

      {/* Pending */}
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

      {/* Confirm Dialog */}
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
    </div>
  );
};

export default AgendamentosPendentes;
