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

// Aceita qualquer formato: "2026-03-06 00:00:00+00", "2026-03-06T00:00:00", "2026-03-06"
export const fmtDate = (d) => {
  if (!d) return '—'
  try {
    // Pega só a parte YYYY-MM-DD ignorando hora e timezone
    const s = String(d).trim()
    const match = s.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return '—'
    const [, yyyy, mm, dd] = match
    return `${dd}/${mm}/${yyyy}`
  } catch { return '—' }
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

// Extrai só YYYY-MM-DD de qualquer formato de data
const parseDate = (d) => {
  if (!d) return null
  const s = String(d).trim()
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`)
}

export const statusEmbarque = (dataEmbarque, qtdPendente) => {
  if (!dataEmbarque) return 'SEM_DATA'
  if (parseFloat(qtdPendente) <= 0) return 'ENTREGUE'
  const hoje = new Date()
  const dt = parseDate(dataEmbarque)
  if (!dt) return 'SEM_DATA'
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24))
  if (diff > 0) return 'ALERTA'
  if (diff >= -3) return 'EM_BREVE'
  return 'NO_PRAZO'
}

export const statusEntrega = (dataEntrega, qtdPendente) => {
  if (!dataEntrega) return 'SEM_DATA'
  if (parseFloat(qtdPendente) <= 0) return 'ENTREGUE'
  const hoje = new Date()
  const dt = parseDate(dataEntrega)
  if (!dt) return 'SEM_DATA'
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24))
  if (diff > 0) return 'ATRASADO'
  if (diff >= -3) return 'EM_BREVE'
  return 'NO_PRAZO'
}

export const diasDiferenca = (data) => {
  if (!data) return null
  const dt = parseDate(data)
  if (!dt) return null
  return Math.floor((new Date() - dt) / (1000 * 60 * 60 * 24))
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
      const recebido = parseDate(match.data_recebimento)
      const prevista = parseDate(p.data_prevista_entrega)
      situacao = recebido && prevista && recebido <= prevista ? 'NO_PRAZO' : 'ATRASO'
    }
    return { ...p, nf_vinculada: match || null, situacao_entrega: situacao }
  })
}
