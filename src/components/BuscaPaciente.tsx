import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { usePatients } from '@/hooks/use-supabase-data';
import { Patient } from '@/types';

interface BuscaPacienteProps {
  onSelectPaciente: (id: string) => void; 
}

export function BuscaPaciente({ onSelectPaciente }: BuscaPacienteProps) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  
  // Novos estados para resolver o bug e adicionar o form
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Estado para o formulário do novo paciente
  const [formData, setFormData] = useState<Omit<Patient, 'id'>>({
    name: '', cpf: '', phone: '', address: '', notes: ''
  })

  // Hook customizado com a função save
  const { patients, save } = usePatients();

  useEffect(() => {
    // CORREÇÃO DO BUG: Se o usuário acabou de selecionar um paciente da lista, 
    // nós não queremos que o useEffect rode a busca e abra o menu de novo.
    if (idSelecionado) return;

    if (busca.length < 2) {
      setResultados([])
      setMenuAberto(false)
      return
    }

    const delayBusca = setTimeout(() => {
      setLoading(true)

      const termoBusca = busca.toLowerCase()

      const pacientesEncontrados = patients
        .filter((paciente) => paciente.name.toLowerCase().includes(termoBusca))
        .slice(0, 5)
      
      setResultados(pacientesEncontrados)
      setMenuAberto(true)
      setLoading(false)
    }, 500)

    return () => clearTimeout(delayBusca)
  }, [busca, patients, idSelecionado]) 

  function handleSelecionar(paciente: Patient) {
    setIdSelecionado(paciente.id) // Avisa o sistema que uma seleção foi feita
    setBusca(paciente.name)
    setMenuAberto(false)
    onSelectPaciente(paciente.id)
  }

  // Função para salvar o novo paciente
  async function handleSaveNewPatient() {
    if (!formData.name) return; // Validação básica
    
    setSaving(true)
    try {
      const novoPaciente = await save(formData);
      
      if (novoPaciente) {
        // Se salvou com sucesso, seleciona ele automaticamente e fecha o form
        handleSelecionar(novoPaciente);
        setIsAdding(false);
      }
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
    } finally {
      setSaving(false)
    }
  }

  // Se o usuário clicou em "Adicionar", mostramos o formulário ao invés da busca
  if (isAdding) {
    return (
      <div className="w-full p-4 border rounded-md bg-slate-50 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Adicionar Novo Paciente</h3>
        <div className="space-y-2">
          <Input placeholder="Nome Completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          <Input placeholder="CPF" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} />
          <Input placeholder="Telefone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          <Input placeholder="Endereço" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
          <Input placeholder="Observações (Opcional)" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button 
            type="button" 
            onClick={() => setIsAdding(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSaveNewPatient}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Salvando...' : 'Salvar e Selecionar'}
          </button>
        </div>
      </div>
    )
  }

  // Renderização normal do campo de busca
  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder="Digite o nome do paciente..."
        value={busca}
        onChange={(e) => {
          setIdSelecionado(null) // Se o usuário voltou a digitar, remove a trava de seleção
          setBusca(e.target.value)
          if (e.target.value === '') onSelectPaciente('') 
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} 
      />

      {/* Dropdown Flutuante */}
      {menuAberto && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-auto flex flex-col">
          {loading ? (
            <div className="p-3 text-sm text-gray-500 text-center">Buscando...</div>
          ) : resultados.length > 0 ? (
            <>
              <ul className="py-1">
                {resultados.map((paciente) => (
                  <li
                    key={paciente.id}
                    className="px-3 py-2 text-sm hover:bg-slate-100 text-black cursor-pointer transition-colors"
                    onClick={() => handleSelecionar(paciente)}
                  >
                    {paciente.name}
                  </li>
                ))}
              </ul>
              {/* Botão de adicionar no final da lista se o paciente não for encontrado */}
              <div className="p-2 border-t bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, name: busca }); // Já preenche o nome com o que foi digitado
                    setIsAdding(true);
                  }}
                  className="w-full py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded text-center transition-colors"
                >
                  + Adicionar "{busca}"
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
              <span>Nenhum paciente encontrado.</span>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, name: busca });
                  setIsAdding(true);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Adicionar Novo Paciente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}