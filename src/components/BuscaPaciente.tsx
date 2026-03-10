import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { usePatients } from '@/hooks/use-supabase-data';
import { Patient } from '@/types';

interface BuscaPacienteProps {
  // Alterado para aceitar string (pois na interface Patient o id é string)
  // Se no seu formulário pai o ID precisa ser número, você pode fazer uma conversão depois
  onSelectPaciente: (id: string) => void; 
}

export function BuscaPaciente({ onSelectPaciente }: BuscaPacienteProps) {
  const [busca, setBusca] = useState('')
  // Atualizado para usar a interface Patient
  const [resultados, setResultados] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  
  // Lista vinda do Supabase
  const { patients } = usePatients();

  useEffect(() => {
    // Só começa a buscar se tiver pelo menos 2 letras
    if (busca.length < 2) {
      setResultados([])
      setMenuAberto(false)
      return
    }

    // Cria o delay (Debounce)
    const delayBusca = setTimeout(() => {
      setLoading(true)
      
      // Converte o que o usuário digitou para letras minúsculas para facilitar a busca
      const termoBusca = busca.toLowerCase()

      // Filtra os pacientes que incluem o nome digitado E limita a 5 resultados
      const pacientesEncontrados = patients
        .filter((paciente) => paciente.name.toLowerCase().includes(termoBusca))
        .slice(0, 5) // <-- Limita para mostrar apenas 5!
      
      setResultados(pacientesEncontrados)
      setMenuAberto(true)
      setLoading(false)
    }, 500) // Aguarda 500ms após a última tecla digitada

    // Limpa o timer se o usuário digitar algo antes dos 500ms
    return () => clearTimeout(delayBusca)
  }, [busca, patients]) // É bom adicionar o 'patients' aqui para o React não reclamar de dependências

  function handleSelecionar(paciente: Patient) {
    setBusca(paciente.name) // Preenche o input com o nome do paciente
    setMenuAberto(false) // Fecha a lista
    onSelectPaciente(paciente.id) // Passa o ID pra cima!
  }

  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder="Digite o nome do paciente..."
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value)
          // Se o usuário apagar tudo, avisa o form pai passando vazio ou zero
          if (e.target.value === '') onSelectPaciente('') 
        }}
        // Previne que o form faça submit ao apertar Enter enquanto busca
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} 
      />

      {/* Dropdown Flutuante */}
      {menuAberto && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-3 text-sm text-gray-500 text-center">Buscando...</div>
          ) : resultados.length > 0 ? (
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
          ) : (
            <div className="p-3 text-sm text-gray-500 text-center"> Nenhum paciente encontrado. </div>
          )}
        </div>
      )}
    </div>
  )
}