export const fmt = (n, decimals = 2) => {
  if (n == null || n === '') return '—'
  const num = parseFloat(n)
  if (isNaN(num)) return n
  return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export const fmtInt = (n) => {
  if (n == null) return '—'
  return Math.round(parseFloat(n)).toLocaleString('pt-BR')
}

export const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') } catch { return d }
}

export const fmtCurrency = (n) => {
  if (n == null) return '—'
  return 'R$ ' + fmt(n)
}

export const fmtDays = (n) => {
  if (n == null) return '—'
  const d = Math.round(parseFloat(n))
  return d === 1 ? '1 dia' : `${d} dias`
}

export const statusEmbarque = (dataEmbarque, qtdPendente) => {
  if (!dataEmbarque) return 'SEM_DATA'
  if (parseFloat(qtdPendente) <= 0) return 'ENTREGUE'
  const hoje = new Date()
  const dt = new Date(dataEmbarque + 'T00:00:00')
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24))
  if (diff > 0) return 'ALERTA'
  if (diff >= -3) return 'EM_BREVE'
  return 'NO_PRAZO'
}

export const statusEntrega = (dataEntrega, qtdPendente) => {
  if (!dataEntrega) return 'SEM_DATA'
  if (parseFloat(qtdPendente) <= 0) return 'ENTREGUE'
  const hoje = new Date()
  const dt = new Date(dataEntrega + 'T00:00:00')
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24))
  if (diff > 0) return 'ATRASADO'
  if (diff >= -3) return 'EM_BREVE'
  return 'NO_PRAZO'
}

export const diasDiferenca = (data) => {
  if (!data) return null
  return Math.floor((new Date() - new Date(data + 'T00:00:00')) / (1000 * 60 * 60 * 24))
}

export const cruzarOCxNF = (pedidos, nfs) => {
  return pedidos.map(p => {
    const match = nfs.find(n =>
      n.cod_fornecedor == p.cod_fornecedor &&
      n.codigo_produto == p.codigo_produto &&
      Math.abs((parseFloat(n.valor_item) || 0) - (parseFloat(p.valor_item) || 0)) < 0.5
    )
    let situacao = 'AGUARDANDO'
    if (match) {
      const recebido = new Date(match.data_recebimento + 'T00:00:00')
      const prevista = p.data_prevista_entrega ? new Date(p.data_prevista_entrega + 'T00:00:00') : null
      situacao = prevista && recebido <= prevista ? 'NO_PRAZO' : 'ATRASO'
    }
    return { ...p, nf_vinculada: match || null, situacao_entrega: situacao }
  })
}
