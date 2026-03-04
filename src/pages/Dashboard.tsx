import { useState, useMemo } from 'react';
import { useTrips, useVehicles, useDrivers, usePatients } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarDays, Car, Users, UserCog, AlertTriangle, ShieldAlert,
  TrendingUp, Clock, MapPin, Filter, ChevronRight, Wrench, Ban
} from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { trips } = useTrips();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { patients } = usePatients();

  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(today);
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

  const stats = useMemo(() => {
    const todayTrips = trips.filter(t => t.date === today);
    const totalPassengers = todayTrips.reduce((s, t) => s + t.passengers.length, 0);
    const confirmed = todayTrips.filter(t => t.status === 'Confirmada').length;
    const concluded = todayTrips.filter(t => t.status === 'Concluída').length;
    const cancelled = todayTrips.filter(t => t.status === 'Cancelada').length;
    return { total: todayTrips.length, passengers: totalPassengers, confirmed, concluded, cancelled };
  }, [trips, today]);

  const managerial = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    const monthTrips = trips.filter(t => t.date.startsWith(currentMonth));
    const todayTrips = trips.filter(t => t.date === today);
    const paxToday = todayTrips.reduce((s, t) => s + t.passengers.length, 0);
    const activeVehicles = vehicles.filter(v => v.status === 'Ativo');
    const usedVehicleIds = new Set(todayTrips.filter(t => t.vehicleId).map(t => t.vehicleId));
    const availableVehicles = activeVehicles.filter(v => !usedVehicleIds.has(v.id)).length;
    const totalCapacity = todayTrips.reduce((s, t) => {
      const v = vehicles.find(ve => ve.id === t.vehicleId);
      return s + (v?.capacity || 0);
    }, 0);
    const totalOccupied = todayTrips.reduce((s, t) =>
      s + t.passengers.reduce((ps, p) => ps + 1 + (p.hasCompanion ? 1 : 0), 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
    return { monthTrips: monthTrips.length, paxToday, availableVehicles, occupancyRate };
  }, [trips, vehicles, today]);

  const cnhAlerts = useMemo(() => {
    const now = new Date();
    return drivers
      .filter(d => d.cnhExpiry)
      .map(d => {
        const expiry = parseISO(d.cnhExpiry);
        const daysLeft = differenceInDays(expiry, now);
        const status: 'valid' | 'warning' | 'expired' =
          daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'warning' : 'valid';
        return { ...d, daysLeft, status };
      })
      .filter(d => d.status !== 'valid')
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [drivers]);

  const statusConfig = (s: string) => {
    if (s === 'Confirmada') return { bg: 'bg-info/10 text-info border-info/20', dot: 'bg-info' };
    if (s === 'Concluída') return { bg: 'bg-secondary/10 text-secondary border-secondary/20', dot: 'bg-secondary' };
    if (s === 'Cancelada') return { bg: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' };
    return { bg: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };
  };

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return today;
    }
  }, [today]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel de Controle</h1>
          <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
          Dados atualizados em tempo real
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="relative overflow-hidden border-0 shadow-md cursor-pointer hover:shadow-lg hover:ring-1 hover:ring-primary/20 transition-all"
          onClick={() => {
            setDateFilter(today);
            setVehicleFilter('all');
            setDriverFilter('all');
            document.getElementById('trips-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[4rem]" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-medium">Viagens hoje</p>
              {stats.confirmed > 0 && (
                <p className="text-[10px] text-info mt-0.5">{stats.confirmed} confirmada{stats.confirmed > 1 ? 's' : ''} — clique para ver</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto shrink-0" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-bl-[4rem]" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{stats.passengers}</p>
              <p className="text-xs text-muted-foreground font-medium">Pacientes hoje</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{patients.length} cadastrados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[4rem]" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{vehicles.filter(v => v.status === 'Ativo').length}</p>
              <p className="text-xs text-muted-foreground font-medium">Veículos ativos</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{vehicles.length} na frota</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-bl-[4rem]" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <UserCog className="h-6 w-6 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{drivers.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Motoristas</p>
              {cnhAlerts.length > 0 && (
                <p className="text-[10px] text-warning mt-0.5">{cnhAlerts.length} alerta{cnhAlerts.length > 1 ? 's' : ''} de CNH</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Managerial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{managerial.occupancyRate}%</p>
              <p className="text-xs text-muted-foreground font-medium">Taxa de ocupação</p>
              <div className="mt-1 h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${managerial.occupancyRate >= 80 ? 'bg-secondary' : managerial.occupancyRate >= 50 ? 'bg-warning' : 'bg-destructive'}`}
                  style={{ width: `${Math.min(managerial.occupancyRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-secondary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-6 w-6 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{managerial.monthTrips}</p>
              <p className="text-xs text-muted-foreground font-medium">Viagens no mês</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(), "MMMM/yyyy", { locale: ptBR })}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-info/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{managerial.paxToday}</p>
              <p className="text-xs text-muted-foreground font-medium">Pacientes transportados</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">hoje</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-warning/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <Car className="h-6 w-6 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight">{managerial.availableVehicles}</p>
              <p className="text-xs text-muted-foreground font-medium">Veículos disponíveis</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">de {vehicles.filter(v => v.status === 'Ativo').length} ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CNH Alerts */}
      {cnhAlerts.length > 0 && (
        <Card className="border-warning/30 shadow-md overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-warning to-destructive" />
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Alertas de CNH
              <Badge variant="outline" className="ml-auto text-[10px] border-warning/30 text-warning">
                {cnhAlerts.length} alerta{cnhAlerts.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {cnhAlerts.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${d.status === 'expired' ? 'bg-destructive' : 'bg-warning'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">Cat. {d.cnhCategory} • Venc. {new Date(d.cnhExpiry).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] shrink-0 ${d.status === 'expired' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'}`}
                    variant="outline"
                  >
                    {d.status === 'expired' ? `Vencida há ${Math.abs(d.daysLeft)}d` : `${d.daysLeft}d restantes`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Status Alerts */}
      {(() => {
        const maintenance = vehicles.filter(v => v.status === 'Manutenção');
        const inactive = vehicles.filter(v => v.status === 'Inativo');
        if (maintenance.length === 0 && inactive.length === 0) return null;
        return (
          <Card className="border-muted-foreground/20 shadow-md overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-warning to-muted-foreground" />
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Veículos Indisponíveis
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {maintenance.length + inactive.length} veículo{maintenance.length + inactive.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2">
                {maintenance.map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 bg-warning" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{v.modelo} — {v.plate}</p>
                        <p className="text-[11px] text-muted-foreground">{v.type} • Cap. {v.capacity}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 shrink-0">
                      <Wrench className="h-3 w-3 mr-1" /> Manutenção
                    </Badge>
                  </div>
                ))}
                {inactive.map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 bg-destructive" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{v.modelo} — {v.plate}</p>
                        <p className="text-[11px] text-muted-foreground">{v.type} • Cap. {v.capacity}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                      <Ban className="h-3 w-3 mr-1" /> Inativo
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtros</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44 text-sm" />
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Veículo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} — {v.plate}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Motorista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trips */}
      <div id="trips-section">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Viagens
            <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma viagem encontrada</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Ajuste os filtros ou selecione outra data</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(trip => {
              const vehicle = vehicles.find(v => v.id === trip.vehicleId);
              const driver = drivers.find(d => d.id === trip.driverId);
              const totalSeats = trip.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
              const isFull = vehicle ? totalSeats >= vehicle.capacity : false;
              const sc = statusConfig(trip.status);
              const occupancy = vehicle ? Math.round((totalSeats / vehicle.capacity) * 100) : 0;

              return (
                <Card key={trip.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${isFull ? 'ring-1 ring-destructive/30' : ''}`}>
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Left accent */}
                      <div className={`w-1 shrink-0 rounded-l-lg ${sc.dot}`} />

                      <div className="flex-1 p-4">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex flex-col items-center shrink-0">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                              <span className="text-sm font-bold">{trip.departureTime || '—'}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                <p className="text-sm font-semibold truncate">{trip.destination || 'Sem destino'}</p>
                              </div>
                              {trip.consultLocation && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 ml-5.5 truncate">{trip.consultLocation}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isFull && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            <Badge variant="outline" className={`text-[10px] ${sc.bg}`}>{trip.status}</Badge>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Veículo</span>
                            <p className="font-medium truncate">{vehicle ? `${vehicle.modelo} • ${vehicle.plate}` : '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Motorista</span>
                            <p className="font-medium truncate">{driver?.name || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ocupação</span>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{totalSeats}/{vehicle?.capacity || '?'}</p>
                              {vehicle && (
                                <div className="flex-1 h-1.5 rounded-full bg-muted max-w-16 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${occupancy >= 100 ? 'bg-destructive' : occupancy >= 75 ? 'bg-warning' : 'bg-secondary'}`}
                                    style={{ width: `${Math.min(occupancy, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pacientes</span>
                            <p className="font-medium">{trip.passengers.length}</p>
                          </div>
                        </div>

                        {/* Passengers */}
                        {trip.passengers.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                            {trip.passengers.map(p => {
                              const pat = patients.find(pt => pt.id === p.patientId);
                              return (
                                <Badge key={p.patientId} variant="outline" className="text-[10px] bg-muted/50 font-normal">
                                  {pat?.name || '—'}{p.hasCompanion ? ' +Acomp.' : ''}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
