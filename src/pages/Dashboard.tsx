import { useState, useMemo } from 'react';
import { useTrips, useVehicles, useDrivers, usePatients } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Car, Users, UserCog, AlertTriangle, ShieldAlert } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

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
    return { total: todayTrips.length, passengers: totalPassengers, confirmed };
  }, [trips, today]);

  const statusColor = (s: string) => {
    if (s === 'Confirmada') return 'bg-secondary text-secondary-foreground';
    if (s === 'Cancelada') return 'bg-destructive text-destructive-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de Controle</h1>
        <p className="text-muted-foreground text-sm">Visão geral das viagens do dia</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Viagens hoje</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center"><Users className="h-5 w-5 text-secondary" /></div>
            <div><p className="text-2xl font-bold">{stats.passengers}</p><p className="text-xs text-muted-foreground">Pacientes</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Car className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{vehicles.filter(v => v.status === 'Ativo').length}</p><p className="text-xs text-muted-foreground">Veículos ativos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center"><UserCog className="h-5 w-5 text-secondary" /></div>
            <div><p className="text-2xl font-bold">{drivers.length}</p><p className="text-xs text-muted-foreground">Motoristas</p></div>
          </CardContent>
        </Card>
      </div>

      {/* CNH Alerts */}
      {(() => {
        const now = new Date();
        const cnhAlerts = drivers
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

        if (cnhAlerts.length === 0) return null;

        return (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-warning" />
                🚨 CNHs Próximas do Vencimento
                <Badge variant="outline" className="ml-auto text-xs">{cnhAlerts.length} alerta{cnhAlerts.length > 1 ? 's' : ''}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Motorista</th>
                      <th className="pb-2 font-medium">Categoria</th>
                      <th className="pb-2 font-medium">Vencimento</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cnhAlerts.map(d => (
                      <tr key={d.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 font-medium">{d.name}</td>
                        <td className="py-2">{d.cnhCategory}</td>
                        <td className="py-2">{new Date(d.cnhExpiry).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2">
                          {d.status === 'expired' ? (
                            <Badge className="bg-destructive text-destructive-foreground text-xs">
                              🔴 Vencida ({Math.abs(d.daysLeft)} dias)
                            </Badge>
                          ) : (
                            <Badge className="bg-warning text-warning-foreground text-xs">
                              🟡 {d.daysLeft} dias restantes
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="flex flex-wrap gap-3">
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" />
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Veículo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos veículos</SelectItem>
            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.type} - {v.plate}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Motorista" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos motoristas</SelectItem>
            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma viagem encontrada para os filtros selecionados.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(trip => {
            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
            const driver = drivers.find(d => d.id === trip.driverId);
            const totalSeats = trip.passengers.reduce((s, p) => s + 1 + (p.hasCompanion ? 1 : 0), 0);
            const isFull = vehicle ? totalSeats >= vehicle.capacity : false;

            return (
              <Card key={trip.id} className={isFull ? 'border-destructive/50 bg-destructive/5' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {trip.departureTime} — {trip.destination}
                      {isFull && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </CardTitle>
                    <Badge className={statusColor(trip.status)}>{trip.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Veículo:</span> <span className="font-medium">{vehicle?.type} {vehicle?.plate}</span></div>
                    <div><span className="text-muted-foreground">Capacidade:</span> <span className="font-medium">{totalSeats}/{vehicle?.capacity || '?'}</span></div>
                    <div><span className="text-muted-foreground">Motorista:</span> <span className="font-medium">{driver?.name || '—'}</span></div>
                    <div><span className="text-muted-foreground">Local:</span> <span className="font-medium">{trip.consultLocation}</span></div>
                  </div>
                  {trip.passengers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {trip.passengers.map(p => {
                        const pat = patients.find(pt => pt.id === p.patientId);
                        return (
                          <Badge key={p.patientId} variant="outline" className="text-xs">
                            {pat?.name || '—'}{p.hasCompanion ? ' +Acomp.' : ''}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
