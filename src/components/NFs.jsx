import { useMemo, useState } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt } from '../lib/utils'
import { supabase } from '../lib/supabase'

// ── NFs RECEBIDAS ────────────────────────────────────────────────────────────
export function NFsView({ nfs }) {
  const [search, setSearch] = useState('')

  const agrupadas = useMemo(() => {
    const map = {}
    nfs.forEach(n => {
      const k = String(n.numero_nf)
      if (!map[k]) map[k] = { numero_nf: n.numero_nf, fornecedor: n.fornecedor, data_recebimento: n.data_recebimento, itens: 0, valor_total: 0, produtos: [] }
      map[k].itens++
      map[k].valor_total += parseFloat(n.valor_item) || 0
      map[k].produtos.push(n.descricao_produto)
    })
    return Object.values(map).sort((a, b) => new Date(b.data_recebimento) - new Date(a.data_recebimento))
  }, [nfs])

  const filtradas = agrupadas.filter(n => {
    if (!search) return true
    const q = search.toLowerCase()
    return [(n.fornecedor||''), String(n.numero_nf)].some(v => v.toLowerCase().includes(q))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: C.muted }}>{filtradas.length} notas fiscais recebidas</div>
        <SearchInput value={search} onChange={setSearch} placeholder="NF, fornecedor..." />
      </div>
      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['NF', 'Fornecedor', 'Itens', 'Recebimento', 'Valor total'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: `2px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((n, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? '#FAFAFA' : C.surface }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: C.accent }}>{n.numero_nf}</td>
                <td style={{ padding: '10px 12px' }}><Ellipsis maxWidth={220}>{n.fornecedor}</Ellipsis></td>
                <td style={{ padding: '10px 12px', color: C.muted }}>{n.itens} {n.itens === 1 ? 'item' : 'itens'}</td>
                <td style={{ padding: '10px 12px', color: C.okText, fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtDate(n.data_recebimento)}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtCurrency(n.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── OC × NF ─────────────────────────────────────────────────────────────────
export function CruzamentoView({ pedidos, nfs }) {
  const [search, setSearch]       = useState('')
  const [filtroStatus, setFiltro] = useState('')
  const [expandido, setExpandido] = useState(null)

  // Cruzamento real: cod_fornecedor + codigo_produto
  const cruzamento = useMemo(() => {
    // Deduplica pedidos por numero_pedido + codigo_produto
    const pedidosUnicos = []
    const vistos = new Set()
    pedidos.forEach(p => {
      const k = `${p.numero_pedido}-${p.codigo_produto}`
      if (!vistos.has(k)) { vistos.add(k); pedidosUnicos.push(p) }
    })

    return pedidosUnicos.map(p => {
      // Busca NFs que correspondem por fornecedor + produto
      const nfsMatch = nfs.filter(n =>
        n.cod_fornecedor && p.cod_fornecedor &&
        String(n.cod_fornecedor) === String(p.cod_fornecedor) &&
        String(n.codigo_produto) === String(p.codigo_produto)
      )

      // Se não achou por produto, tenta só por fornecedor
      const nfsFornecedor = nfsMatch.length === 0
        ? nfs.filter(n => n.cod_fornecedor && String(n.cod_fornecedor) === String(p.cod_fornecedor)).slice(0, 5)
        : []

      const todasNFs   = nfsMatch.length > 0 ? nfsMatch : nfsFornecedor
      const tipoMatch  = nfsMatch.length > 0 ? 'PRODUTO' : nfsFornecedor.length > 0 ? 'FORNECEDOR' : 'SEM_MATCH'
      const qtdRecebida = nfsMatch.reduce((s, n) => s + (parseFloat(n.quantidade_recebida) || 0), 0)
      const vlrRecebido = nfsMatch.reduce((s, n) => s + (parseFloat(n.valor_item) || 0), 0)
      const ultimaNF    = nfsMatch.sort((a, b) => new Date(b.data_recebimento) - new Date(a.data_recebimento))[0]

      return { pedido: p, nfs: todasNFs, tipoMatch, qtdRecebida, vlrRecebido, ultimaNF, totalNFs: nfsMatch.length }
    }).sort((a, b) => {
      // Sem match primeiro, depois por pedido
      const ord = { SEM_MATCH: 0, FORNECEDOR: 1, PRODUTO: 2 }
      return ord[a.tipoMatch] - ord[b.tipoMatch]
    })
  }, [pedidos, nfs])

  const kpis = useMemo(() => ({
    total:       cruzamento.length,
    comNF:       cruzamento.filter(c => c.tipoMatch === 'PRODUTO').length,
    parcial:     cruzamento.filter(c => c.tipoMatch === 'FORNECEDOR').length,
    semNF:       cruzamento.filter(c => c.tipoMatch === 'SEM_MATCH').length,
    vlrRecebido: cruzamento.reduce((s, c) => s + c.vlrRecebido, 0),
  }), [cruzamento])

  const filtrados = useMemo(() => cruzamento.filter(c => {
    if (filtroStatus === 'com_nf'    && c.tipoMatch !== 'PRODUTO')    return false
    if (filtroStatus === 'parcial'   && c.tipoMatch !== 'FORNECEDOR') return false
    if (filtroStatus === 'sem_nf'    && c.tipoMatch !== 'SEM_MATCH')  return false
    if (search) {
      const q = search.toLowerCase()
      if (![(c.pedido.fornecedor||''),(c.pedido.descricao_produto||''),String(c.pedido.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [cruzamento, filtroStatus, search])

  const MATCH_CFG = {
    PRODUTO:    { cor: C.success, bg: C.okDim,     label: 'NF localizada',       icon: '✅' },
    FORNECEDOR: { cor: C.warning, bg: C.warnDim,   label: 'Match por fornecedor', icon: '🟡' },
    SEM_MATCH:  { cor: C.danger,  bg: C.dangerDim, label: 'Sem NF encontrada',    icon: '❌' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Itens em aberto',   value: kpis.total,       color: C.accent  },
          { label: 'NF localizada',     value: kpis.comNF,       color: C.success },
          { label: 'Match fornecedor',  value: kpis.parcial,     color: C.warning },
          { label: 'Sem NF',            value: kpis.semNF,       color: C.danger  },
          { label: 'Valor recebido',    value: fmtCurrency(kpis.vlrRecebido), color: C.brand, small: true },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: k.small ? 15 : 24, fontWeight: 800, color: C.brand, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.muted, padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <span>✅ <strong>NF localizada</strong> — cruzamento por fornecedor + produto</span>
        <span>🟡 <strong>Match fornecedor</strong> — mesmo fornecedor, produto diferente</span>
        <span>❌ <strong>Sem NF</strong> — nenhuma NF de entrada deste fornecedor</span>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
        <Select value={filtroStatus} onChange={setFiltro} options={[
          { value: '',          label: 'Todos' },
          { value: 'com_nf',   label: '✅ NF localizada' },
          { value: 'parcial',  label: '🟡 Match fornecedor' },
          { value: 'sem_nf',   label: '❌ Sem NF' },
        ]} />
      </div>

      {/* Tabela */}
      <Card>
        <CardTitle>{filtrados.length} itens de pedidos em aberto</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map((c, i) => {
            const cfg = MATCH_CFG[c.tipoMatch]
            const aberto = expandido === i

            return (
              <div key={i} style={{ border: `1px solid ${cfg.cor}22`, borderLeft: `4px solid ${cfg.cor}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Linha principal */}
                <div
                  onClick={() => c.nfs.length > 0 && setExpandido(aberto ? null : i)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 160px 110px 100px 100px 90px',
                    gap: 10, padding: '10px 14px', alignItems: 'center',
                    background: aberto ? '#F0F4FF' : i % 2 === 0 ? C.surface : '#FAFAFA',
                    cursor: c.nfs.length > 0 ? 'pointer' : 'default',
                  }}
                >
                  {/* Pedido */}
                  <div>
                    <span style={{ fontSize: 11, color: C.muted }}>{c.nfs.length > 0 ? (aberto ? '▼' : '▶') : ' '}</span>
                    <span style={{ fontWeight: 800, color: C.accent, marginLeft: 4 }}>#{c.pedido.numero_pedido}</span>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{c.pedido.codigo_produto}</div>
                  </div>

                  {/* Produto */}
                  <div>
                    <Ellipsis maxWidth={200}>{c.pedido.descricao_produto}</Ellipsis>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{c.pedido.fornecedor?.substring(0, 28)}</div>
                  </div>

                  {/* Status match */}
                  <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.cor, whiteSpace: 'nowrap' }}>
                    {cfg.icon} {cfg.label}
                  </span>

                  {/* NFs encontradas */}
                  <div style={{ fontSize: 12, textAlign: 'center' }}>
                    {c.totalNFs > 0
                      ? <span style={{ fontWeight: 700, color: C.success }}>{c.totalNFs} NF{c.totalNFs > 1 ? 's' : ''}</span>
                      : <span style={{ color: C.subtle }}>—</span>
                    }
                  </div>

                  {/* Última NF */}
                  <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                    {c.ultimaNF ? fmtDate(c.ultimaNF.data_recebimento) : '—'}
                  </div>

                  {/* Qtd recebida */}
                  <div style={{ fontSize: 12, textAlign: 'center' }}>
                    {c.qtdRecebida > 0
                      ? <span style={{ color: C.okText, fontWeight: 600 }}>{fmtInt(c.qtdRecebida)} receb.</span>
                      : <span style={{ color: C.subtle }}>—</span>
                    }
                  </div>

                  {/* Valor recebido */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.brand, textAlign: 'right' }}>
                    {c.vlrRecebido > 0 ? fmtCurrency(c.vlrRecebido) : '—'}
                  </div>
                </div>

                {/* NFs expandidas */}
                {aberto && c.nfs.length > 0 && (
                  <div style={{ background: '#F8FAFF', borderTop: `1px solid ${C.border}`, padding: '10px 14px 10px 32px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      {c.tipoMatch === 'PRODUTO' ? 'NFs vinculadas — mesmo fornecedor + produto' : 'NFs do fornecedor — produto pode variar'}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#EEF2FF' }}>
                          {['NF', 'Produto NF', 'Qtd recebida', 'Valor', 'Data recebimento'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {c.nfs.slice(0, 10).map((n, j) => (
                          <tr key={j} style={{ borderBottom: `1px solid ${C.border}`, background: j % 2 ? '#F5F7FF' : 'white' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: C.accent }}>{n.numero_nf}</td>
                            <td style={{ padding: '7px 10px', maxWidth: 220 }}>
                              <span title={n.descricao_produto} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.descricao_produto}</span>
                            </td>
                            <td style={{ padding: '7px 10px', color: C.okText, fontWeight: 600 }}>{fmtInt(n.quantidade_recebida)}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{fmtCurrency(n.valor_item)}</td>
                            <td style={{ padding: '7px 10px', color: C.muted, whiteSpace: 'nowrap' }}>{fmtDate(n.data_recebimento)}</td>
                          </tr>
                        ))}
                        {c.nfs.length > 10 && (
                          <tr>
                            <td colSpan={5} style={{ padding: '6px 10px', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
                              + {c.nfs.length - 10} NFs adicionais não exibidas
                            </td>
                          </tr>
                        )}
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
              <div>Nenhum resultado encontrado</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
