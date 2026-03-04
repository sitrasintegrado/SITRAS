import { useState } from 'react';
import { useTrips, useVehicles, useDrivers, usePatients } from '@/hooks/use-supabase-data';
import { useAuth } from '@/contexts/AuthContext';
import {
  exportDailyReport,
  exportVehicleReport,
  exportDriverReport,
  exportPatientReport,
  exportPeriodReport,
  exportConsolidatedReport,
} from '@/lib/pdf-export';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, CalendarDays, Car, User, Users, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Relatorios = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { trips } = useTrips();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { patients } = usePatients();

  const userName = user?.email || 'Usuário';
  const today = new Date().toISOString().split('T')[0];

  const [dailyDate, setDailyDate] = useState(today);
  const [vehicleId, setVehicleId] = useState('all');
  const [driverId, setDriverId] = useState('all');
  const [patientId, setPatientId] = useState('all');
  const [periodFrom, setPeriodFrom] = useState(today);
  const [periodTo, setPeriodTo] = useState(today);
  const [consolFrom, setConsolFrom] = useState(today);
  const [consolTo, setConsolTo] = useState(today);

  const noData = () => toast({ title: 'Sem dados', description: 'Nenhuma viagem encontrada para os filtros selecionados.', variant: 'destructive' });

  const handleDaily = () => {
    if (!exportDailyReport(trips, vehicles, drivers, patients, userName, dailyDate)) noData();
  };

  const handleVehicle = () => {
    if (vehicleId === 'all') { toast({ title: 'Selecione um veículo', variant: 'destructive' }); return; }
    if (!exportVehicleReport(trips, vehicles, drivers, patients, userName, vehicleId)) noData();
  };

  const handleDriver = () => {
    if (driverId === 'all') { toast({ title: 'Selecione um motorista', variant: 'destructive' }); return; }
    if (!exportDriverReport(trips, vehicles, drivers, patients, userName, driverId)) noData();
  };

  const handlePatient = () => {
    if (patientId === 'all') { toast({ title: 'Selecione um paciente', variant: 'destructive' }); return; }
    if (!exportPatientReport(trips, vehicles, drivers, patients, userName, patientId)) noData();
  };

  const handlePeriod = () => {
    if (!exportPeriodReport(trips, vehicles, drivers, patients, userName, periodFrom, periodTo)) noData();
  };

  const handleConsolidated = () => {
    if (!exportConsolidatedReport(trips, vehicles, drivers, patients, userName, consolFrom, consolTo)) noData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Gere relatórios em PDF com identidade visual institucional</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Diário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Relatório Diário</CardTitle>
            <CardDescription className="text-xs">Viagens de uma data específica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Data</Label><Input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} /></div>
            <Button onClick={handleDaily} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        {/* Por Veículo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4 text-primary" /> Por Veículo</CardTitle>
            <CardDescription className="text-xs">Todas as viagens de um veículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.type} - {v.plate}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleVehicle} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        {/* Por Motorista */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Por Motorista</CardTitle>
            <CardDescription className="text-xs">Todas as viagens de um motorista</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleDriver} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        {/* Por Paciente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Por Paciente</CardTitle>
            <CardDescription className="text-xs">Histórico de viagens de um paciente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handlePatient} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        {/* Por Período */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Por Período</CardTitle>
            <CardDescription className="text-xs">Viagens em um intervalo de datas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">De</Label><Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Até</Label><Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} /></div>
            </div>
            <Button onClick={handlePeriod} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        {/* Gerencial Consolidado */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Gerencial Consolidado</CardTitle>
            <CardDescription className="text-xs">Indicadores, totais e análise por veículo/motorista</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">De</Label><Input type="date" value={consolFrom} onChange={e => setConsolFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Até</Label><Input type="date" value={consolTo} onChange={e => setConsolTo(e.target.value)} /></div>
            </div>
            <Button onClick={handleConsolidated} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
