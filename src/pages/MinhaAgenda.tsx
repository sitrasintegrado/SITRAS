import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Clock, MapPin, Car, Users, Navigation, UserPlus, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportDriverSchedulePDF } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

interface DriverTrip {
  id: string;
  departureTime: string;
  destination: string;
  consultLocation: string;
  status: string;
  vehiclePlate: string;
  vehicleType: string;
  passengers: { name: string; hasCompanion: boolean }[];
}

const statusColors: Record<string, string> = {
  Confirmada: 'bg-blue-500/15 text-blue-700 border-blue-300',
  Concluída: 'bg-green-500/15 text-green-700 border-green-300',
  Cancelada: 'bg-red-500/15 text-red-700 border-red-300',
};

const MinhaAgenda = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get driver record linked to this user
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, name')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      setLoading(false);
      return;
    }

    setDriverName(driver.name);

    const today = new Date().toISOString().split('T')[0];

    // Get today's trips for this driver
    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('date', today)
      .order('departure_time');

    if (!tripsData || tripsData.length === 0) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const tripIds = tripsData.map(t => t.id);

    // Get passengers
    const { data: passData } = await supabase
      .from('trip_passengers')
      .select('trip_id, patient_id, has_companion')
      .in('trip_id', tripIds);

    // Get patient names
    const patientIds = [...new Set((passData || []).map(p => p.patient_id))];
    const { data: patientsData } = patientIds.length > 0
      ? await supabase.from('patients').select('id, name').in('id', patientIds)
      : { data: [] };

    const patientMap = new Map((patientsData || []).map(p => [p.id, p.name]));

    // Get vehicle info
    const vehicleIds = [...new Set(tripsData.filter(t => t.vehicle_id).map(t => t.vehicle_id!))];
    const { data: vehiclesData } = vehicleIds.length > 0
      ? await supabase.from('vehicles').select('id, plate, type').in('id', vehicleIds)
      : { data: [] };

    const vehicleMap = new Map((vehiclesData || []).map(v => [v.id, v]));

    // Map passengers per trip
    const passMap = new Map<string, { name: string; hasCompanion: boolean }[]>();
    (passData || []).forEach(p => {
      const arr = passMap.get(p.trip_id) || [];
      arr.push({ name: patientMap.get(p.patient_id) || 'Paciente', hasCompanion: p.has_companion });
      passMap.set(p.trip_id, arr);
    });

    setTrips(tripsData.map(t => {
      const v = vehicleMap.get(t.vehicle_id || '');
      return {
        id: t.id,
        departureTime: t.departure_time,
        destination: t.destination,
        consultLocation: t.consult_location,
        status: t.status,
        vehiclePlate: v?.plate || '-',
        vehicleType: v?.type || '-',
        passengers: passMap.get(t.id) || [],
      };
    }));

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
              <img src={logo} alt="SITRAS" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Minha Agenda</p>
              <p className="text-[11px] opacity-80 leading-tight">{driverName || user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-primary-foreground hover:bg-white/20"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Date bar */}
      <div className="px-4 py-3 border-b bg-muted/50">
        <p className="text-sm font-medium text-foreground capitalize">{todayFormatted}</p>
      </div>

      {/* Content */}
      <main className="px-4 py-4 pb-24 space-y-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium">
            {trips.length} viagen{trips.length !== 1 ? 's' : ''} hoje
          </p>
          <Button variant="outline" size="sm" onClick={fetchTrips} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Carregando agenda...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Nenhuma viagem para hoje</p>
            <p className="text-xs text-muted-foreground/70">Suas viagens agendadas aparecerão aqui</p>
          </div>
        ) : (
          trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden border shadow-sm">
              {/* Time + Status header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-lg font-bold text-foreground">{trip.departureTime || '--:--'}</span>
                </div>
                <Badge variant="outline" className={`text-xs font-medium ${statusColors[trip.status] || ''}`}>
                  {trip.status}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Destination */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="text-sm font-medium text-foreground">{trip.destination || '-'}</p>
                  </div>
                </div>

                {/* Departure location */}
                <div className="flex items-start gap-3">
                  <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Local de Saída</p>
                    <p className="text-sm font-medium text-foreground">{trip.consultLocation || '-'}</p>
                  </div>
                </div>

                {/* Vehicle */}
                <div className="flex items-start gap-3">
                  <Car className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Veículo</p>
                    <p className="text-sm font-medium text-foreground">{trip.vehicleType} — {trip.vehiclePlate}</p>
                  </div>
                </div>

                {/* Passengers */}
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Paciente(s)</p>
                    {trip.passengers.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhum paciente</p>
                    ) : (
                      trip.passengers.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 mt-1">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          {p.hasCompanion && (
                            <Badge variant="outline" className="text-[10px] gap-1 py-0 px-1.5">
                              <UserPlus className="h-3 w-3" /> Acomp.
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default MinhaAgenda;
