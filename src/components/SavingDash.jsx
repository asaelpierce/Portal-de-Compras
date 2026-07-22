import { useMemo } from 'react'
import { Card, CardTitle, DataTable, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtCurrency, fmt } from '../lib/utils'

const COMPRADORES_CORES = {
  'Leonardo Henriques': C.accent,
  'Franciele Dias':     C.success,
}

function BarH({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4 }}>
        <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'width .5s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 36 }}>{pct}%</span>
    </div>
  )
}

export default function SavingDash({ pedidos }) {
  const porComprador = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = p.comprador || 'Não identificado'
      if (!map[key]) map[key] = {
        nome: key,
        pedidos: new Set(),
        valor_total: 0,
        saving_total: 0,
        fornecedores: new Set(),
      }
      map[key].pedidos.add(p.numero_pedido)
      map[key].valor_total += parseFloat(p.valor_total_pedido) || 0
      map[key].saving_total += parseFloat(p.saving_valor) || 0
      if (p.fornecedor) map[key].fornecedores.add(p.fornecedor)
    })
    return Object.values(map)
      .map(c => ({
        ...c,
        pedidos_count: c.pedidos.size,
        fornecedores_count: c.fornecedores.size,
        saving_pct: c.valor_total > 0 ? (c.saving_total / c.valor_total) * 100 : 0,
      }))
      .sort((a, b) => b.saving_total - a.saving_total)
  }, [pedidos])

  const totais = useMemo(() => ({
    valor:  pedidos.reduce((s, p) => s + (parseFloat(p.valor_total_pedido) || 0), 0),
    saving: pedidos.reduce((s, p) => s + (parseFloat(p.saving_valor) || 0), 0),
    pedidos: new Set(pedidos.map(p => p.numero_pedido)).size,
  }), [pedidos])

  const maxSaving = Math.max(...porComprador.map(c => c.saving_total), 1)

  // Por fornecedor — top 10 em valor
  const porFornecedor = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = p.fornecedor || '—'
      if (!map[key]) map[key] = { nome: key, valor: 0, saving: 0, pedidos: new Set() }
      map[key].valor  += parseFloat(p.valor_total_pedido) || 0
      map[key].saving += parseFloat(p.saving_valor) || 0
      map[key].pedidos.add(p.numero_pedido)
    })
    return Object.values(map)
      .map(f => ({ ...f, pedidos_count: f.pedidos.size }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
  }, [pedidos])

  const maxValor = Math.max(...porFornecedor.map(f => f.valor), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs globais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Valor total comprado', value: fmtCurrency(totais.valor), color: C.brand, icon: '💰' },
          { label: 'Saving total',          value: fmtCurrency(totais.saving), color: C.success, icon: '📉' },
          { label: 'Pedidos únicos',         value: totais.pedidos, color: C.accent, icon: '📦' },
        ].map((k, i) => (
          <div key={i} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '20px 22px',
            borderTop: `3px solid ${k.color}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</span>
              <span style={{ fontSize: 20 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.brand }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Saving por comprador */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardTitle>Saving por comprador</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {porComprador.filter(c => c.nome !== 'Não identificado').map((c, i) => {
              const cor = COMPRADORES_CORES[c.nome] || C.accent
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: cor + '20', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: cor }}>
                        {c.nome.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.brand }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{c.pedidos_count} pedidos · {c.fornecedores_count} fornecedores</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.success }}>{fmtCurrency(c.saving_total)}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{fmt(c.saving_pct, 1)}% de saving</div>
                    </div>
                  </div>
                  <BarH value={c.saving_total} max={maxSaving} color={cor} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: C.muted }}>
                    <span>Valor comprado: {fmtCurrency(c.valor_total)}</span>
                  </div>
                </div>
              )
            })}
            {porComprador.filter(c => c.nome !== 'Não identificado').length === 0 && (
              <div style={{ textAlign: 'center', color: C.subtle, fontSize: 13, padding: 20 }}>
                Aguardando dados de comprador do Sankhya
              </div>
            )}
          </div>
        </Card>

        {/* Top fornecedores por valor */}
        <Card>
          <CardTitle>Top 10 fornecedores por valor</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {porFornecedor.map((f, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: C.brand, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}. {f.nome}
                  </span>
                  <span style={{ color: C.accent, fontWeight: 600 }}>{fmtCurrency(f.valor)}</span>
                </div>
                <BarH value={f.valor} max={maxValor} color={C.accent} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tabela detalhada por comprador */}
      <Card>
        <CardTitle>Detalhe por comprador</CardTitle>
        <DataTable
          columns={[
            { label: 'Comprador', render: r => {
              const cor = COMPRADORES_CORES[r.nome] || C.muted
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: cor + '20', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: cor }}>
                    {r.nome.charAt(0)}
                  </div>
                  <span style={{ fontWeight: 500 }}>{r.nome}</span>
                </div>
              )
            }},
            { label: 'Pedidos',       render: r => <span style={{ color: C.muted }}>{r.pedidos_count}</span> },
            { label: 'Fornecedores',  render: r => <span style={{ color: C.muted }}>{r.fornecedores_count}</span> },
            { label: 'Valor total',   render: r => <span style={{ fontWeight: 600 }}>{fmtCurrency(r.valor_total)}</span> },
            { label: 'Saving (R$)',   render: r => <span style={{ fontWeight: 700, color: C.success }}>{fmtCurrency(r.saving_total)}</span> },
            { label: 'Saving (%)',    render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.saving_pct > 0 ? C.okDim : '#F3F4F6', color: r.saving_pct > 0 ? C.okText : C.muted }}>
                {fmt(r.saving_pct, 1)}%
              </span>
            )},
          ]}
          rows={porComprador}
        />
      </Card>
    </div>
  )
}
