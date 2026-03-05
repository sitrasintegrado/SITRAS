import { useState } from 'react';
import { Driver } from '@/types';
import { useDrivers } from '@/hooks/use-supabase-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const emptyDriver: Omit<Driver, 'id'> = { name: '', cpf: '', phone: '', cnh: '', cnhCategory: 'D', cnhExpiry: '' };

const Motoristas = () => {
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = useAuth();
  const { drivers, save, update, remove } = useDrivers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDriver);

  const openNew = () => { setEditId(null); setForm(emptyDriver); setDialogOpen(true); };
  const openEdit = (d: Driver) => { setEditId(d.id); setForm(d); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.cnh) { toast({ title: 'Preencha nome e CNH', variant: 'destructive' }); return; }
    if (editId) {
      await update(editId, form);
    } else {
      await save(form);
    }
    setDialogOpen(false);
    toast({ title: editId ? 'Motorista atualizado' : 'Motorista cadastrado' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast({ title: 'Motorista excluído' });
  };

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (date: string) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Motoristas</h1><p className="text-sm text-muted-foreground">Gestão dos motoristas</p></div>
        {canCreate && <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Novo Motorista</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNH</TableHead><TableHead>Categoria</TableHead><TableHead>Vencimento</TableHead><TableHead className="hidden md:table-cell">Telefone</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {drivers.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.cnh}</TableCell>
                  <TableCell>{d.cnhCategory}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {d.cnhExpiry}
                      {isExpired(d.cnhExpiry) && <Badge className="bg-destructive text-destructive-foreground text-[10px]">Vencida</Badge>}
                      {isExpiringSoon(d.cnhExpiry) && <AlertTriangle className="h-4 w-4 text-warning" />}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{d.phone}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button size="icon" variant="ghost" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
              {drivers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum motorista.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome completo</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNH</Label><Input value={form.cnh} onChange={e => setForm({ ...form, cnh: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={form.cnhCategory} onChange={e => setForm({ ...form, cnhCategory: e.target.value })} placeholder="D" /></div>
            </div>
            <div><Label>Vencimento da CNH</Label><Input type="date" value={form.cnhExpiry} onChange={e => setForm({ ...form, cnhExpiry: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Motoristas;
