import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  ShieldCheck, LogOut, ChevronUp, Wrench, CalendarClock, ClipboardList
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

const textVariants = {
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  hidden: { opacity: 0, x: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.04 } },
  hidden: { transition: { staggerChildren: 0.02 } },
};

const itemVariants = {
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  hidden: { opacity: 0, x: -6, transition: { duration: 0.12, ease: 'easeIn' as const } },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, role, canManageUsers, canViewPendingRequests, signOut } = useAuth();

  const mainItems = [
    { title: 'Painel', url: '/', icon: LayoutDashboard },
    { title: 'Agendamentos', url: '/agendamentos', icon: CalendarDays },
    ...(canViewPendingRequests ? [{ title: 'Pendentes', url: '/agendamentos-pendentes', icon: ClipboardList }] : []),
  ];

  const cadastroItems = [
    { title: 'Pacientes', url: '/pacientes', icon: Users },
    { title: 'Veículos', url: '/veiculos', icon: Car },
    { title: 'Motoristas', url: '/motoristas', icon: UserCog },
    { title: 'Manutenção', url: '/manutencao', icon: Wrench },
  ];

  const otherItems = [
    { title: 'Relatórios', url: '/relatorios', icon: FileText },
    ...(canManageUsers ? [
      { title: 'Usuários', url: '/usuarios', icon: ShieldCheck}, 
      {title: 'Banco de Horas', url: '/bancodehoras', icon: CalendarClock}
    ] : []),
  ];

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  const renderMenuItems = (items: typeof mainItems) => (
    <motion.div variants={staggerContainer} initial={false} animate="visible">
      {items.map((item, idx) => (
        <motion.div key={item.title} variants={itemVariants}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
              <NavLink
                to={item.url}
                end
                className="hover:bg-sidebar-accent transition-colors duration-150"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={textVariants}
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={cn("flex items-center gap-3", collapsed ? "p-1 justify-center" : "p-3")}>
          <motion.div
            className={cn(
              "rounded-xl bg-sidebar-accent/50 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-200",
              collapsed ? "h-8 w-8" : "h-10 w-10"
            )}
            whileHover={{ scale: 1.08, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <img src={logo} alt="SITRAS Logo" className={cn("object-contain", collapsed ? "h-6 w-6" : "h-8 w-8")} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="brand"
                className="flex flex-col min-w-0"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <span className="font-bold text-sm text-sidebar-foreground leading-tight tracking-wide">
                  SITRAS
                </span>
                <span className="text-[10px] text-sidebar-foreground/60 leading-tight">
                  Sistema de Transporte da Saúde
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {[
          { label: 'Principal', items: mainItems },
          { label: 'Cadastros', items: cadastroItems },
          { label: 'Sistema', items: otherItems },
        ].map((section) => (
          <SidebarGroup key={section.label}>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  key={section.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
                    {section.label}
                  </SidebarGroupLabel>
                </motion.div>
              )}
            </AnimatePresence>
            <SidebarGroupContent>
              <SidebarMenu>{renderMenuItems(section.items)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="hover:bg-sidebar-accent transition-colors duration-150 data-[state=open]:bg-sidebar-accent"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.div
                        key="user-info"
                        className="flex flex-col min-w-0 flex-1 text-left"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="text-xs font-medium text-sidebar-foreground truncate">
                          {user?.email}
                        </span>
                        {role && (
                          <span className="text-[10px] text-sidebar-foreground/60 truncate">
                            {roleLabels[role]}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: -90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronUp className="ml-auto h-4 w-4 text-sidebar-foreground/40" />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
