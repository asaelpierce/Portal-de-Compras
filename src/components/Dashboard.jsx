import { useMemo } from 'react'
import { KpiCard, Card, CardTitle, DataTable, Ellipsis, AlertaBanner } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, statusEmbarque, statusEntrega, cruzarOCxNF } from '../lib/utils'

function MiniDonut({ data, total }) {
  const cx = 55, cy = 55, r = 38
  let cum = 0
  const paths = data.map(d => {
    const pct = (d.value || 0) / (total || 1)
    const s = cum, e = cum + pct
    cum += pct
    const sa = s * 2 * Math.PI - Math.PI / 2
    const ea = e * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa)
    const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea)
    const lg = pct > 0.5 ? 1 : 0
    if (pct >= 0.999) return <circle key={d.label} cx={cx} cy={cy} r={r} fill={d.color} opacity={0.85} />
    if (pct < 0.001) return null
    return <path key={d.label} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2}Z`} fill={d.color} opacity={0.85} />
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={110} height={110}>
        {paths}
        <circle cx={cx} cy={cy} r={24} fill={C.card} />
        <text x={cx} y={cy - 3} textAnchor="middle" fill={C.textStrong} fontSize={14} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill={C.subtle} fontSize={8}>itens</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: C.muted }}>{d.label}</span>
            <span style={{ color: C.text, fontWeight: 600, marginLeft: 'auto', paddingLeft: 12 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
            <span style={{ color: C.text, maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ color, fontWeight: 600 }}>{d.value}</span>
          </div>
          <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
            <div style={{ height: '100%', borderRadius: 2, background: color, width: `${Math.round(d.value / max * 100)}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ pedidos, nfs, onVerificarEmbarque }) {
  const alertasEmbarque = useMemo(() =>
    pedidos.filter(p => statusEmbarque(p.data_embarque, p.quantidade_pendente) === 'ALERTA'),
    [pedidos]
  )

  const stats = useMemo(() => {
    const atrasado   = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'ATRASADO').length
    const breve      = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'EM_BREVE').length
    const prazo      = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'NO_PRAZO').length
    const semData    = pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'SEM_DATA').length
    const unicos     = new Set(pedidos.map(p => p.numero_pedido)).size
    const valorTotal = pedidos.reduce((s, p) => s + (parseFloat(p.valor_item) || 0), 0)
    return { atrasado, breve, prazo, semData, unicos, valorTotal }
  }, [pedidos])

  const topForn = useMemo(() => {
    const map = {}
    pedidos.filter(p => statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) === 'ATRASADO')
      .forEach(p => { map[p.fornecedor] = (map[p.fornecedor] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value }))
  }, [pedidos])

  const cruzado = useMemo(() => cruzarOCxNF(pedidos, nfs), [pedidos, nfs])
  const vinculados = cruzado.filter(r => r.nf_vinculada).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <AlertaBanner count={alertasEmbarque.length} onView={onVerificarEmbarque} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Entrega atrasada"   value={stats.atrasado} sub={`${Math.round(stats.atrasado / (pedidos.length || 1) * 100)}% do total`} color={C.danger}     icon="⚠" />
        <KpiCard label="Entrega em breve"   value={stats.breve}    sub="Próximos 3 dias"           color={C.warning}    icon="◷" />
        <KpiCard label="No prazo"           value={stats.prazo}    sub="Sob controle"              color={C.success}    icon="✓" />
        <KpiCard label="Pedidos únicos"     value={stats.unicos}   sub={`R$ ${(stats.valorTotal / 1000).toFixed(0)}k em aberto`} color={C.accentText} icon="▦" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <Card>
          <CardTitle>Distribuição de entrega</CardTitle>
          <MiniDonut total={pedidos.length} data={[
            { label: 'Atrasado',    value: stats.atrasado, color: C.danger  },
            { label: 'Em breve',    value: stats.breve,    color: C.warning },
            { label: 'No prazo',    value: stats.prazo,    color: C.success },
            { label: 'Sem data',    value: stats.semData,  color: C.subtle  },
          ]} />
        </Card>
        <Card>
          <CardTitle>Fornecedores com mais entregas atrasadas</CardTitle>
          {topForn.length > 0
            ? <BarChart data={topForn} color={C.danger} />
            : <div style={{ color: C.subtle, textAlign: 'center', padding: 24, fontSize: 13 }}>Nenhum atraso registrado</div>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Card>
          <CardTitle>Últimas NFs recebidas</CardTitle>
          <DataTable
            columns={[
              { label: 'NF',          key: 'numero_nf',       tdStyle: { fontWeight: 700, color: C.accentText } },
              { label: 'Fornecedor',  render: r => <Ellipsis maxWidth={160}>{r.fornecedor}</Ellipsis> },
              { label: 'Produto',     render: r => <Ellipsis maxWidth={200} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
              { label: 'Recebimento', render: r => <span style={{ whiteSpace: 'nowrap', color: C.okText }}>{fmtDate(r.data_recebimento)}</span> },
              { label: 'Valor NF',    render: r => <span style={{ color: C.accentText, fontWeight: 600 }}>{fmtCurrency(r.valor_total_nf)}</span> },
            ]}
            rows={nfs.slice(0, 8)}
          />
        </Card>
        <Card>
          <CardTitle>Vinculação OC × NF</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Com NF vinculada',    value: vinculados,              color: C.success    },
              { label: 'Sem NF localizada',   value: pedidos.length - vinculados, color: C.danger },
              { label: 'Total NFs no período', value: nfs.length,             color: C.accentText },
              { label: 'Alertas de embarque',  value: alertasEmbarque.length, color: C.amber      },
            ].map((s, i) => (
              <div key={i} style={{ background: C.surface, borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.subtle }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
