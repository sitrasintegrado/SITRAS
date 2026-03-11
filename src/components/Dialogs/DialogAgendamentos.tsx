import { useMemo, useState } from "react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Ban } from "lucide-react";
import {useTrips,useVehicles,useDrivers,usePatients,} from "@/hooks/use-supabase-data";
import { BuscaPaciente } from "@/components/BuscaPaciente"; // novo componente de busca
import { DialogAgendamento } from "@/types";
import OccupancyBar from "../OccupancyBar";
import { useAuth } from "@/contexts/AuthContext";

export default function DialogAgendamentos({
  form,
  dialogOpen,
  setDialogOpen,
  setForm,
  currentVehicle,
  editId,
  isFull,
  usedSeats,
}: DialogAgendamento) {
  const { toast } = useToast();
  const { canSetMotorista } = useAuth();
  const { trips, save, update, remove } = useTrips();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [searchKey, setSearchKey] = useState(0);
  const [acompanhante, setAcompanhante] = useState(false);
  const available = currentVehicle ? currentVehicle.capacity - usedSeats : 0;
  const vehicleOccupancyOnDate = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      if (t.date === form.date && t.status !== "Cancelada" && t.id !== editId) {
        const seats = t.passengers.reduce(
          (s, p) => s + 1 + (p.hasCompanion ? 1 : 0),
          0,
        );
        map.set(t.vehicleId, (map.get(t.vehicleId) || 0) + seats);
      }
    });
    return map;
  }, [trips, form.date, editId]);

  const togglePassenger = (patientId: string) => {
    const exists = form.passengers.find((p) => p.patientId === patientId);
    if (exists) {
      setForm({
        ...form,
        passengers: form.passengers.filter((p) => p.patientId !== patientId),
      });
    } else {
      if (currentVehicle && available <= 0) {
        toast({
          title: "Veículo lotado!",
          description: "Não é possível adicionar mais passageiros.",
          variant: "destructive",
        });
        return;
      }
      setForm({
        ...form,
        passengers: [
          ...form.passengers,
          { patientId, hasCompanion: acompanhante },
        ],
      });
    }
  };

  // helper called pelo campo de busca
  const handleAddPaciente = (id: number) => {
    if (!id) return;
    const stringId = id.toString();
    // ignora duplicados
    if (form.passengers.some((p) => p.patientId === stringId)) return;

    if (currentVehicle && available <= 0) {
      toast({
        title: "Veículo lotado!",
        description: "Não é possível adicionar mais passageiros.",
        variant: "destructive",
      });
      return;
    }

    setForm({
      ...form,
      passengers: [
        ...form.passengers,
        { patientId: stringId, hasCompanion: false },
      ],
    });

    // limpa o campo de busca
    setSearchKey((k) => k + 1);
  };

  const handleSave = async () => {
    if (!form.destination) {
      // !form.vehicleId
      toast({
        title: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    if (currentVehicle && usedSeats > currentVehicle.capacity) {
      toast({
        title: "Capacidade do veículo excedida!",
        description: `Máximo: ${currentVehicle.capacity} vagas`,
        variant: "destructive",
      });
      return;
    }
    if (editId) {
      await update(editId, form);
    } else {
      await save(form);
    }
    setDialogOpen(false);
    toast({ title: editId ? "Viagem atualizada" : "Viagem criada" });
  };

  const toggleCompanion = (patientId: string) => {
    const passenger = form.passengers.find((p) => p.patientId === patientId);
    if (!passenger) return;
    if (!passenger.hasCompanion && currentVehicle && available <= 0) {
      toast({ title: "Sem vagas para acompanhante", variant: "destructive" });
      return;
    }
    setForm({
      ...form,
      passengers: form.passengers.map((p) =>
        p.patientId === patientId ? { ...p, hasCompanion: !p.hasCompanion } : p,
      ),
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar Viagem" : "Nova Viagem"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário da Consulta</Label>
              <Input
                type="time"
                value={form.departureTime}
                onChange={(e) =>
                  setForm({ ...form, departureTime: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Destino</Label>
              <Input
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
                placeholder="Município"
              />
            </div>
            <div>
              <Label>Local da consulta</Label>
              <Input
                value={form.consultLocation}
                onChange={(e) =>
                  setForm({ ...form, consultLocation: e.target.value })
                }
                placeholder="Hospital/Clínica"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Veículo</Label>
              <Select
                value={form.vehicleId}
                onValueChange={(v) => setForm({ ...form, vehicleId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {canSetMotorista
                    ? vehicles
                        .filter((v) => v.status === "Ativo")
                        .map((v) => {
                          const otherSeats = vehicleOccupancyOnDate.get(v.id) || 0;
                          const vehicleFull = otherSeats >= v.capacity;
                          return (
                            <SelectItem
                              key={v.id}
                              value={v.id}
                              disabled={vehicleFull}
                            >
                              {v.type} - {v.plate} ({v.capacity - otherSeats}/
                              {v.capacity} vagas)
                              {vehicleFull && " — LOTADO"}
                            </SelectItem>
                          );
                        })
                    : vehicles
                        .filter((v) => v.status === "Ativo" && v.capacity >= 30)
                        .map((v) => {
                          const otherSeats = vehicleOccupancyOnDate.get(v.id) || 0;
                          const vehicleFull = otherSeats >= v.capacity;
                          return (
                            <SelectItem
                              key={v.id}
                              value={v.id}
                              disabled={vehicleFull}
                            >
                              {v.type} - {v.plate} ({v.capacity - otherSeats}/
                              {v.capacity} vagas)
                              {vehicleFull && " — LOTADO"}
                            </SelectItem>
                          );
                        })}
                </SelectContent>
              </Select>
            </div>
            {canSetMotorista && (
              <div>
                <Label>Motorista</Label>
                <Select
                  value={form.driverId}
                  onValueChange={(v) => setForm({ ...form, driverId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v: any) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Confirmada">Confirmada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* seção de pacientes: sempre visível, busca com autocomplete */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Pacientes</Label>
              {currentVehicle && isFull && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <Ban className="h-3 w-3" /> Veículo Lotado
                </Badge>
              )}
            </div>

            {/* mostra barra de ocupação apenas quando há veículo selecionado */}
            {currentVehicle && (
              <OccupancyBar used={usedSeats} total={currentVehicle.capacity} />
            )}

            {/* campo de busca para adicionar passageiros */}
            <BuscaPaciente key={searchKey} onSelectPaciente={togglePassenger} />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acompanhante"
                checked={acompanhante}
                // O shadcn pode retornar "indeterminate", então garantimos que seja sempre booleano
                onCheckedChange={(checked) =>
                  setAcompanhante(checked === true)
                }
              />
              <Label
                htmlFor="acompanhante"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Paciente requer acompanhante?
              </Label>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              currentVehicle ? usedSeats > currentVehicle.capacity : false
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
