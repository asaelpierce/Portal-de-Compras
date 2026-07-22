import { useMemo } from 'react'
import { Card, CardTitle, DataTable } from './UI'
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
  const r = size / 2 - 14, cx = size / 2, cy = size / 2
  let cum = 0
  return (
    <svg width={size} height={size}>
      {data.map((d, i) => {
        if (!d.value) return null
        const pct = d.value / total
        const sa = cum * 2 * Math.PI - Math.PI / 2
        const ea = (cum + pct) * 2 * Math.PI - Math.PI / 2
        cum += pct
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa)
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea)
        if (pct >= 0.999) return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={22} />
        return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2}`}
          fill="none" stroke={d.color} strokeWidth={22} strokeLinecap="butt" />
      })}
      <circle cx={cx} cy={cy} r={r - 12} fill={C.surface} />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.brand}>{fmtInt(total)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={C.muted}>pedidos</text>
    </svg>
  )
}

function BarH({ value, max, color, height = 8 }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  return (
    <div style={{ flex: 1, height, background: C.border, borderRadius: height / 2 }}>
      <div style={{ height: '100%', borderRadius: height / 2, background: color, width: `${pct}%`, transition: 'width .6s ease' }} />
    </div>
  )
}

function SavingBadge({ valor }) {
  const positivo = valor >= 0
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      background: positivo ? C.okDim : C.dangerDim,
      color: positivo ? C.okText : C.dangerText,
      border: `1px solid ${positivo ? C.success : C.danger}33`,
    }}>
      {positivo ? '▲' : '▼'} {fmtCurrency(Math.abs(valor))}
    </span>
  )
}

export default function SavingDash({ pedidos }) {
  const porComprador = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = p.comprador || 'Não identificado'
      if (!map[key]) map[key] = { nome: key, pedidos: new Set(), itens: 0, valor: 0, orcado: 0, realizado: 0, saving: 0, fornecedores: new Set(), atrasados: 0 }
      map[key].pedidos.add(p.numero_pedido)
      map[key].itens    += 1
      map[key].valor    += parseFloat(p.valor_total_pedido) || 0
      map[key].orcado   += parseFloat(p.vlr_orcado)   || 0
      map[key].realizado+= parseFloat(p.vlr_realizado) || 0
      map[key].saving   += parseFloat(p.saving_valor)  || 0
      if (p.fornecedor) map[key].fornecedores.add(p.fornecedor)
      if (p.prioridade <= 2) map[key].atrasados += 1
    })
    return Object.values(map).map(c => ({
      ...c,
      pedidos_count:      c.pedidos.size,
      fornecedores_count: c.fornecedores.size,
      saving_pct:         c.orcado > 0 ? (c.saving / c.orcado) * 100 : 0,
      valor_medio:        c.pedidos.size > 0 ? c.valor / c.pedidos.size : 0,
      pct_atraso:         c.itens > 0 ? (c.atrasados / c.itens) * 100 : 0,
    })).sort((a, b) => b.saving - a.saving)
  }, [pedidos])

  const totais = useMemo(() => {
    const comOrcado = pedidos.filter(p => parseFloat(p.vlr_orcado) > 0)
    return {
      valor:     pedidos.reduce((s, p) => s + (parseFloat(p.valor_total_pedido) || 0), 0),
      orcado:    comOrcado.reduce((s, p) => s + (parseFloat(p.vlr_orcado) || 0), 0),
      realizado: comOrcado.reduce((s, p) => s + (parseFloat(p.vlr_realizado) || 0), 0),
      saving:    comOrcado.reduce((s, p) => s + (parseFloat(p.saving_valor) || 0), 0),
      pedidos:   new Set(pedidos.map(p => p.numero_pedido)).size,
      comOrcado: new Set(comOrcado.map(p => p.numero_pedido)).size,
    }
  }, [pedidos])

  const savingPctTotal = totais.orcado > 0 ? (totais.saving / totais.orcado) * 100 : 0
  const maxSaving = Math.max(...porComprador.map(c => Math.abs(c.saving)), 1)
  const maxValor  = Math.max(...porComprador.map(c => c.valor), 1)

  const insights = useMemo(() => {
    const list = []
    const ativos = porComprador.filter(c => !c.nome.includes('identificado') && !c.nome.includes('N/I') && c.orcado > 0)
    if (ativos.length >= 2) {
      const melhor = ativos[0]
      list.push({ icon: '🏆', cor: C.success, titulo: `${melhor.nome} lidera o saving`, texto: `Economizou ${fmtCurrency(melhor.saving)} (${fmt(melhor.saving_pct, 1)}% sobre o orçado) em ${melhor.pedidos_count} pedidos. Performance ${melhor.saving_pct > 15 ? 'acima da média de mercado (10–15%)' : 'dentro da faixa esperada'}.` })
    }
    if (totais.saving > 0) {
      list.push({ icon: '📉', cor: C.accent, titulo: 'Saving total do período', texto: `A área de Compras gerou ${fmtCurrency(totais.saving)} de economia sobre o orçado (${fmt(savingPctTotal, 1)}%), em ${totais.comOrcado} de ${totais.pedidos} pedidos com orçamento registrado.` })
    }
    const semOrcado = totais.pedidos - totais.comOrcado
    if (semOrcado > 0) {
      list.push({ icon: '💡', cor: C.warning, titulo: `${semOrcado} pedidos sem orçamento registrado`, texto: `Preencher os campos AD_ORCADO e AD_REALIZADO_2 em todos os pedidos permitiria medir o saving completo da área, hoje parcialmente invisível.` })
    }
    const negativos = porComprador.filter(c => c.saving < 0)
    if (negativos.length > 0) {
      list.push({ icon: '⚠️', cor: C.danger, titulo: 'Atenção: saving negativo em alguns pedidos', texto: `${negativos.map(c => c.nome.split(' ')[0]).join(' e ')} possui pedidos onde o realizado superou o orçado. Avaliar se houve retrabalho, urgências ou falha no orçamento inicial.` })
    }
    return list
  }, [porComprador, totais, savingPctTotal])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.brand} 0%, #2D2D2D 100%)`,
        borderRadius: 16, padding: '24px 28px', color: 'white',
        display: 'flex', alignItems: 'center', gap: 32,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#F5E500', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Saving — Compras Kalenborn</div>
          <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: totais.saving >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
            {totais.saving >= 0 ? '▲' : '▼'} {fmtCurrency(Math.abs(totais.saving))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            {fmt(savingPctTotal, 1)}% sobre o orçado · {totais.comOrcado} pedidos com orçamento
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, marginLeft: 'auto' }}>
          {[
            { l: 'Total orçado',    v: fmtCurrency(totais.orcado),    c: '#93C5FD' },
            { l: 'Total realizado', v: fmtCurrency(totais.realizado),  c: '#FCD34D' },
            { l: 'Valor em carteira', v: fmtCurrency(totais.valor),   c: 'rgba(255,255,255,0.7)' },
          ].map((k, i) => (
            <div key={i} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.c, marginTop: 4 }}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <Card>
        <CardTitle>Análise estratégica</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', background: ins.cor + '08', border: `1px solid ${ins.cor}22`, borderLeft: `4px solid ${ins.cor}`, borderRadius: 10 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{ins.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.brand, marginBottom: 4 }}>{ins.titulo}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{ins.texto}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Por comprador */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <Card>
          <CardTitle>Performance de saving por comprador</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {porComprador.filter(c => !c.nome.includes('identificado') && !c.nome.includes('N/I')).map((c, i) => {
              const cor = CORES[c.nome] || C.accent
              return (
                <div key={i} style={{ padding: '16px', background: '#FAFAFA', borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: cor + '20', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: cor }}>
                      {c.nome.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.brand }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{c.pedidos_count} pedidos · {c.fornecedores_count} fornecedores</div>
                    </div>
                    <SavingBadge valor={c.saving} />
                  </div>

                  {/* Orçado vs Realizado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {[
                      { l: 'Orçado',    v: fmtCurrency(c.orcado),    c: C.accent  },
                      { l: 'Realizado', v: fmtCurrency(c.realizado),  c: C.warning },
                      { l: 'Saving %',  v: `${fmt(c.saving_pct, 1)}%`, c: c.saving >= 0 ? C.success : C.danger },
                    ].map((m, j) => (
                      <div key={j} style={{ textAlign: 'center', padding: '8px', background: 'white', borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: m.c, marginTop: 2 }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barra comparativa orçado x realizado */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
                      <span>Orçado</span><span>{fmtCurrency(c.orcado)}</span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: C.accent, width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
                      <span>Realizado</span><span>{fmtCurrency(c.realizado)}</span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: c.realizado <= c.orcado ? C.success : C.danger, width: `${Math.min((c.realizado / (c.orcado || 1)) * 100, 100)}%`, transition: 'width .6s ease' }} />
                    </div>
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
                  <span style={{ color: C.subtle, fontSize: 11, minWidth: 40, textAlign: 'right' }}>{fmt(c.pedidos_count / totais.pedidos * 100, 0)}%</span>
                </div>
              ))}
            </div>

            {/* Mini tabela saving */}
            <div style={{ width: '100%', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Saving por comprador</div>
              {porComprador.filter(c => c.orcado > 0).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.brand, flex: 1 }}>{c.nome.split(' ')[0]}</span>
                  <BarH value={Math.abs(c.saving)} max={maxSaving} color={c.saving >= 0 ? CORES[c.nome] || C.accent : C.danger} height={5} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.saving >= 0 ? C.okText : C.dangerText, minWidth: 70, textAlign: 'right' }}>{fmtCurrency(c.saving)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela executiva */}
      <Card>
        <CardTitle>Detalhamento executivo por comprador</CardTitle>
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
            { label: 'Pedidos',    render: r => <span style={{ color: C.muted }}>{r.pedidos_count}</span> },
            { label: 'Orçado',     render: r => <span style={{ color: C.accentText }}>{r.orcado > 0 ? fmtCurrency(r.orcado) : '—'}</span> },
            { label: 'Realizado',  render: r => <span style={{ color: r.realizado > r.orcado ? C.dangerText : C.text }}>{r.realizado > 0 ? fmtCurrency(r.realizado) : '—'}</span> },
            { label: 'Saving (R$)',render: r => <SavingBadge valor={r.saving} /> },
            { label: 'Saving (%)', render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: r.saving_pct > 0 ? C.okDim : r.saving_pct < 0 ? C.dangerDim : '#F3F4F6',
                color: r.saving_pct > 0 ? C.okText : r.saving_pct < 0 ? C.dangerText : C.muted }}>
                {r.orcado > 0 ? `${fmt(r.saving_pct, 1)}%` : '—'}
              </span>
            )},
            { label: 'Ticket médio', render: r => fmtCurrency(r.valor_medio) },
            { label: '% em atraso', render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: r.pct_atraso > 30 ? C.dangerDim : r.pct_atraso > 15 ? C.warnDim : C.okDim,
                color: r.pct_atraso > 30 ? C.dangerText : r.pct_atraso > 15 ? C.warnText : C.okText }}>
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
