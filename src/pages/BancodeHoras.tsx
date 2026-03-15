'use client'
import { useState, useMemo } from 'react'
import { Input } from "@/components/ui/input"
import { useDrivers , useBancoHoras } from '@/hooks/use-supabase-data' 
import { toast } from 'sonner'

export default function ControleBancoHoras() {
  // 1. Estados locais para a interface e formulário
  const [motoristaSelecionado, setMotoristaSelecionado] = useState<string>('')
  const [tipo, setTipo] = useState<'credito' | 'debito'>('credito')
  const [horas, setHoras] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0])
  const [salvando, setSalvando] = useState(false)
  const { drivers, loading: loadingDrivers } = useDrivers()
  const { registros, loading: loadingRegistros, save: salvarRegistro } = useBancoHoras(motoristaSelecionado)

  // 3. Calculando o Saldo (useMemo garante que só recalcula se os registros mudarem)
  const saldo = useMemo(() => {
    return registros.reduce((acc, registro) => {
      return registro.tipo === 'credito' 
        ? acc + registro.quantidadeHoras
        : acc - registro.quantidadeHoras
    }, 0)
  }, [registros])

  // Função que transforma 1.75 em "01h45m"
    function decimalParaRelogio(decimal: number) {
    // Pega o valor absoluto para evitar problemas com saldos negativos
    const valorAbsoluto = Math.abs(decimal);
    
    // Extrai apenas a parte inteira (as horas)
    const horas = Math.floor(valorAbsoluto);
    
    // Pega o que sobrou (ex: 0.75) e multiplica por 60 para achar os minutos
    const minutos = Math.round((valorAbsoluto - horas) * 60);

    // Formata com dois dígitos (ex: "01" em vez de "1")
    const horasFormatadas = String(horas).padStart(2, '0');
    const minutosFormatados = String(minutos).padStart(2, '0');

    return `${horasFormatadas}h${minutosFormatados}m`;
    }

  // 4. Função para enviar o formulário
  async function handleSalvarRegistro(e: React.FormEvent) {
    e.preventDefault()
    if (!motoristaSelecionado || !horas || !descricao) return alert("Preencha todos os campos!")

    setSalvando(true)
        try {
            // Quebra o '01:45' em horas ('01') e minutos ('45')
            const [h, m] = horas.split(':');
            
            // Converte para decimal: 1 + (45 / 60) = 1.75
            const horasDecimais = Number(h) + (Number(m) / 60);

            await salvarRegistro({
            idMotorista: motoristaSelecionado,
            tipo,
            quantidadeHoras: horasDecimais, // <-- Salva o valor convertido no banco!
            descricao,
            dataRegistro
            })

            setHoras('')
            setDescricao('')
        } catch (error) { toast.error(error) }
    }

  return (
    <div className='space-y-6'>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold"> Banco de Horas </h1>
                <p className="text-sm text-muted-foreground"> Gerencie o Banco de Horas dos Motoristas </p>
            </div>
        </div>
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* COLUNA ESQUERDA: Seleção e Formulário */}
      <div className="md:col-span-1 space-y-6">
        
        {/* Seletor de Motorista */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Motorista</label>
          <select 
            className="w-full border rounded-md p-2 bg-slate-50 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            value={motoristaSelecionado}
            onChange={(e) => setMotoristaSelecionado(e.target.value)}
            disabled={loadingDrivers}
          >
            <option value="">
              {loadingDrivers ? 'Carregando motoristas...' : '-- Escolha um motorista --'}
            </option>
            {drivers.map(motorista => (
              <option key={motorista.id} value={motorista.id}>
                {motorista.name}
              </option>
            ))}
          </select>
        </div>

        {/* Formulário de Lançamento (Só aparece se um motorista estiver selecionado) */}
        {motoristaSelecionado && (
          <form onSubmit={handleSalvarRegistro} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-800">Novo Lançamento</h3>
            
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${tipo === 'credito' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setTipo('credito')}
              >
                + Adicionar
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${tipo === 'debito' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setTipo('debito')}
              >
                - Descontar
              </button>
            </div>

            <div>
              <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tempo (HH:MM)</label>
                    <Input 
                        type="time" 
                        required 
                        value={horas} 
                        onChange={e => setHoras(e.target.value)} 
                    />
                </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Motivo / Descrição</label>
              <Input 
                type="text" required 
                value={descricao} onChange={e => setDescricao(e.target.value)} 
                placeholder="Ex: Viagem extra SP, Atraso..." 
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
              <Input 
                type="date" required 
                value={dataRegistro} onChange={e => setDataRegistro(e.target.value)} 
              />
            </div>

            <button 
              type="submit"
              disabled={salvando} 
              className="w-full bg-slate-900 text-white py-2.5 rounded-md font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </form>
        )}
      </div>

      {/* COLUNA DIREITA: Saldo e Histórico */}
      <div className="md:col-span-2 space-y-6">
        {motoristaSelecionado ? (
          <>
            {/* Display do Saldo */}
            <div className={`p-6 rounded-lg shadow-sm border text-center transition-colors ${saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h2 className="text-lg text-gray-600 font-medium">Saldo Atual de Horas</h2>
                <p className={`text-5xl font-extrabold mt-2 ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {saldo > 0 ? '+' : saldo < 0 ? '-' : ''} {decimalParaRelogio(saldo)}
                </p>
            </div>

            {/* Tabela de Histórico */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">Histórico de Lançamentos</div>
              
              {loadingRegistros ? (
                <div className="p-8 text-center text-gray-500">
                  <span className="animate-pulse">Carregando histórico...</span>
                </div>
              ) : registros.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-100/50 text-gray-500">
                        <th className="p-3 font-medium">Data</th>
                        <th className="p-3 font-medium">Motivo</th>
                        <th className="p-3 font-medium text-right">Horas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {registros.map(reg => (
                        <tr key={reg.idRegistro} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 text-gray-600">
                                {/* O JS precisa do 'T00:00:00' para não errar o fuso horário em datas YYYY-MM-DD */}
                                {new Date(`${reg.dataRegistro}T00:00:00`).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3 font-medium text-gray-800">{reg.descricao}</td>
                            <td className={`p-3 text-right font-bold ${reg.tipo === 'credito' ? 'text-green-600' : 'text-red-600'}`}>
                                {/* Aplica a função aqui também! */}
                                {reg.tipo === 'credito' ? '+' : '-'} {decimalParaRelogio(reg.quantidadeHoras)}
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500">
                  <p className="italic">Nenhum lançamento encontrado.</p>
                  <p className="text-sm mt-1">Utilize o formulário ao lado para adicionar horas.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded-lg text-gray-400 p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-gray-500">Selecione um motorista</p>
            <p className="text-sm mt-1">Escolha um motorista no menu ao lado para gerenciar seu banco de horas.</p>
          </div>
        )}
      </div>

    </div>
    </div>
  )
}