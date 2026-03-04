import { useState } from 'react';
import { getTrips, getVehicles, getDrivers } from '@/lib/store';
import { exportTripsPDF } from '@/lib/pdf-export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Relatorios = () => {
  const { toast } = useToast();
  const trips = getTrips();
  const vehicles = getVehicles();
  const drivers = getDrivers();

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [vehicleId, setVehicleId] = useState('all');
  const [driverId, setDriverId] = useState('all');

  const exportToday = () => {
    const t = trips.filter(tr => tr.date === today);
    if (!t.length) { toast({ title: 'Sem viagens hoje', variant: 'destructive' }); return; }
    exportTripsPDF(t, `Viagens do dia ${today}`);
  };

  const exportByVehicle = () => {
    if (vehicleId === 'all') { toast({ title: 'Selecione um veículo', variant: 'destructive' }); return; }
    const v = vehicles.find(x => x.id === vehicleId);
    const t = trips.filter(tr => tr.vehicleId === vehicleId);
    if (!t.length) { toast({ title: 'Sem viagens para este veículo', variant: 'destructive' }); return; }
    exportTripsPDF(t, `Relatório — ${v?.type} ${v?.plate}`);
  };

  const exportByDriver = () => {
    if (driverId === 'all') { toast({ title: 'Selecione um motorista', variant: 'destructive' }); return; }
    const d = drivers.find(x => x.id === driverId);
    const t = trips.filter(tr => tr.driverId === driverId);
    if (!t.length) { toast({ title: 'Sem viagens para este motorista', variant: 'destructive' }); return; }
    exportTripsPDF(t, `Relatório — Motorista ${d?.name}`);
  };

  const exportByPeriod = () => {
    const t = trips.filter(tr => tr.date >= dateFrom && tr.date <= dateTo);
    if (!t.length) { toast({ title: 'Sem viagens no período', variant: 'destructive' }); return; }
    exportTripsPDF(t, `Relatório ${dateFrom} a ${dateTo}`);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Relatórios</h1><p className="text-sm text-muted-foreground">Exportar relatórios em PDF</p></div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Viagens do Dia</CardTitle></CardHeader>
          <CardContent><Button onClick={exportToday} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Por Veículo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.type} - {v.plate}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={exportByVehicle} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Por Motorista</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={exportByDriver} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Por Período</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            </div>
            <Button onClick={exportByPeriod} className="w-full"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
