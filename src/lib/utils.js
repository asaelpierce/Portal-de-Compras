export const fmt = (n, decimals = 2) => {
  if (n == null || n === '') return '—'
  const num = parseFloat(n)
  if (isNaN(num)) return n
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const fmtInt = (n) => {
  if (n == null) return '—'
  return Math.round(parseFloat(n)).toLocaleString('pt-BR')
}

export const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d }
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

/**
 * Lógica de alerta de embarque.
 *
 * IMPORTANTE: Não sabemos se o fornecedor embarcou ou não.
 * O sistema apenas ALERTA quando a data de embarque passou
 * e o material ainda não chegou (quantidade pendente > 0).
 * A decisão de emitir multa é SEMPRE do comprador.
 *
 * Retorna: 'ALERTA' | 'EM_BREVE' | 'NO_PRAZO' | 'SEM_DATA'
 */
export const statusEmbarque = (dataEmbarque, qtdPendente) => {
  if (!dataEmbarque) return 'SEM_DATA'
  if (parseFloat(qtdPendente) <= 0) return 'ENTREGUE'
  const hoje = new Date()
  const dt = new Date(dataEmbarque)
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24))
  if (diff > 0) return 'ALERTA'        // passou da data — comprador deve verificar
  if (diff >= -3) return 'EM_BREVE'   // vence em até 3 dias
  return 'NO_PRAZO'
}

export const statusEntrega = (dataEntrega, qtdPendente) => {
  if (!dataEntrega) return 'SEM_DATA'
  if (parseFloat(qtdPendente) <= 0) return 'ENTREGUE'
  const hoje = new Date()
  const dt = new Date(dataEntrega)
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24))
  if (diff > 0) return 'ATRASADO'
  if (diff >= -3) return 'EM_BREVE'
  return 'NO_PRAZO'
}

export const diasDiferenca = (data) => {
  if (!data) return null
  const diff = Math.floor((new Date() - new Date(data)) / (1000 * 60 * 60 * 24))
  return diff
}

// Cruzamento OC x NF por fornecedor + produto + valor (tolerância R$ 0,50)
export const cruzarOCxNF = (pedidos, nfs) => {
  return pedidos.map(p => {
    const match = nfs.find(n =>
      n.cod_fornecedor == p.cod_fornecedor &&
      n.codigo_produto == p.codigo_produto &&
      Math.abs((parseFloat(n.valor_item) || 0) - (parseFloat(p.valor_item) || 0)) < 0.5
    )
    let situacao = 'AGUARDANDO'
    if (match) {
      const recebido = new Date(match.data_recebimento)
      const prevista = p.data_prevista_entrega ? new Date(p.data_prevista_entrega) : null
      situacao = prevista && recebido <= prevista ? 'NO_PRAZO' : 'ATRASO'
    }
    return { ...p, nf_vinculada: match || null, situacao_entrega: situacao }
  })
}
