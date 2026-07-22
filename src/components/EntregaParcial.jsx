import { useMemo, useState } from 'react'
import { Card, CardTitle, DataTable, SearchInput, Select, Ellipsis, Pill } from './UI'
import { C, STATUS_ENTREGA } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, fmt, statusEntrega } from '../lib/utils'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

function PctBar({ entregue, pedido }) {
  const pct = pedido > 0 ? Math.round((entregue / pedido) * 100) : 0
  const cor = pct >= 80 ? C.success : pct >= 40 ? C.warning : C.danger
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, minWidth: 60 }}>
        <div style={{
          height: '100%', borderRadius: 3, background: cor,
          width: `${pct}%`, transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: cor, minWidth: 34 }}>{pct}%</span>
    </div>
  )
}

export default function EntregaParcial({ pedidos }) {
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroComp, setFiltroComp] = useState('')

  // Agrupa por pedido para ter visão consolidada
  const porPedido = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = {
        numero_pedido: p.numero_pedido,
        fornecedor: p.fornecedor,
        comprador: p.comprador,
        data_pedido: p.data_pedido,
        data_embarque: p.data_embarque,
        data_prevista_entrega: p.data_prevista_entrega,
        projeto: p.projeto,
        itens: [],
        qtd_pedida_total: 0,
        qtd_entregue_total: 0,
        qtd_pendente_total: 0,
        valor_total: 0,
        prioridade: p.prioridade,
      }
      map[k].itens.push(p)
      map[k].qtd_pedida_total   += parseFloat(p.quantidade_pedida) || 0
      map[k].qtd_entregue_total += parseFloat(p.quantidade_entregue) || 0
      map[k].qtd_pendente_total += parseFloat(p.quantidade_pendente) || 0
      map[k].valor_total        += parseFloat(p.valor_total_pedido) || 0
    })

    return Object.values(map).map(p => ({
      ...p,
      pct_atendimento: p.qtd_pedida_total > 0
        ? Math.round((p.qtd_entregue_total / p.qtd_pedida_total) * 100)
        : 0,
      tem_parcial: p.qtd_entregue_total > 0 && p.qtd_pendente_total > 0,
      status_entrega: statusEntrega(p.data_prevista_entrega, p.qtd_pendente_total),
    })).sort((a, b) => {
      // Parciais atrasados primeiro, depois por % atendimento
      if (a.tem_parcial && !b.tem_parcial) return -1
      if (!a.tem_parcial && b.tem_parcial) return 1
      return a.pct_atendimento - b.pct_atendimento
    })
  }, [pedidos])

  // KPIs
  const kpis = useMemo(() => {
    const parciais   = porPedido.filter(p => p.tem_parcial)
    const naoIniciados = porPedido.filter(p => p.qtd_entregue_total === 0)
    const parcialAtraso = parciais.filter(p => p.status_entrega === 'ATRASADO')
    const pctMedio   = porPedido.length > 0
      ? porPedido.reduce((s, p) => s + p.pct_atendimento, 0) / porPedido.length
      : 0
    const valorPendente = porPedido.reduce((s, p) => s + (p.valor_total * (1 - p.pct_atendimento / 100)), 0)
    return { parciais: parciais.length, naoIniciados: naoIniciados.length, parcialAtraso: parcialAtraso.length, pctMedio, valorPendente }
  }, [porPedido])

  const compradores = useMemo(() => [...new Set(pedidos.map(p => p.comprador).filter(Boolean))].sort(), [pedidos])

  const filtrados = useMemo(() => porPedido.filter(p => {
    if (filtroStatus === 'parcial'   && !p.tem_parcial) return false
    if (filtroStatus === 'nao_inic'  && p.qtd_entregue_total > 0) return false
    if (filtroStatus === 'atrasado'  && p.status_entrega !== 'ATRASADO') return false
    if (filtroComp && p.comprador !== filtroComp) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(p.fornecedor||''),(p.comprador||''),String(p.numero_pedido||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [porPedido, filtroStatus, filtroComp, search])

  const [expandido, setExpandido] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Entrega parcial',      value: kpis.parciais,     color: C.warning, icon: '📦', sub: 'itens iniciados mas incompletos' },
          { label: 'Não iniciados',         value: kpis.naoIniciados, color: C.subtle,  icon: '⏳', sub: 'nenhuma entrega realizada' },
          { label: 'Parcial + atrasado',    value: kpis.parcialAtraso,color: C.danger,  icon: '🔴', sub: 'pendente e fora do prazo' },
          { label: 'Atendimento médio',     value: `${fmt(kpis.pctMedio, 0)}%`, color: kpis.pctMedio >= 60 ? C.success : C.danger, icon: '📊', sub: 'qtd entregue / pedida' },
          { label: 'Valor pendente est.',   value: fmtCurrency(kpis.valorPendente), color: C.accent, icon: '💰', sub: 'estimativa proporcional' },
        ].map((k, i) => (
          <div key={i} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderTop: `3px solid ${k.color}`, borderRadius: 12,
            padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</span>
              <span style={{ fontSize: 18 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.brand }}>{k.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.brand }}>Análise de entregas por pedido</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{filtrados.length} pedidos · clique para ver os itens</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor..." />
            <Select value={filtroStatus} onChange={setFiltroStatus} options={[
              { value: '',        label: 'Todos' },
              { value: 'parcial', label: '📦 Entrega parcial' },
              { value: 'nao_inic',label: '⏳ Não iniciados' },
              { value: 'atrasado',label: '🔴 Atrasados' },
            ]} />
            <Select value={filtroComp} onChange={setFiltroComp} options={[
              { value: '', label: 'Todos compradores' },
              ...compradores.map(c => ({ value: c, label: c }))
            ]} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map((p, i) => {
            const corComp = CORES_COMP[p.comprador] || C.subtle
            const stCfg = {
              ATRASADO:  { bg: C.dangerDim,  cor: C.danger,  label: 'Atrasado'  },
              EM_BREVE:  { bg: C.warnDim,    cor: C.warning, label: 'Vence em breve' },
              NO_PRAZO:  { bg: C.okDim,      cor: C.success, label: 'No prazo'   },
              SEM_DATA:  { bg: '#F9FAFB',    cor: C.subtle,  label: 'Sem data'   },
              ENTREGUE:  { bg: C.okDim,      cor: C.success, label: 'Entregue'   },
            }[p.status_entrega] || { bg: '#F9FAFB', cor: C.subtle, label: '—' }

            const isExpanded = expandido === p.numero_pedido

            return (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Linha principal */}
                <div
                  onClick={() => setExpandido(isExpanded ? null : p.numero_pedido)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 140px 200px 100px 120px 100px 80px',
                    gap: 12, padding: '10px 14px',
                    background: isExpanded ? '#F0F4FF' : (i % 2 === 0 ? C.surface : '#FAFAFA'),
                    cursor: 'pointer', alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#F5F7FF' }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = i % 2 === 0 ? C.surface : '#FAFAFA' }}
                >
                  <span style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>
                    {isExpanded ? '▼' : '▶'} #{p.numero_pedido}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.brand, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fornecedor}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'} · {fmtDate(p.data_pedido)}</div>
                  </div>

                  {/* Comprador chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: corComp + '20', border: `1.5px solid ${corComp}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: corComp }}>
                      {(p.comprador || 'N').charAt(0)}
                    </div>
                    <span style={{ fontSize: 11, color: C.brand, fontWeight: 500 }}>{(p.comprador || 'N/I').split(' ')[0]}</span>
                  </div>

                  {/* Barra de atendimento */}
                  <PctBar entregue={p.qtd_entregue_total} pedido={p.qtd_pedida_total} />

                  {/* Qtd resumo */}
                  <div style={{ fontSize: 11, textAlign: 'center' }}>
                    <div style={{ color: C.okText, fontWeight: 600 }}>{fmtInt(p.qtd_entregue_total)} ✓</div>
                    <div style={{ color: C.warning, fontWeight: 600 }}>{fmtInt(p.qtd_pendente_total)} pend.</div>
                  </div>

                  {/* Datas */}
                  <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>
                    <div>Emb: {fmtDate(p.data_embarque)}</div>
                    <div>Ent: {fmtDate(p.data_prevista_entrega)}</div>
                  </div>

                  {/* Status */}
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: stCfg.bg, color: stCfg.cor, textAlign: 'center' }}>
                    {stCfg.label}
                  </span>

                  {/* Valor */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.brand, textAlign: 'right' }}>{fmtCurrency(p.valor_total)}</span>
                </div>

                {/* Itens expandidos */}
                {isExpanded && (
                  <div style={{ background: '#F8FAFF', borderTop: `1px solid ${C.border}`, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Itens do pedido</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#EEF2FF' }}>
                          {['Produto', 'Descrição', 'Qtd pedida', 'Qtd entregue', 'Qtd pendente', '% atendido', 'Valor item'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {p.itens.map((it, j) => {
                          const pctIt = parseFloat(it.quantidade_pedida) > 0
                            ? Math.round((parseFloat(it.quantidade_entregue) / parseFloat(it.quantidade_pedida)) * 100)
                            : 0
                          const corIt = pctIt >= 80 ? C.success : pctIt > 0 ? C.warning : C.danger
                          return (
                            <tr key={j} style={{ borderBottom: `1px solid ${C.border}`, background: j % 2 === 0 ? 'white' : '#FAFCFF' }}>
                              <td style={{ padding: '7px 10px', fontWeight: 600, color: C.accent }}>{it.codigo_produto}</td>
                              <td style={{ padding: '7px 10px', maxWidth: 280 }}>
                                <span title={it.descricao_produto} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.descricao_produto}</span>
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmtInt(it.quantidade_pedida)}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', color: C.okText, fontWeight: 600 }}>{fmtInt(it.quantidade_entregue)}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', color: parseFloat(it.quantidade_pendente) > 0 ? C.warning : C.success, fontWeight: 600 }}>{fmtInt(it.quantidade_pendente)}</td>
                              <td style={{ padding: '7px 10px', width: 120 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 3 }}>
                                    <div style={{ height: '100%', borderRadius: 3, background: corIt, width: `${pctIt}%` }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: corIt, minWidth: 32 }}>{pctIt}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(it.valor_item)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          {filtrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14 }}>Nenhum pedido encontrado</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
