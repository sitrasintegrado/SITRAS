import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import Pacientes from "./pages/Pacientes";
import Veiculos from "./pages/Veiculos";
import Motoristas from "./pages/Motoristas";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/veiculos" element={<Veiculos />} />
            <Route path="/motoristas" element={<Motoristas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
