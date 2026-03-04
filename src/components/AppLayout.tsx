import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';

const roleLabels = {
  admin: 'Administrador',
  gestor: 'Gestor de Frota',
  visualizador: 'Visualizador',
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-primary">SITRAS Saúde</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">Sistema de Transporte da Saúde</span>
            <div className="ml-auto flex items-center gap-3">
              {role && (
                <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                  {roleLabels[role]}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground hidden md:inline">{user?.email}</span>
              <Button size="icon" variant="ghost" onClick={signOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
