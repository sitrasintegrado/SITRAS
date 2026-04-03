import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import Pacientes from "./pages/Pacientes";
import Veiculos from "./pages/Veiculos";
import Motoristas from "./pages/Motoristas";
import Manutencao from "./pages/Manutencao";
import Relatorios from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";
import MinhaAgenda from "./pages/MinhaAgenda";
import MarcadorPortal from "./pages/MarcadorPortal";
import AgendamentosPendentes from "./pages/AgendamentosPendentes";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import BancodeHoras from "./pages/BancodeHoras";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, isDriver, isMarcador } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Login />;

  // Driver portal - standalone page, no sidebar
  if (isDriver) {
    return <MinhaAgenda />;
  }

  // Marcador portal - standalone simplified interface
  if (isMarcador) {
    return <MarcadorPortal />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agendamentos" element={<Agendamentos />} />
        <Route path="/agendamentos-pendentes" element={<AgendamentosPendentes />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/veiculos" element={<Veiculos />} />
        <Route path="/motoristas" element={<Motoristas />} />
        <Route path="/manutencao" element={<Manutencao />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/bancodehoras" element={<BancodeHoras/>}/>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
