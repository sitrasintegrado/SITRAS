import { useState, useMemo } from 'react';
import { Maintenance } from '@/types';
import { useMaintenances, useVehicles } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

const emptyMaintenance: Omit<Maintenance, 'id'> = {
  vehicleId: '', date: new Date().toISOString().split('T')[0], type: 'preventiva',
  partReplaced: '', description: '', cost: 0, workshop: '',
  nextReviewDate: '', nextReviewKm: null, vehicleKm: null,
};

const typeLabels: Record<string, string> = { preventiva: 'Preventiva', corretiva: 'Corretiva', emergencial: 'Emergencial' };
const typeBadgeClass: Record<string, string> = {
  preventiva: 'bg-secondary/10 text-secondary border-secondary/20',
  corretiva: 'bg-warning/10 text-warning border-warning/20',
  emergencial: 'bg-destructive/10 text-destructive border-destructive/20',
};

function getMaintenanceStatus(m: Maintenance): { label: string; severity: 'ok' | 'warning' | 'danger' } {
  if (!m.nextReviewDate) return { label: 'Em dia', severity: 'ok' };
  const days = differenceInDays(parseISO(m.nextReviewDate), new Date());
  if (days < 0) return { label: `Atrasada ${Math.abs(days)}d`, severity: 'danger' };
  if (days <= 15) return { label: `Próxima ${days}d`, severity: 'warning' };
  return { label: 'Em dia', severity: 'ok' };
}

const Manutencao = () => {
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = useAuth();
  const { maintenances, save, update, remove } = useMaintenances();
  const { vehicles } = useVehicles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMaintenance);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return maintenances.filter(m => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const v = vehicles.find(ve => ve.id === m.vehicleId);
        return (v?.plate.toLowerCase().includes(q) || v?.modelo.toLowerCase().includes(q) || m.workshop.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [maintenances, search, typeFilter, vehicles]);

  const openNew = () => { setEditId(null); setForm(emptyMaintenance); setDialogOpen(true); };
  const openEdit = (m: Maintenance) => { setEditId(m.id); setForm(m); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.vehicleId || !form.date) { toast({ title: 'Preencha veículo e data', variant: 'destructive' }); return; }
    if (editId) { await update(editId, form); } else { await save(form); }
    setDialogOpen(false);
    toast({ title: editId ? 'Manutenção atualizada' : 'Manutenção registrada' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast({ title: 'Manutenção excluída' });
  };

  const statusBadge = (m: Maintenance) => {
    const s = getMaintenanceStatus(m);
    if (s.severity === 'danger') return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />{s.label}</Badge>;
    if (s.severity === 'warning') return <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]"><Clock className="h-3 w-3 mr-1" />{s.label}</Badge>;
    return <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-sm text-muted-foreground">Controle de manutenção da frota — {maintenances.length} registros</p>
        </div>
        {canCreate && <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Nova Manutenção</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa, modelo ou oficina" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="preventiva">Preventiva</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="emergencial">Emergencial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="hidden lg:table-cell">Oficina</TableHead>
                <TableHead className="hidden lg:table-cell">Custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => {
                const v = vehicles.find(ve => ve.id === m.vehicleId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.date}</TableCell>
                    <TableCell>{v ? `${v.modelo} ${v.plate}` : '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${typeBadgeClass[m.type]}`}>{typeLabels[m.type]}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm">{m.description || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{m.workshop || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{m.cost > 0 ? `R$ ${m.cost.toFixed(2)}` : '—'}</TableCell>
                    <TableCell>{statusBadge(m)}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma manutenção encontrada.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar Manutenção' : 'Nova Manutenção'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Veículo</Label>
              <Select value={form.vehicleId} onValueChange={v => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} — {v.plate}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div>
                <Label>Tipo de manutenção</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="emergencial">Emergencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Peça trocada</Label><Input value={form.partReplaced} onChange={e => setForm({ ...form, partReplaced: e.target.value })} placeholder="Ex: Pastilha de freio" /></div>
            <div><Label>Descrição do serviço</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalhe o serviço realizado" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} placeholder="0.00" /></div>
              <div><Label>Oficina responsável</Label><Input value={form.workshop} onChange={e => setForm({ ...form, workshop: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Próxima revisão (data)</Label><Input type="date" value={form.nextReviewDate} onChange={e => setForm({ ...form, nextReviewDate: e.target.value })} /></div>
              <div><Label>Próxima revisão (km)</Label><Input type="number" value={form.nextReviewKm || ''} onChange={e => setForm({ ...form, nextReviewKm: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 50000" /></div>
            </div>
            <div><Label>KM do veículo no momento</Label><Input type="number" value={form.vehicleKm || ''} onChange={e => setForm({ ...form, vehicleKm: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 45000" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Manutencao;