import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BuscaPaciente } from '@/components/BuscaPaciente';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trip, FixedTrip } from '@/types';
import { MapPin } from 'lucide-react';

const CONSULT_LOCATIONS = ['Ame de Sorocaba', 'Ame de Itu', 'Adib Sorocaba'];
const DESTINATIONS = ['Sorocaba', 'Itu', 'São Paulo'];
const BOARDING_LOCATIONS = ['Rodoviária de Tapiraí', 'Rodoviária do Turvo'];

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trips: Trip[];
  fixedTrips: FixedTrip[];
  onSaved: () => void;
  selectedDate: string;
}

export default function BookingDialog({ open, onOpenChange, trips, fixedTrips, onSaved, selectedDate }: BookingDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [form, setForm] = useState({
    patientId: '',
    date: selectedDate,
    consultTime: '',
    consultLocation: '',
    consultLocationCustom: '',
    destination: '',
    destinationCustom: '',
    fixedTripId: '',
    boardingLocation: '',
    boardingLocationCustom: '',
    hasCompanion: false,
    isPcd: false,
  });

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setForm(f => ({ ...f, date: selectedDate, patientId: '', consultTime: '', consultLocation: '', consultLocationCustom: '', destination: '', destinationCustom: '', fixedTripId: '', boardingLocation: '', boardingLocationCustom: '', hasCompanion: false, isPcd: false }));
      setSearchKey(k => k + 1);
    }
    onOpenChange(isOpen);
  };

  // Available trips for the selected date (only non-cancelled, non-concluded)
  const availableTrips = useMemo(() => {
    return trips.filter(t =>
      t.date === form.date &&
      t.status !== 'Cancelada' && t.status !== 'Concluída' && t.status !== 'Finalizada'
    );
  }, [trips, form.date]);

  const resolvedConsultLocation = form.consultLocation === '__custom__' ? form.consultLocationCustom : form.consultLocation;
  const resolvedDestination = form.destination === '__custom__' ? form.destinationCustom : form.destination;
  const resolvedBoarding = form.boardingLocation === '__custom__' ? form.boardingLocationCustom : form.boardingLocation;

  const handleSave = async () => {
    if (!form.patientId) {
      toast({ title: 'Selecione um paciente', variant: 'destructive' });
      return;
    }
    if (!form.date) {
      toast({ title: 'Informe a data', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let tripId = '';

      if (form.fixedTripId) {
        // Check if a trip already exists for this date + fixed_trip
        const existingTrip = availableTrips.find(t => t.fixedTripId === form.fixedTripId);
        if (existingTrip) {
          tripId = existingTrip.id;
        } else {
          // Create trip from fixed template
          const ft = fixedTrips.find(f => f.id === form.fixedTripId);
          if (!ft) {
            toast({ title: 'Viagem fixa não encontrada', variant: 'destructive' });
            setSaving(false);
            return;
          }

          const { error } = await supabase.from('trips').insert({
            date: form.date,
            departure_time: ft.departureTime,
            destination: resolvedDestination || ft.defaultDestination,
            consult_location: '',
            notes: '',
            status: 'Aguardando Motorista' as any,
            driver_id: null,
            vehicle_id: null,
            transport_request_id: null,
            fixed_trip_id: ft.id,
          } as any);

          if (error) {
            toast({ title: 'Erro ao criar viagem', description: error.message, variant: 'destructive' });
            setSaving(false);
            return;
          }

          // Fetch the newly created trip
          const { data: newTrips } = await (supabase.from('trips') as any)
            .select('id')
            .eq('date', form.date)
            .eq('fixed_trip_id', ft.id)
            .order('created_at', { ascending: false })
            .limit(1);

          tripId = newTrips?.[0]?.id || '';
        }
      }

      if (!tripId) {
        toast({ title: 'Selecione uma viagem', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Add passenger to trip
      const { error: passError } = await supabase.from('trip_passengers').insert({
        trip_id: tripId,
        patient_id: form.patientId,
        has_companion: form.hasCompanion,
        is_pcd: form.isPcd,
        boarding_location: resolvedBoarding,
        consult_time: form.consultTime,
        consult_location: resolvedConsultLocation,
      } as any);

      if (passError) {
        toast({ title: 'Erro ao adicionar passageiro', description: passError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      toast({ title: 'Marcação salva com sucesso!' });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro inesperado', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Marcação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 1. Paciente */}
          <div>
            <Label>Paciente</Label>
            <BuscaPaciente key={searchKey} onSelectPaciente={(id) => setForm({ ...form, patientId: id })} />
          </div>

          {/* 2. Data */}
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* 3. Horário da consulta */}
          <div>
            <Label>Horário da Consulta</Label>
            <Input type="time" value={form.consultTime} onChange={e => setForm({ ...form, consultTime: e.target.value })} />
          </div>

          {/* 4. Local da consulta */}
          <div>
            <Label>Local da Consulta (Hospital)</Label>
            <Select value={form.consultLocation} onValueChange={v => setForm({ ...form, consultLocation: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {CONSULT_LOCATIONS.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
                <SelectItem value="__custom__">Outro (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {form.consultLocation === '__custom__' && (
              <Input className="mt-2" placeholder="Digite o local..." value={form.consultLocationCustom}
                onChange={e => setForm({ ...form, consultLocationCustom: e.target.value })} />
            )}
          </div>

          {/* 5. Destino */}
          <div>
            <Label>Destino (Município)</Label>
            <Select value={form.destination} onValueChange={v => setForm({ ...form, destination: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
                <SelectItem value="__custom__">Outro (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {form.destination === '__custom__' && (
              <Input className="mt-2" placeholder="Digite o destino..." value={form.destinationCustom}
                onChange={e => setForm({ ...form, destinationCustom: e.target.value })} />
            )}
          </div>

          {/* 6. Viagem */}
          <div>
            <Label>Viagem</Label>
            <Select value={form.fixedTripId} onValueChange={v => setForm({ ...form, fixedTripId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a viagem" /></SelectTrigger>
              <SelectContent>
                {fixedTrips.filter(ft => ft.isActive).map(ft => {
                  const existingTrip = availableTrips.find(t => t.fixedTripId === ft.id);
                  const passengerCount = existingTrip?.passengers?.length || 0;
                  return (
                    <SelectItem key={ft.id} value={ft.id}>
                      {ft.label}{ft.departureTime ? ` (${ft.departureTime})` : ''}
                      {existingTrip ? ` — ${passengerCount} passag.` : ' — Nova'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 7. Local de embarque */}
          <div>
            <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Local de Embarque</Label>
            <div className="flex gap-2 mt-1 mb-2">
              {BOARDING_LOCATIONS.map(loc => (
                <Button key={loc} type="button" size="sm"
                  variant={form.boardingLocation === loc ? 'default' : 'outline'}
                  className="text-xs"
                  onClick={() => setForm({ ...form, boardingLocation: loc })}>
                  {loc}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm"
                variant={form.boardingLocation === '__custom__' ? 'default' : 'outline'}
                className="text-xs"
                onClick={() => setForm({ ...form, boardingLocation: '__custom__' })}>
                Outro
              </Button>
              {form.boardingLocation === '__custom__' && (
                <Input className="flex-1" placeholder="Digite o local..."
                  value={form.boardingLocationCustom}
                  onChange={e => setForm({ ...form, boardingLocationCustom: e.target.value })} />
              )}
            </div>
          </div>

          {/* 8. Checkboxes */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.hasCompanion}
                onCheckedChange={c => setForm({ ...form, hasCompanion: !!c })} />
              <Label className="text-sm">Acompanhante</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isPcd}
                onCheckedChange={c => setForm({ ...form, isPcd: !!c })} />
              <Label className="text-sm">PCD</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Marcação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
