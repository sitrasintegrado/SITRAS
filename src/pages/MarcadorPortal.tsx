import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips, useVehicles, usePatients } from '@/hooks/use-supabase-data';
import { useTransportRequests } from '@/hooks/use-transport-requests';
import { useNotifications } from '@/hooks/use-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BuscaPaciente } from '@/components/BuscaPaciente';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Bus, Send, Bell, CalendarDays, Clock, MapPin, Plus, CheckCircle, UserPlus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const MarcadorPortal = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { trips, refetch: refetchTrips } = useTrips();
  const { vehicles } = useVehicles();
  const { patients } = usePatients();
  const { requests, create: createRequest } = useTransportRequests();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [activeTab, setActiveTab] = useState('agendamentos');
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [addPassengerOpen, setAddPassengerOpen] = useState(false);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [newPassenger, setNewPassenger] = useState({ patientId: '', hasCompanion: false, isPcd: false });
  const [savingPassenger, setSavingPassenger] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [newTripForm, setNewTripForm] = useState({
    vehicleId: '', date: new Date().toISOString().split('T')[0],
    departureTime: '06:00', destination: '', consultLocation: '', notes: '',
  });
  const [solicitarForm, setSolicitarForm] = useState({
    patientId: '', date: new Date().toISOString().split('T')[0],
    consultTime: '', destination: '', consultLocation: '',
    hasCompanion: false, notes: '',
  });

  // Bus vehicles available
  const busVehicles = useMemo(() => vehicles.filter(v => v.type === 'Ônibus' && v.status === 'Ativo'), [vehicles]);
  const busVehicleIds = useMemo(() => new Set(busVehicles.map(v => v.id)), [busVehicles]);
  const busTrips = useMemo(() => trips.filter(t => busVehicleIds.has(t.vehicleId)), [trips, busVehicleIds]);

  const openAddPassenger = (tripId: string) => {
    setSelectedTripId(tripId);
    setNewPassenger({ patientId: '', hasCompanion: false, isPcd: false });
    setAddPassengerOpen(true);
  };

  const handleAddPassenger = async () => {
    if (!newPassenger.patientId) {
      toast({ title: 'Selecione um paciente', variant: 'destructive' });
      return;
    }
    setSavingPassenger(true);
    const { error } = await supabase.from('trip_passengers').insert({
      trip_id: selectedTripId,
      patient_id: newPassenger.patientId,
      has_companion: newPassenger.hasCompanion,
      is_pcd: newPassenger.isPcd,
    });
    setSavingPassenger(false);
    if (error) {
      toast({ title: 'Erro ao adicionar passageiro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Passageiro adicionado!' });
      setAddPassengerOpen(false);
      await refetchTrips();
    }
  };

  const handleRemovePassenger = async (tripId: string, patientId: string) => {
    const { error } = await supabase.from('trip_passengers').delete()
      .eq('trip_id', tripId).eq('patient_id', patientId);
    if (error) {
      toast({ title: 'Erro ao remover passageiro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Passageiro removido' });
      await refetchTrips();
    }
  };

  const handleSolicitar = async () => {
    if (!solicitarForm.patientId || !solicitarForm.date) {
      toast({ title: 'Preencha paciente e data', variant: 'destructive' });
      return;
    }
    const { error } = await createRequest(solicitarForm);
    if (error) {
      toast({ title: 'Erro ao criar solicitação', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Solicitação enviada à frota!' });
      setSolicitarOpen(false);
      setSolicitarForm({
        patientId: '', date: new Date().toISOString().split('T')[0],
        consultTime: '', destination: '', consultLocation: '',
        hasCompanion: false, notes: '',
      });
    }
  };

  const statusColor = (s: string) => {
    if (s === 'Pendente de Aprovação da Frota') return 'bg-warning/15 text-warning border-warning/30';
    if (s === 'Aprovada') return 'bg-secondary/15 text-secondary border-secondary/30';
    if (s === 'Cancelada') return 'bg-destructive/15 text-destructive border-destructive/30';
    return 'bg-muted text-muted-foreground';
  };

  const tripStatusColor = (s: string) => {
    if (s === 'Aguardando Motorista') return 'bg-warning/15 text-warning border-warning/30';
    if (s === 'Confirmada') return 'bg-info/15 text-info border-info/30';
    if (s === 'Em andamento') return 'bg-primary/15 text-primary border-primary/30';
    if (s === 'Finalizada' || s === 'Concluída') return 'bg-secondary/15 text-secondary border-secondary/30';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
              <img src={logo} alt="SITRAS" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">SITRAS — Marcador</p>
              <p className="text-[11px] opacity-80 leading-tight">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="icon"
              className="text-primary-foreground hover:bg-white/20 relative"
              onClick={() => setActiveTab('notificacoes')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-white/20">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="agendamentos" className="text-xs">
              <Bus className="h-4 w-4 mr-1" /> Ônibus
            </TabsTrigger>
            <TabsTrigger value="solicitacoes" className="text-xs">
              <Send className="h-4 w-4 mr-1" /> Solicitações
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="text-xs relative">
              <Bell className="h-4 w-4 mr-1" /> Avisos
              {unreadCount > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Agendamentos de Ônibus */}
          <TabsContent value="agendamentos" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Viagens de Ônibus</h2>
            </div>
            {busTrips.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma viagem de ônibus disponível.</CardContent></Card>
            ) : (
              busTrips.map(trip => {
                const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                const seats = trip.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
                const canAddPassenger = trip.status === 'Aguardando Motorista';
                return (
                  <Card key={trip.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          {trip.departureTime} — {trip.destination}
                        </CardTitle>
                        <Badge variant="outline" className={`text-[10px] ${tripStatusColor(trip.status)}`}>
                          {trip.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>Veículo: {vehicle?.type} {vehicle?.plate}</span>
                        <span>Data: {trip.date.split('-').reverse().join('/')}</span>
                        <span>Ocupação: {seats}/{vehicle?.capacity || '?'}</span>
                      </div>

                      {/* Passenger list */}
                      {trip.passengers.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium flex items-center gap-1"><Users className="h-3 w-3" /> Passageiros:</p>
                          {trip.passengers.map((p, i) => {
                            const pat = patients.find(pt => pt.id === p.patientId);
                            return (
                              <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                                <span className="text-xs">
                                  {pat?.name || 'Paciente'}
                                  {p.hasCompanion && <Badge variant="outline" className="ml-1 text-[9px]">+Acomp.</Badge>}
                                </span>
                                {canAddPassenger && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6"
                                    onClick={() => handleRemovePassenger(trip.id, p.patientId)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {canAddPassenger && (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => openAddPassenger(trip.id)}>
                          <UserPlus className="h-4 w-4 mr-1" /> Adicionar Paciente
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Solicitações */}
          <TabsContent value="solicitacoes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Minhas Solicitações</h2>
              <Button size="sm" onClick={() => setSolicitarOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Solicitar Veículo
              </Button>
            </div>
            {requests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma solicitação realizada.</CardContent></Card>
            ) : (
              requests.map(req => {
                const patient = patients.find(p => p.id === req.patientId);
                return (
                  <Card key={req.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{patient?.name || 'Paciente'}</p>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(req.status)}`}>
                          {req.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                        <span><CalendarDays className="h-3 w-3 inline mr-1" />{req.date.split('-').reverse().join('/')}</span>
                        <span><Clock className="h-3 w-3 inline mr-1" />{req.consultTime || '-'}</span>
                        <span><MapPin className="h-3 w-3 inline mr-1" />{req.destination || '-'}</span>
                        <span>{req.hasCompanion ? '👤 Com acompanhante' : ''}</span>
                      </div>
                      {req.notes && <p className="text-xs text-muted-foreground italic">{req.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notificacoes" className="space-y-3 mt-4">
            <h2 className="text-lg font-bold">Notificações</h2>
            {notifications.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma notificação.</CardContent></Card>
            ) : (
              notifications.map(n => (
                <Card key={n.id} className={n.readAt ? 'opacity-60' : 'border-primary/30'}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    {!n.readAt && (
                      <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Adicionar Passageiro */}
      <Dialog open={addPassengerOpen} onOpenChange={setAddPassengerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Paciente ao Ônibus</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paciente</Label>
              <BuscaPaciente onSelectPaciente={(id) => setNewPassenger({ ...newPassenger, patientId: id })} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={newPassenger.hasCompanion}
                  onCheckedChange={(c) => setNewPassenger({ ...newPassenger, hasCompanion: !!c })} />
                <Label className="text-sm">Acompanhante</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={newPassenger.isPcd}
                  onCheckedChange={(c) => setNewPassenger({ ...newPassenger, isPcd: !!c })} />
                <Label className="text-sm">PCD</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPassengerOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddPassenger} disabled={savingPassenger}>
              {savingPassenger ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Solicitar Veículo */}
      <Dialog open={solicitarOpen} onOpenChange={setSolicitarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Veículo à Frota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paciente</Label>
              <BuscaPaciente onSelectPaciente={(id) => setSolicitarForm({ ...solicitarForm, patientId: id })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={solicitarForm.date}
                  onChange={e => setSolicitarForm({ ...solicitarForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Horário da Consulta</Label>
                <Input type="time" value={solicitarForm.consultTime}
                  onChange={e => setSolicitarForm({ ...solicitarForm, consultTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Destino (Município)</Label>
              <Input value={solicitarForm.destination}
                onChange={e => setSolicitarForm({ ...solicitarForm, destination: e.target.value })} />
            </div>
            <div>
              <Label>Local da Consulta</Label>
              <Input value={solicitarForm.consultLocation}
                onChange={e => setSolicitarForm({ ...solicitarForm, consultLocation: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={solicitarForm.hasCompanion}
                onCheckedChange={(c) => setSolicitarForm({ ...solicitarForm, hasCompanion: !!c })} />
              <Label>Possui acompanhante</Label>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={solicitarForm.notes}
                onChange={e => setSolicitarForm({ ...solicitarForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitarOpen(false)}>Cancelar</Button>
            <Button onClick={handleSolicitar}>
              <Send className="h-4 w-4 mr-1" /> Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarcadorPortal;
