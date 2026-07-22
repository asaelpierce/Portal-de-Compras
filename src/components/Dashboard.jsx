import { useMemo, useState, useEffect, useRef } from 'react'
import { Card, CardTitle, DataTable, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, statusEntrega, statusEmbarque, cruzarOCxNF, fmt } from '../lib/utils'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

// ── Número animado ─────────────────────────────────────────────────────────
function AnimNum({ value }) {
  const [cur, setCur] = useState(0)
  useEffect(() => {
    if (!value) return
    let frame = 0
    const steps = 24
    const tick = () => {
      frame++
      setCur(Math.round((frame / steps) * value))
      if (frame < steps) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <span>{cur.toLocaleString('pt-BR')}</span>
}

// ── Painel lateral de detalhe dos KPIs ────────────────────────────────────
function SlidePanel({ titulo, pedidos, onClose }) {
  if (!pedidos) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        width: 560, background: C.surface, borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>{titulo}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {pedidos.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>Nenhum pedido neste grupo</div>
            : pedidos.map((p, i) => {
              const dias = p._diasEntrega
              const cor = dias > 0 ? C.danger : dias > -3 ? C.warning : C.success
              return (
                <div key={i} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.brand }}>
                      Pedido <span style={{ color: C.accent }}>#{p.numero_pedido}</span>
                      {p.comprador && !p.comprador.includes('identificado') && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: CORES_COMP[p.comprador] || C.muted, fontWeight: 500 }}>{p.comprador.split(' ')[0]}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.brand, margin: '2px 0' }}>{p.fornecedor}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{p.descricao_produto}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Qtd pendente: <strong>{fmtInt(p.quantidade_pendente)}</strong> ·
                      Entrega prevista: <strong>{fmtDate(p.data_prevista_entrega)}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: cor }}>
                      {dias > 0 ? `${dias}d atrasado` : dias === 0 ? 'Hoje' : `${Math.abs(dias)}d restam`}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fmtCurrency(p.valor_item)}</div>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  )
}

// ── KPI Card clicável ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, badge, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.surface, borderRadius: 14, padding: '18px 20px',
        border: `1px solid ${hov && onClick ? color + '66' : C.border}`,
        borderTop: `3px solid ${color}`,
        boxShadow: hov && onClick ? `0 4px 16px ${color}22` : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.15s', cursor: onClick ? 'pointer' : 'default',
        transform: hov && onClick ? 'translateY(-2px)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', right: 16, top: 16, fontSize: 28, opacity: 0.07 }}>{icon}</div>
      {onClick && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, color, opacity: 0.6, fontWeight: 600 }}>Ver pedidos →</div>}
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: C.brand, lineHeight: 1 }}><AnimNum value={value} /></div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
      {badge && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: color + '15', color }}>{badge}</div>}
    </div>
  )
}

// ── Gráfico de barras horizontal melhorado ───────────────────────────────
function HBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 160, fontSize: 12, color: C.brand, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={d.label}>{d.label}</div>
          <div style={{ flex: 1, height: 22, background: '#FEE2E2', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: `linear-gradient(90deg, ${C.danger}, #FF6B6B)`,
              width: `${Math.round(d.value / max * 100)}%`,
              borderRadius: 4, transition: 'width 0.7s ease',
              display: 'flex', alignItems: 'center', paddingLeft: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{d.value} {d.value === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.danger, minWidth: 28, textAlign: 'right' }}>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Anéis de status ────────────────────────────────────────────────────────
function StatusRing({ value, total, color, label }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const r = 30, c = 36, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={72} height={72}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={C.border} strokeWidth={8} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill={C.brand}>{Math.round(pct)}%</text>
      </svg>
      <span style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

export default function Dashboard({ pedidos, nfs, onVerificarEmbarque }) {
  const [painel, setPainel] = useState(null) // { titulo, pedidos }

  const enriched = useMemo(() => pedidos.map(p => ({
    ...p,
    _stEntrega:   statusEntrega(p.data_prevista_entrega, p.quantidade_pendente),
    _stEmbarque:  statusEmbarque(p.data_embarque, p.quantidade_pendente),
    _diasEntrega: (() => {
      if (!p.data_prevista_entrega) return null
      const s = String(p.data_prevista_entrega).match(/(\d{4})-(\d{2})-(\d{2})/)
      if (!s) return null
      return Math.floor((new Date() - new Date(`${s[1]}-${s[2]}-${s[3]}T12:00:00`)) / (1000 * 60 * 60 * 24))
    })(),
  })), [pedidos])

  const atrasados  = useMemo(() => enriched.filter(p => p._stEntrega === 'ATRASADO'), [enriched])
  const breve      = useMemo(() => enriched.filter(p => p._stEntrega === 'EM_BREVE'), [enriched])
  const prazo      = useMemo(() => enriched.filter(p => p._stEntrega === 'NO_PRAZO'), [enriched])
  const alertasEmb = useMemo(() => enriched.filter(p => p._stEmbarque === 'ALERTA'), [enriched])

  const unicos = useMemo(() => {
    const map = {}
    enriched.forEach(p => {
      if (!map[p.numero_pedido]) map[p.numero_pedido] = p
    })
    return Object.values(map)
  }, [enriched])

  const valor = useMemo(() => enriched.reduce((s, p) => s + (parseFloat(p.valor_total_pedido) || 0), 0), [enriched])

  const topForn = useMemo(() => {
    const map = {}
    atrasados.forEach(p => { map[p.fornecedor] = (map[p.fornecedor] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }))
  }, [atrasados])

  // NFs agrupadas por número de nota
  const nfsAgrupadas = useMemo(() => {
    const map = {}
    nfs.forEach(n => {
      const k = String(n.numero_nf)
      if (!map[k]) map[k] = { numero_nf: n.numero_nf, fornecedor: n.fornecedor, data_recebimento: n.data_recebimento, vlr_total: 0, itens: 0 }
      map[k].vlr_total += parseFloat(n.valor_item) || 0
      map[k].itens += 1
    })
    return Object.values(map).sort((a, b) => new Date(b.data_recebimento) - new Date(a.data_recebimento)).slice(0, 8)
  }, [nfs])

  const cruzado   = useMemo(() => cruzarOCxNF(enriched, nfs), [enriched, nfs])
  const vinculados = cruzado.filter(r => r.nf_vinculada).length

  const porComprador = useMemo(() => {
    const map = {}
    enriched.forEach(p => {
      const k = p.comprador || 'N/I'
      if (!map[k]) map[k] = { nome: k, valor: 0, atrasados: 0, total: 0 }
      map[k].valor += parseFloat(p.valor_total_pedido) || 0
      map[k].total += 1
      if (p._stEntrega === 'ATRASADO') map[k].atrasados += 1
    })
    return Object.values(map)
  }, [enriched])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {painel && <SlidePanel titulo={painel.titulo} pedidos={painel.pedidos} onClose={() => setPainel(null)} />}

      {/* KPIs clicáveis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Entrega atrasada" value={atrasados.length}
          sub={`${Math.round(atrasados.length / (enriched.length || 1) * 100)}% do total pendente`}
          color={C.danger} icon="🔴" badge="Ação imediata"
          onClick={() => setPainel({ titulo: `Entregas atrasadas (${atrasados.length})`, pedidos: atrasados })} />
        <KpiCard label="Vence em 3 dias" value={breve.length}
          sub="Requer acompanhamento" color={C.warning} icon="⏰"
          onClick={() => setPainel({ titulo: `Vence em breve (${breve.length})`, pedidos: breve })} />
        <KpiCard label="No prazo" value={prazo.length}
          sub="Entregas sob controle" color={C.success} icon="✅"
          onClick={() => setPainel({ titulo: `No prazo (${prazo.length})`, pedidos: prazo })} />
        <KpiCard label="Pedidos únicos" value={unicos.length}
          sub={`R$ ${(valor / 1000).toFixed(0)}k em aberto`} color={C.accent} icon="📦"
          onClick={() => setPainel({ titulo: `Todos os pedidos únicos (${unicos.length})`, pedidos: unicos })} />
      </div>

      {/* Segunda linha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 14 }}>
        <Card>
          <CardTitle>Distribuição de entregas</CardTitle>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
            <StatusRing value={atrasados.length} total={enriched.length} color={C.danger}  label="Atrasado" />
            <StatusRing value={breve.length}     total={enriched.length} color={C.warning} label="Em breve" />
            <StatusRing value={prazo.length}     total={enriched.length} color={C.success} label="No prazo" />
          </div>
        </Card>

        <Card>
          <CardTitle>Vinculação OC × NF</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { l: 'Com NF vinculada',  v: vinculados,                   c: C.success },
              { l: 'Sem NF localizada', v: enriched.length - vinculados, c: C.danger  },
              { l: 'Alertas embarque',  v: alertasEmb.length,            c: C.warning },
              { l: 'NFs no período',    v: nfs.length,                   c: C.accent  },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{s.l}</span>
                <div style={{ width: 80, height: 4, background: C.border, borderRadius: 2 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: s.c, width: `${Math.min(s.v / (enriched.length || 1) * 100, 100)}%`, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.c, minWidth: 32, textAlign: 'right' }}>{s.v}</span>
              </div>
            ))}
          </div>
        </Card>

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
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>{fmtCurrency(c.valor)}</div>
                      {c.atrasados > 0 && <div style={{ fontSize: 10, color: C.danger, fontWeight: 600 }}>{c.atrasados} atrasados</div>}
                    </div>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: c.atrasados / c.total > 0.3 ? C.danger : cor, width: `${Math.min(c.valor / (valor || 1) * 100, 100)}%`, transition: 'width 0.8s ease' }} />
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
            ? <HBarChart data={topForn} />
            : <div style={{ textAlign: 'center', color: C.subtle, fontSize: 13, padding: 24 }}>Sem atrasos 🎉</div>}
        </Card>

        <Card>
          <CardTitle>Últimas NFs recebidas</CardTitle>
          <DataTable
            columns={[
              { label: 'NF',          key: 'numero_nf',        tdStyle: { fontWeight: 700, color: C.accent } },
              { label: 'Fornecedor',  render: r => <Ellipsis maxWidth={180}>{r.fornecedor}</Ellipsis> },
              { label: 'Itens',       render: r => <span style={{ color: C.muted }}>{r.itens} {r.itens === 1 ? 'item' : 'itens'}</span> },
              { label: 'Recebimento', render: r => <span style={{ whiteSpace: 'nowrap', color: C.okText, fontWeight: 500 }}>{fmtDate(r.data_recebimento)}</span> },
              { label: 'Valor total', render: r => <span style={{ fontWeight: 700, color: C.brand }}>{fmtCurrency(r.vlr_total)}</span> },
            ]}
            rows={nfsAgrupadas}
          />
        </Card>
      </div>
    </div>
  )
}
