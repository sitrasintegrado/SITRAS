import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, Users, Car, UserCog, FileText, ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo.png';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { canManageUsers } = useAuth();

  const items = [
    { title: 'Painel', url: '/', icon: LayoutDashboard },
    { title: 'Agendamentos', url: '/agendamentos', icon: CalendarDays },
    { title: 'Pacientes', url: '/pacientes', icon: Users },
    { title: 'Veículos', url: '/veiculos', icon: Car },
    { title: 'Motoristas', url: '/motoristas', icon: UserCog },
    { title: 'Relatórios', url: '/relatorios', icon: FileText },
    ...(canManageUsers ? [{ title: 'Usuários', url: '/usuarios', icon: ShieldCheck }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <img src={logo} alt="SITRAS Logo" className="h-9 w-9 rounded-lg shrink-0 object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-sidebar-foreground leading-tight">SITRAS</span>
              <span className="text-[10px] text-sidebar-foreground/70 leading-tight">Saúde</span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
