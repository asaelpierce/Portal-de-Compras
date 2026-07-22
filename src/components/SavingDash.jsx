import { useMemo } from 'react'
import { Card, CardTitle, DataTable, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtCurrency, fmt, fmtInt } from '../lib/utils'

const CORES = {
  'Leonardo Henriques': '#1D4ED8',
  'Franciele Dias':     '#059669',
  'Não identificado':   '#94A3B8',
  'Nao identificado':   '#94A3B8',
}

function Donut({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = size / 2 - 14
  const cx = size / 2, cy = size / 2
  let cum = 0
  return (
    <svg width={size} height={size}>
      {data.map((d, i) => {
        const pct = d.value / total
        const s = cum, e = cum + pct
        cum += pct
        const sa = s * 2 * Math.PI - Math.PI / 2
        const ea = e * 2 * Math.PI - Math.PI / 2
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa)
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea)
        const lg = pct > 0.5 ? 1 : 0
        if (pct >= 0.999) return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={20} />
        if (pct < 0.001) return null
        const path = `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`
        return <path key={i} d={path} fill="none" stroke={d.color} strokeWidth={20} strokeLinecap="butt" />
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.brand}>{total}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill={C.muted}>pedidos</text>
    </svg>
  )
}

function BarH({ value, max, color, height = 8 }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ flex: 1, height, background: C.border, borderRadius: height / 2 }}>
      <div style={{ height: '100%', borderRadius: height / 2, background: color, width: `${pct}%`, transition: 'width .6s ease' }} />
    </div>
  )
}

export default function SavingDash({ pedidos }) {
  // Agregação por comprador
  const porComprador = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = p.comprador || 'Não identificado'
      if (!map[key]) map[key] = { nome: key, pedidos: new Set(), itens: 0, valor: 0, saving: 0, fornecedores: new Set(), atrasados: 0, produtos: new Set() }
      map[key].pedidos.add(p.numero_pedido)
      map[key].itens += 1
      map[key].valor += parseFloat(p.valor_total_pedido) || 0
      map[key].saving += parseFloat(p.saving_valor) || 0
      if (p.fornecedor) map[key].fornecedores.add(p.fornecedor)
      if (p.codigo_produto) map[key].produtos.add(p.codigo_produto)
      if (p.prioridade <= 2) map[key].atrasados += 1
    })
    return Object.values(map).map(c => ({
      ...c,
      pedidos_count: c.pedidos.size,
      fornecedores_count: c.fornecedores.size,
      produtos_count: c.produtos.size,
      saving_pct: c.valor > 0 ? (c.saving / c.valor) * 100 : 0,
      valor_medio_pedido: c.pedidos.size > 0 ? c.valor / c.pedidos.size : 0,
      pct_atraso: c.itens > 0 ? (c.atrasados / c.itens) * 100 : 0,
    })).sort((a, b) => b.valor - a.valor)
  }, [pedidos])

  const totais = useMemo(() => {
    const val = pedidos.reduce((s, p) => s + (parseFloat(p.valor_total_pedido) || 0), 0)
    const sav = pedidos.reduce((s, p) => s + (parseFloat(p.saving_valor) || 0), 0)
    const atrasados = pedidos.filter(p => p.prioridade <= 2).length
    return {
      valor: val, saving: sav,
      pedidos: new Set(pedidos.map(p => p.numero_pedido)).size,
      itens: pedidos.length,
      fornecedores: new Set(pedidos.map(p => p.fornecedor)).size,
      pct_atraso: pedidos.length > 0 ? (atrasados / pedidos.length) * 100 : 0,
    }
  }, [pedidos])

  const maxValor = Math.max(...porComprador.map(c => c.valor), 1)

  // Insights automáticos para diretoria
  const insights = useMemo(() => {
    const list = []
    const ativos = porComprador.filter(c => !c.nome.includes('identificado'))

    if (ativos.length >= 2) {
      const [lider, segundo] = ativos
      const gap = ((lider.valor - segundo.valor) / segundo.valor) * 100
      list.push({
        tipo: 'volume',
        icon: '📊',
        titulo: `${lider.nome} concentra o maior volume`,
        texto: `Responde por ${fmtCurrency(lider.valor)} em compras (${fmt(lider.valor / totais.valor * 100, 0)}% do total), ${fmt(gap, 0)}% acima do segundo colocado. Avaliar balanceamento de carteira entre compradores.`,
        cor: C.accent,
      })
    }

    const maiorAtraso = [...ativos].sort((a, b) => b.pct_atraso - a.pct_atraso)[0]
    if (maiorAtraso && maiorAtraso.pct_atraso > 0) {
      list.push({
        tipo: 'risco',
        icon: '⚠️',
        titulo: `Atenção ao índice de atraso de ${maiorAtraso.nome}`,
        texto: `${fmt(maiorAtraso.pct_atraso, 0)}% dos itens da carteira estão atrasados ou com embarque vencido (${maiorAtraso.atrasados} de ${maiorAtraso.itens}). Recomenda-se follow-up prioritário com os fornecedores críticos.`,
        cor: C.danger,
      })
    }

    const naoIdent = porComprador.find(c => c.nome.includes('identificado'))
    if (naoIdent && naoIdent.itens > 0) {
      list.push({
        tipo: 'governanca',
        icon: '🔍',
        titulo: 'Pedidos sem comprador identificado',
        texto: `${naoIdent.itens} itens (${fmtCurrency(naoIdent.valor)}) não têm comprador vinculado no Sankhya. Padronizar o preenchimento do campo Vendedor melhora a rastreabilidade e a análise de performance.`,
        cor: C.warning,
      })
    }

    if (totais.saving === 0) {
      list.push({
        tipo: 'oportunidade',
        icon: '💡',
        titulo: 'Saving não está sendo capturado',
        texto: `O campo de saving retornou zerado em todos os pedidos. Formalizar o registro de economia negociada (preço-alvo vs. praticado) permitiria medir o impacto financeiro direto da área de Compras.`,
        cor: C.success,
      })
    }

    const ticketMedio = totais.pedidos > 0 ? totais.valor / totais.pedidos : 0
    list.push({
      tipo: 'metrica',
      icon: '🎯',
      titulo: 'Ticket médio por pedido',
      texto: `O valor médio por pedido é ${fmtCurrency(ticketMedio)}, distribuído entre ${totais.fornecedores} fornecedores ativos. Concentração de volume em poucos fornecedores pode indicar oportunidade de negociação por escala.`,
      cor: C.accent,
    })

    return list
  }, [porComprador, totais])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* HERO — Visão executiva */}
      <div style={{
        background: `linear-gradient(135deg, ${C.brand} 0%, #2D2D2D 100%)`,
        borderRadius: 16, padding: '24px 28px', color: 'white',
        display: 'flex', alignItems: 'center', gap: 32,
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#F5E500', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Visão Executiva — Compras</div>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{fmtCurrency(totais.valor)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>em {totais.pedidos} pedidos · {totais.fornecedores} fornecedores · {totais.itens} itens</div>
        </div>
        <div style={{ display: 'flex', gap: 28, marginLeft: 'auto' }}>
          {[
            { l: 'Saving capturado', v: fmtCurrency(totais.saving), c: '#6EE7B7' },
            { l: 'Itens em atraso', v: `${fmt(totais.pct_atraso, 0)}%`, c: totais.pct_atraso > 30 ? '#FCA5A5' : '#FCD34D' },
            { l: 'Ticket médio', v: fmtCurrency(totais.pedidos > 0 ? totais.valor / totais.pedidos : 0), c: '#93C5FD' },
          ].map((k, i) => (
            <div key={i} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.c, marginTop: 2 }}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INSIGHTS AUTOMÁTICOS */}
      <Card>
        <CardTitle>Análise estratégica · insights automáticos</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '14px 16px',
              background: ins.cor + '0D', border: `1px solid ${ins.cor}33`,
              borderLeft: `4px solid ${ins.cor}`, borderRadius: 10,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{ins.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.brand, marginBottom: 4 }}>{ins.titulo}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{ins.texto}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Comparativo compradores + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <Card>
          <CardTitle>Performance por comprador</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {porComprador.filter(c => !c.nome.includes('identificado')).map((c, i) => {
              const cor = CORES[c.nome] || C.accent
              return (
                <div key={i} style={{ padding: '14px 16px', background: '#FAFAFA', borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: cor + '20', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: cor }}>
                      {c.nome.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.brand }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{c.pedidos_count} pedidos · {c.fornecedores_count} fornecedores · {c.produtos_count} produtos</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.brand }}>{fmtCurrency(c.valor)}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{fmt(c.valor / totais.valor * 100, 0)}% do total</div>
                    </div>
                  </div>
                  <BarH value={c.valor} max={maxValor} color={cor} height={6} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                    {[
                      { l: 'Ticket médio', v: fmtCurrency(c.valor_medio_pedido) },
                      { l: 'Saving', v: fmtCurrency(c.saving) },
                      { l: 'Em atraso', v: `${fmt(c.pct_atraso, 0)}%`, alerta: c.pct_atraso > 30 },
                    ].map((m, j) => (
                      <div key={j} style={{ textAlign: 'center', padding: '6px', background: 'white', borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.l}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: m.alerta ? C.danger : C.brand, marginTop: 2 }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Distribuição de pedidos</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Donut data={porComprador.map(c => ({ label: c.nome, value: c.pedidos_count, color: CORES[c.nome] || C.accent }))} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {porComprador.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CORES[c.nome] || C.accent, flexShrink: 0 }} />
                  <span style={{ color: C.brand, flex: 1 }}>{c.nome}</span>
                  <span style={{ color: C.muted, fontWeight: 600 }}>{c.pedidos_count}</span>
                  <span style={{ color: C.subtle, fontSize: 11, minWidth: 40, textAlign: 'right' }}>{fmt(c.pedidos_count / totais.itens * 100, 0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela executiva */}
      <Card>
        <CardTitle>Detalhamento por comprador</CardTitle>
        <DataTable
          columns={[
            { label: 'Comprador', render: r => {
              const cor = CORES[r.nome] || C.muted
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: cor + '20', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: cor }}>{r.nome.charAt(0)}</div>
                  <span style={{ fontWeight: 500 }}>{r.nome}</span>
                </div>
              )
            }},
            { label: 'Pedidos', render: r => fmtInt(r.pedidos_count) },
            { label: 'Itens', render: r => fmtInt(r.itens) },
            { label: 'Fornecedores', render: r => fmtInt(r.fornecedores_count) },
            { label: 'Valor total', render: r => <span style={{ fontWeight: 600 }}>{fmtCurrency(r.valor)}</span> },
            { label: 'Ticket médio', render: r => fmtCurrency(r.valor_medio_pedido) },
            { label: '% do total', render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.accentDim, color: C.accentText }}>
                {fmt(r.valor / totais.valor * 100, 1)}%
              </span>
            )},
            { label: '% em atraso', render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.pct_atraso > 30 ? C.dangerDim : r.pct_atraso > 15 ? C.warnDim : C.okDim, color: r.pct_atraso > 30 ? C.dangerText : r.pct_atraso > 15 ? C.warnText : C.okText }}>
                {fmt(r.pct_atraso, 0)}%
              </span>
            )},
          ]}
          rows={porComprador}
        />
      </Card>
    </div>
  )
}
