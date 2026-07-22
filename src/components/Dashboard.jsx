import { useMemo, useState, useEffect } from 'react'
import { Card, CardTitle, DataTable, Ellipsis, AlertaBanner } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, statusEmbarque, statusEntrega, cruzarOCxNF, fmt } from '../lib/utils'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) return
    const steps = 30
    const inc = value / steps
    let cur = 0
    const timer = setInterval(() => {
      cur += inc
      if (cur >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(cur)
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{decimals > 0 ? display.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : Math.round(display).toLocaleString('pt-BR')}{suffix}</span>
}

function KpiCard({ label, value, sub, color, icon, badge }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 14, padding: '18px 20px',
      borderTop: `3px solid ${color}`, border: `1px solid ${C.border}`,
      borderTopColor: color, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default',
      position: 'relative', overflow: 'hidden',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div style={{ position: 'absolute', right: 16, top: 16, fontSize: 28, opacity: 0.08 }}>{icon}</div>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.brand, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
      {badge && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: color + '15', color }}>
          {badge}
        </div>
      )}
    </div>
  )
}

function MiniBarChart({ data, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', background: d.color || C.accent, borderRadius: '3px 3px 0 0', height: `${Math.max((d.value / max) * height, 4)}px`, transition: 'height 0.6s ease', opacity: 0.85 }} />
          <span style={{ fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function StatusRing({ value, total, color, label }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const r = 30, c = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={72} height={72}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={C.border} strokeWidth={8} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill={C.brand}>{Math.round(pct)}%</text>
      </svg>
      <span style={{ fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </div>
  )
}

export default function Dashboard({ pedidos, nfs, onVerificarEmbarque }) {
  const alertasEmbarque = useMemo(() => pedidos.filter(p => statusEmbarque(p.data_embarque, p.quantidade_pendente) === 'ALERTA'), [pedidos])

  const stats = useMemo(() => {
    const atrasado   = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'ATRASADO').length
    const breve      = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'EM_BREVE').length
    const prazo      = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'NO_PRAZO').length
    const semData    = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'SEM_DATA').length
    const unicos     = new Set(pedidos.map(p => p.numero_pedido)).size
    const valor      = pedidos.reduce((s, p) => s + (parseFloat(p.valor_total_pedido) || 0), 0)
    return { atrasado, breve, prazo, semData, unicos, valor, total: pedidos.length }
  }, [pedidos])

  const topForn = useMemo(() => {
    const map = {}
    pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'ATRASADO')
      .forEach(p => { map[p.fornecedor] = (map[p.fornecedor] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, v]) => ({ label: l.split(' ')[0], value: v, color: C.danger }))
  }, [pedidos])

  const cruzado = useMemo(() => cruzarOCxNF(pedidos, nfs), [pedidos, nfs])
  const vinculados = cruzado.filter(r => r.nf_vinculada).length

  const porComprador = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = p.comprador || 'N/I'
      if (!map[k]) map[k] = { nome: k, valor: 0, atrasados: 0, total: 0 }
      map[k].valor += parseFloat(p.valor_total_pedido) || 0
      map[k].total += 1
      if (p.prioridade <= 2) map[k].atrasados += 1
    })
    return Object.values(map)
  }, [pedidos])

  const ultimas = nfs.slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <AlertaBanner count={alertasEmbarque.length} onView={onVerificarEmbarque} />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Entrega atrasada"  value={<AnimatedNumber value={stats.atrasado} />} sub={`${Math.round(stats.atrasado / (stats.total || 1) * 100)}% do total pendente`} color={C.danger}  icon="🔴" badge="Ação imediata" />
        <KpiCard label="Vence em 3 dias"   value={<AnimatedNumber value={stats.breve} />}    sub="Requer acompanhamento"  color={C.warning} icon="⏰" />
        <KpiCard label="No prazo"          value={<AnimatedNumber value={stats.prazo} />}    sub="Entregas sob controle" color={C.success} icon="✅" />
        <KpiCard label="Pedidos únicos"    value={<AnimatedNumber value={stats.unicos} />}   sub={`R$ ${(stats.valor / 1000).toFixed(0)}k em aberto`} color={C.accent}  icon="📦" />
      </div>

      {/* Segunda linha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 14 }}>

        {/* Anéis de status */}
        <Card>
          <CardTitle>Distribuição de entregas</CardTitle>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
            <StatusRing value={stats.atrasado} total={stats.total} color={C.danger}  label="Atrasado" />
            <StatusRing value={stats.breve}    total={stats.total} color={C.warning} label="Em breve" />
            <StatusRing value={stats.prazo}    total={stats.total} color={C.success} label="No prazo" />
            <StatusRing value={stats.semData}  total={stats.total} color={C.subtle}  label="Sem data" />
          </div>
        </Card>

        {/* Vinculação OC x NF */}
        <Card>
          <CardTitle>Vinculação OC × NF</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { l: 'Com NF vinculada',    v: vinculados,              c: C.success, pct: pedidos.length },
              { l: 'Sem NF localizada',   v: pedidos.length - vinculados, c: C.danger, pct: pedidos.length },
              { l: 'Alertas embarque',    v: alertasEmbarque.length,  c: C.warning, pct: pedidos.length },
              { l: 'NFs no período',      v: nfs.length,              c: C.accent,  pct: nfs.length },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{s.l}</span>
                <div style={{ width: 80, height: 4, background: C.border, borderRadius: 2 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: s.c, width: `${Math.min(s.v / (s.pct || 1) * 100, 100)}%`, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.c, minWidth: 32, textAlign: 'right' }}>{s.v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Por comprador */}
        <Card>
          <CardTitle>Compras por responsável</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {porComprador.filter(c => !c.nome.includes('N/I') && !c.nome.includes('identificado')).map((c, i) => {
              const cor = CORES_COMP[c.nome] || C.accent
              return (
                <div key={i} style={{ padding: '12px 14px', background: '#FAFAFA', borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: cor + '20', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: cor }}>{c.nome.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.brand }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{c.total} itens em aberto</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.brand }}>{fmtCurrency(c.valor)}</div>
                      {c.atrasados > 0 && <div style={{ fontSize: 10, color: C.danger, fontWeight: 600 }}>{c.atrasados} atrasados</div>}
                    </div>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: c.atrasados / c.total > 0.3 ? C.danger : cor, width: `${Math.min(c.valor / (stats.valor || 1) * 100, 100)}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Terceira linha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <Card>
          <CardTitle>Top atrasos por fornecedor</CardTitle>
          {topForn.length > 0
            ? <MiniBarChart data={topForn} height={100} />
            : <div style={{ textAlign: 'center', color: C.subtle, fontSize: 13, padding: 24 }}>Sem atrasos 🎉</div>}
        </Card>

        <Card>
          <CardTitle>Últimas NFs recebidas</CardTitle>
          <DataTable
            columns={[
              { label: 'NF',           key: 'numero_nf',        tdStyle: { fontWeight: 700, color: C.accent } },
              { label: 'Fornecedor',   render: r => <Ellipsis maxWidth={160}>{r.fornecedor}</Ellipsis> },
              { label: 'Produto',      render: r => <Ellipsis maxWidth={200} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
              { label: 'Recebimento',  render: r => <span style={{ whiteSpace: 'nowrap', color: C.okText, fontWeight: 500 }}>{fmtDate(r.data_recebimento)}</span> },
              { label: 'Valor NF',     render: r => <span style={{ fontWeight: 600 }}>{fmtCurrency(r.valor_total_nf)}</span> },
            ]}
            rows={ultimas}
          />
        </Card>
      </div>
    </div>
  )
}
