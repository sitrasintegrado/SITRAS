import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  role: AppRole | null;
}

const Usuarios = () => {
  const { toast } = useToast();
  const { canManageUsers } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [newForm, setNewForm] = useState({ email: '', password: '', full_name: '', role: 'visualizador' as AppRole });
  const [editForm, setEditForm] = useState({ full_name: '', role: 'visualizador' as AppRole, active: true });

  const fetchUsers = useCallback(async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');
    if (profiles) {
      const roleMap = new Map<string, AppRole>();
      (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      setUsers(profiles.map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        active: p.active,
        role: roleMap.get(p.id) || null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openNew = () => {
    setEditUser(null);
    setNewForm({ email: '', password: '', full_name: '', role: 'visualizador' });
    setDialogOpen(true);
  };

  const openEdit = (u: UserProfile) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name, role: u.role || 'visualizador', active: u.active });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!newForm.email || !newForm.password) {
      toast({ title: 'Preencha e-mail e senha', variant: 'destructive' });
      return;
    }
    // Create user via edge function
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'create', email: newForm.email, password: newForm.password, full_name: newForm.full_name, role: newForm.role },
    });
    if (error) {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usuário criado com sucesso' });
    setDialogOpen(false);
    await fetchUsers();
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    // Update profile
    await supabase.from('profiles').update({
      full_name: editForm.full_name,
      active: editForm.active,
    }).eq('id', editUser.id);

    // Update role
    if (editUser.role !== editForm.role) {
      await supabase.from('user_roles').delete().eq('user_id', editUser.id);
      await supabase.from('user_roles').insert({ user_id: editUser.id, role: editForm.role });
    }

    toast({ title: 'Usuário atualizado' });
    setDialogOpen(false);
    await fetchUsers();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'delete', user_id: id },
    });
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usuário excluído' });
    await fetchUsers();
  };

  const roleBadge = (role: AppRole | null) => {
    if (role === 'admin') return <Badge className="bg-primary text-primary-foreground">Administrador</Badge>;
    if (role === 'gestor') return <Badge className="bg-secondary text-secondary-foreground">Gestor de Frota</Badge>;
    if (role === 'motorista') return <Badge className="bg-accent text-accent-foreground">Motorista</Badge>;
    return <Badge variant="outline">Visualizador</Badge>;
  };

  if (!canManageUsers) {
    return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gestão de usuários e permissões</p>
        </div>
        <Button onClick={openNew} className="bg-secondary hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-1" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'outline'} className={u.active ? 'bg-secondary text-secondary-foreground' : ''}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          {editUser ? (
            <div className="grid gap-3">
              <div><Label>Nome completo</Label><Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div>
                <Label>Perfil de acesso</Label>
                <Select value={editForm.role} onValueChange={(v: AppRole) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador Geral</SelectItem>
                    <SelectItem value="gestor">Gestor de Frota</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editForm.active} onCheckedChange={v => setEditForm({ ...editForm, active: v })} />
                <Label>Usuário ativo</Label>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div><Label>Nome completo</Label><Input value={newForm.full_name} onChange={e => setNewForm({ ...newForm, full_name: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={newForm.email} onChange={e => setNewForm({ ...newForm, email: e.target.value })} /></div>
              <div><Label>Senha</Label><Input type="password" value={newForm.password} onChange={e => setNewForm({ ...newForm, password: e.target.value })} /></div>
              <div>
                <Label>Perfil de acesso</Label>
                <Select value={newForm.role} onValueChange={(v: AppRole) => setNewForm({ ...newForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador Geral</SelectItem>
                    <SelectItem value="gestor">Gestor de Frota</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={editUser ? handleUpdate : handleCreate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
