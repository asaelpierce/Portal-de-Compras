import { useMemo, useState } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency } from '../lib/utils'

const CAMPOS = [
  { key: 'sem_comprador', label: 'Sem comprador',     cor: C.danger,  bg: C.dangerDim  },
  { key: 'sem_embarque',  label: 'Sem data embarque', cor: C.warning, bg: C.warnDim    },
  { key: 'sem_orcado',    label: 'Sem orçamento',     cor: '#7C3AED', bg: '#F5F3FF'    },
]

function Tag({ label, cor, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, background: bg, color: cor,
      border: `1px solid ${cor}33`, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function ScoreCampos({ n }) {
  const cor = n === 3 ? C.danger : n === 2 ? C.warning : '#7C3AED'
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: 2,
          background: i <= n ? cor : C.border,
        }} />
      ))}
    </div>
  )
}

export default function Governanca({ pedidos }) {
  const [search, setSearch]     = useState('')
  const [filtroCampo, setFiltro] = useState('')
  const [expandido, setExpandido] = useState(null)

  // Deduplica por pedido e calcula problemas
  const porPedido = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = {
        numero_pedido: p.numero_pedido,
        fornecedor:    p.fornecedor,
        comprador:     p.comprador,
        data_embarque: p.data_embarque,
        vlr_orcado:    p.vlr_orcado,
        data_pedido:   p.data_pedido,
        valor_total:   0,
        itens:         0,
      }
      map[k].valor_total += parseFloat(p.valor_item) || 0
      map[k].itens++
    })

    return Object.values(map).map(p => {
      const problemas = []
      if (!p.comprador || p.comprador === 'Nao identificado')
        problemas.push('sem_comprador')
      if (!p.data_embarque)
        problemas.push('sem_embarque')
      if (!p.vlr_orcado || parseFloat(p.vlr_orcado) === 0)
        problemas.push('sem_orcado')
      return { ...p, problemas, score: problemas.length }
    }).filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score || new Date(a.data_pedido) - new Date(b.data_pedido))
  }, [pedidos])

  const kpis = useMemo(() => ({
    total:         porPedido.length,
    tres_campos:   porPedido.filter(p => p.score === 3).length,
    sem_comprador: porPedido.filter(p => p.problemas.includes('sem_comprador')).length,
    sem_embarque:  porPedido.filter(p => p.problemas.includes('sem_embarque')).length,
    sem_orcado:    porPedido.filter(p => p.problemas.includes('sem_orcado')).length,
    valor_exposto: porPedido.reduce((s, p) => s + p.valor_total, 0),
  }), [porPedido])

  const filtrados = useMemo(() => porPedido.filter(p => {
    if (filtroCampo && !p.problemas.includes(filtroCampo)) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(p.fornecedor||''),(p.comprador||''),String(p.numero_pedido)].some(v => v.toLowerCase().includes(q)))
        return false
    }
    return true
  }), [porPedido, search, filtroCampo])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
        {[
          { label: 'Pedidos incompletos', value: kpis.total,          color: C.danger,  icon: '⚠' },
          { label: 'Todos os campos',      value: kpis.tres_campos,   color: C.danger,  icon: '🔴' },
          { label: 'Sem comprador',        value: kpis.sem_comprador, color: C.danger,  icon: '👤' },
          { label: 'Sem data embarque',    value: kpis.sem_embarque,  color: C.warning, icon: '📅' },
          { label: 'Sem orçamento',        value: kpis.sem_orcado,    color: '#7C3AED', icon: '💰' },
          { label: 'Valor exposto',        value: fmtCurrency(kpis.valor_exposto), color: C.accent, icon: '📦', small: true },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: k.small ? 16 : 26, fontWeight: 800, color: C.brand, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Instrução */}
      <div style={{ padding: '12px 16px', background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
        <strong>Como corrigir:</strong> Abra o pedido no Sankhya e preencha os campos marcados abaixo.
        <br/>
        <strong>Comprador</strong> → aba Geral → campo Vendedor (CODVEND: 16=Leonardo, 31=Franciele) ·
        <strong>Embarque</strong> → campo AD_DTEMBARQUE ·
        <strong>Orçado</strong> → campo AD_ORCADO
      </div>

      {/* Tabela */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <CardTitle>{filtrados.length} pedidos com campos obrigatórios faltando</CardTitle>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor..." />
            <Select value={filtroCampo} onChange={setFiltro} options={[
              { value: '',              label: 'Todos os problemas' },
              { value: 'sem_comprador',label: '👤 Sem comprador' },
              { value: 'sem_embarque', label: '📅 Sem data embarque' },
              { value: 'sem_orcado',   label: '💰 Sem orçamento' },
            ]} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: C.subtle }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Todos os pedidos estão completos!</div>
            </div>
          ) : filtrados.map((p, i) => (
            <div key={i} style={{
              border: `1px solid ${p.score === 3 ? C.danger+'44' : C.border}`,
              borderLeft: `4px solid ${p.score === 3 ? C.danger : p.score === 2 ? C.warning : '#7C3AED'}`,
              borderRadius: 10, overflow: 'hidden',
            }}>
              {/* Linha principal */}
              <div
                onClick={() => setExpandido(expandido === p.numero_pedido ? null : p.numero_pedido)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 160px 140px 1fr 80px',
                  gap: 12, padding: '11px 14px', alignItems: 'center',
                  background: expandido === p.numero_pedido ? '#F0F4FF' : i % 2 === 0 ? C.surface : '#FAFAFA',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {expandido === p.numero_pedido ? '▼' : '▶'}
                  </span>
                  <span style={{ fontWeight: 800, color: C.accent, marginLeft: 4 }}>#{p.numero_pedido}</span>
                  <div style={{ marginTop: 4 }}><ScoreCampos n={p.score} /></div>
                </div>

                <div>
                  <Ellipsis maxWidth={200}>{p.fornecedor}</Ellipsis>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Pedido em {fmtDate(p.data_pedido)}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {p.problemas.map(prob => {
                    const cfg = CAMPOS.find(c => c.key === prob)
                    return cfg ? <Tag key={prob} label={cfg.label} cor={cfg.cor} bg={cfg.bg} /> : null
                  })}
                </div>

                <div style={{ fontSize: 11, color: C.muted }}>
                  {p.itens} {p.itens === 1 ? 'item' : 'itens'}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: C.brand }}>
                  {fmtCurrency(p.valor_total)}
                </div>

                <div>
                  <span style={{
                    display: 'inline-block', padding: '3px 8px', borderRadius: 20,
                    fontSize: 10, fontWeight: 700,
                    background: p.score === 3 ? C.dangerDim : p.score === 2 ? C.warnDim : '#F5F3FF',
                    color: p.score === 3 ? C.danger : p.score === 2 ? C.warning : '#7C3AED',
                  }}>
                    {p.score} campo{p.score > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Detalhes expandidos — mostra o que preencher */}
              {expandido === p.numero_pedido && (
                <div style={{ background: '#F8FAFF', borderTop: `1px solid ${C.border}`, padding: '12px 16px 12px 32px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    O que preencher no Sankhya — Pedido #{p.numero_pedido}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.problemas.includes('sem_comprador') && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: C.dangerDim, borderRadius: 8, border: `1px solid ${C.danger}22` }}>
                        <span style={{ fontSize: 16 }}>👤</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.danger }}>Comprador não identificado</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            Sankhya → Pedido #{p.numero_pedido} → Aba Geral → Campo <strong>Vendedor (CODVEND)</strong><br/>
                            Valores: <strong>16</strong> = Leonardo Henriques · <strong>31</strong> = Franciele Dias
                          </div>
                        </div>
                      </div>
                    )}
                    {p.problemas.includes('sem_embarque') && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: C.warnDim, borderRadius: 8, border: `1px solid ${C.warning}22` }}>
                        <span style={{ fontSize: 16 }}>📅</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.warning }}>Data de embarque vazia</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            Sankhya → Pedido #{p.numero_pedido} → Campo <strong>AD_DTEMBARQUE</strong><br/>
                            Informe a data prevista que o fornecedor vai embarcar o material
                          </div>
                        </div>
                      </div>
                    )}
                    {p.problemas.includes('sem_orcado') && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #C4B5FD44' }}>
                        <span style={{ fontSize: 16 }}>💰</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>Orçamento não registrado</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            Sankhya → Pedido #{p.numero_pedido} → Campo <strong>AD_ORCADO</strong><br/>
                            Informe o valor orçado antes da negociação — necessário para calcular o saving
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
