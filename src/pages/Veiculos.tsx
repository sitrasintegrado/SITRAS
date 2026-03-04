import { useState } from 'react';
import { Vehicle } from '@/types';
import { useVehicles } from '@/hooks/use-supabase-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const emptyVehicle: Omit<Vehicle, 'id'> = {
  type: 'Van', plate: '', modelo: '', ano: null, renavam: '', chassi: '',
  capacity: 10, status: 'Ativo',
};

const Veiculos = () => {
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = useAuth();
  const { vehicles, save, update, remove } = useVehicles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyVehicle);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.plate.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q);
    }
    return true;
  });

  const openNew = () => { setEditId(null); setForm(emptyVehicle); setDialogOpen(true); };
  const openEdit = (v: Vehicle) => { setEditId(v.id); setForm(v); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.plate) { toast({ title: 'Preencha a placa', variant: 'destructive' }); return; }
    if (editId) {
      await update(editId, form);
    } else {
      await save(form);
    }
    setDialogOpen(false);
    toast({ title: editId ? 'Veículo atualizado' : 'Veículo cadastrado' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast({ title: 'Veículo excluído' });
  };

  const statusBadge = (s: string) => {
    if (s === 'Ativo') return <Badge className="bg-secondary text-secondary-foreground">Ativo</Badge>;
    if (s === 'Manutenção') return <Badge className="bg-warning text-warning-foreground">Manutenção</Badge>;
    return <Badge variant="outline">Inativo</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Veículos</h1><p className="text-sm text-muted-foreground">Gestão da frota de transporte — {vehicles.length} veículos</p></div>
        {canCreate && <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Novo Veículo</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa ou modelo" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Manutenção">Manutenção</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="hidden md:table-cell">Ano</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden lg:table-cell">RENAVAM</TableHead>
                <TableHead>Cap.</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.plate}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{v.modelo || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.ano || '—'}</TableCell>
                  <TableCell>{v.type}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">{v.renavam || '—'}</TableCell>
                  <TableCell>{v.capacity}</TableCell>
                  <TableCell>{statusBadge(v.status)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum veículo encontrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value.toUpperCase() })} placeholder="Ex: RENAULT MASTER" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Placa</Label><Input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} placeholder="ABC1D23" /></div>
              <div><Label>Ano</Label><Input type="number" value={form.ano || ''} onChange={e => setForm({ ...form, ano: e.target.value ? Number(e.target.value) : null })} placeholder="2024" /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Carro">Carro</SelectItem><SelectItem value="Van">Van</SelectItem><SelectItem value="Ônibus">Ônibus</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>RENAVAM</Label><Input value={form.renavam} onChange={e => setForm({ ...form, renavam: e.target.value })} /></div>
              <div><Label>Chassi</Label><Input value={form.chassi} onChange={e => setForm({ ...form, chassi: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capacidade (vagas)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              <div>
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Manutenção">Manutenção</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Veiculos;
