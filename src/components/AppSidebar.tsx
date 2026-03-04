import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, CalendarDays, Users, Car, UserCog, FileText,
  ShieldCheck, LogOut, ChevronUp, Settings, HelpCircle, User,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import logo from '@/assets/logo.png';

const roleLabels = {
  admin: 'Administrador',
  gestor: 'Gestor de Frota',
  visualizador: 'Visualizador',
};

const roleBadgeClass = {
  admin: 'bg-primary/20 text-primary border-primary/30',
  gestor: 'bg-secondary/20 text-secondary border-secondary/30',
  visualizador: 'bg-muted text-muted-foreground border-border',
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, role, canManageUsers, signOut } = useAuth();

  const mainItems = [
    { title: 'Painel', url: '/', icon: LayoutDashboard },
    { title: 'Agendamentos', url: '/agendamentos', icon: CalendarDays },
  ];

  const cadastroItems = [
    { title: 'Pacientes', url: '/pacientes', icon: Users },
    { title: 'Veículos', url: '/veiculos', icon: Car },
    { title: 'Motoristas', url: '/motoristas', icon: UserCog },
  ];

  const otherItems = [
    { title: 'Relatórios', url: '/relatorios', icon: FileText },
    ...(canManageUsers ? [{ title: 'Usuários', url: '/usuarios', icon: ShieldCheck }] : []),
  ];

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  const renderMenuItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            className="hover:bg-sidebar-accent transition-colors duration-150"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      {/* Header with logo */}
      <SidebarHeader>
        <div className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sidebar-accent/50 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={logo} alt="SITRAS Logo" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-sidebar-foreground leading-tight tracking-wide">
                SITRAS
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 leading-tight">
                Sistema de Transporte da Saúde
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Cadastros */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Cadastros
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(cadastroItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sistema */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(otherItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with user profile */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="hover:bg-sidebar-accent transition-colors duration-150 data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <span className="text-xs font-medium text-sidebar-foreground truncate">
                        {user?.email}
                      </span>
                      {role && (
                        <span className="text-[10px] text-sidebar-foreground/60 truncate">
                          {roleLabels[role]}
                        </span>
                      )}
                    </div>
                  )}
                  {!collapsed && <ChevronUp className="ml-auto h-4 w-4 text-sidebar-foreground/40" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 rounded-xl"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{user?.email}</p>
                    {role && (
                      <Badge variant="outline" className={`w-fit text-[10px] ${roleBadgeClass[role]}`}>
                        {roleLabels[role]}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
