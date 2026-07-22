import { useState, useMemo } from 'react'
import { Card, CardTitle, SearchInput, Select, Badge, Ellipsis, Pill, ModalMulta } from './UI'
import { C, STATUS_EMBARQUE, STATUS_ENTREGA } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, diasDiferenca, statusEmbarque, statusEntrega } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

function CompradorChip({ nome }) {
  if (!nome || nome.includes('identificado') || nome.includes('N/I')) return null
  const cor = CORES_COMP[nome] || C.accent
  const ini = nome.split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: cor + '20', border: `1.5px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: cor }}>{ini}</div>
      <span style={{ fontSize: 12, color: C.brand, fontWeight: 500 }}>{nome.split(' ')[0]}</span>
    </div>
  )
}

function AtrasoChip({ dias }) {
  if (dias === null || dias === undefined) return <span style={{ color: C.subtle, fontSize: 11 }}>—</span>
  const d = Math.round(dias)
  if (d > 0) return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.dangerDim, color: C.danger, whiteSpace: 'nowrap' }}>⚠ {d}d atraso</span>
  if (d === 0) return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.warnDim, color: C.warning, whiteSpace: 'nowrap' }}>📅 Hoje</span>
  const r = Math.abs(d)
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: r <= 3 ? C.warnDim : C.okDim, color: r <= 3 ? C.warning : C.success, whiteSpace: 'nowrap' }}>✓ {r}d restam</span>
}

// Pior status de um grupo de itens
function piorStatus(itens, campo, fn) {
  const ordem = ['ATRASADO', 'ALERTA', 'EM_BREVE', 'NO_PRAZO', 'SEM_DATA', 'ENTREGUE']
  const statuses = itens.map(p => fn(p[campo], p.quantidade_pendente))
  return statuses.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))[0] || 'SEM_DATA'
}

// ── LINHA DE PEDIDO AGRUPADO ─────────────────────────────────────────────
function PedidoRow({ pedido, itens, onVerificar, onConfirmarEmbarque, idx }) {
  const [aberto, setAberto] = useState(false)

  const stEmb  = piorStatus(itens, 'data_embarque', statusEmbarque)
  const stEnt  = piorStatus(itens, 'data_prevista_entrega', statusEntrega)
  const diasEnt = diasDiferenca(itens[0]?.data_prevista_entrega)
  const valorTotal = itens.reduce((s, p) => s + (parseFloat(p.valor_item) || 0), 0)
  const qtdPendente = itens.reduce((s, p) => s + (parseFloat(p.quantidade_pendente) || 0), 0)

  // Cor de fundo da linha conforme criticidade
  const corFundo = stEnt === 'ATRASADO'  ? '#FFF5F5'
                 : stEmb === 'ALERTA'    ? '#FFFBF0'
                 : stEnt === 'EM_BREVE'  ? '#FFFDF0'
                 : idx % 2 === 1         ? '#FAFAFA'
                 : C.surface

  return (
    <>
      {/* LINHA PRINCIPAL — nível pedido */}
      <tr
        onClick={() => setAberto(a => !a)}
        style={{ borderBottom: aberto ? 'none' : `1px solid ${C.border}`, background: corFundo, cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
        onMouseLeave={e => e.currentTarget.style.background = corFundo}
      >
        {/* Seta expand */}
        <td style={{ padding: '11px 10px', width: 32 }}>
          <span style={{ fontSize: 11, color: C.muted, transition: 'transform 0.15s', display: 'inline-block', transform: aberto ? 'rotate(90deg)' : 'none' }}>▶</span>
        </td>
        {/* Pedido # */}
        <td style={{ padding: '11px 10px' }}>
          <div style={{ fontWeight: 800, color: C.accent, fontSize: 14 }}>#{pedido}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{itens.length} {itens.length === 1 ? 'item' : 'itens'}</div>
        </td>
        {/* Comprador */}
        <td style={{ padding: '11px 10px' }}><CompradorChip nome={itens[0]?.comprador} /></td>
        {/* Fornecedor */}
        <td style={{ padding: '11px 10px' }}>
          <Ellipsis maxWidth={200}>{itens[0]?.fornecedor}</Ellipsis>
          {itens[0]?.projeto && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{itens[0].projeto}</div>}
        </td>
        {/* Qtd pendente total */}
        <td style={{ padding: '11px 10px', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: qtdPendente > 0 ? C.warning : C.success }}>{fmtInt(qtdPendente)}</span>
          <div style={{ fontSize: 10, color: C.muted }}>pendente</div>
        </td>
        {/* Embarque */}
        <td style={{ padding: '11px 10px' }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{fmtDate(itens[0]?.data_embarque)}</div>
          <Badge cfg={STATUS_EMBARQUE[stEmb]} />
        </td>
        {/* Entrega */}
        <td style={{ padding: '11px 10px' }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{fmtDate(itens[0]?.data_prevista_entrega)}</div>
          <Badge cfg={STATUS_ENTREGA[stEnt]} />
        </td>
        {/* Situação */}
        <td style={{ padding: '11px 10px' }}><AtrasoChip dias={diasEnt} /></td>
        {/* Valor total */}
        <td style={{ padding: '11px 10px', fontWeight: 700, fontSize: 13 }}>{fmtCurrency(valorTotal)}</td>
        {/* Ações */}
        <td style={{ padding: '11px 10px' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {stEmb === 'ALERTA' && (
              <button onClick={e => { e.stopPropagation(); onVerificar(itens[0]) }}
                style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.warning}`, background: C.warnDim, color: C.warnText, fontSize: 10, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Verificar
              </button>
            )}
            {itens[0]?.data_embarque && (
              <button onClick={e => { e.stopPropagation(); onConfirmarEmbarque(itens[0]) }}
                style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.success}`, background: C.okDim, color: C.okText, fontSize: 10, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ✓ Embarcou
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* ITENS EXPANDIDOS */}
      {aberto && (
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          <td colSpan={10} style={{ padding: 0 }}>
            <div style={{ background: '#F5F7FF', borderTop: `1px dashed ${C.border}`, padding: '10px 16px 10px 48px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Itens do pedido #{pedido}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Cód.','Produto','Qtd pedida','Qtd entregue','Pendente','Valor item','Data pedido'].map(h => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, j) => (
                    <tr key={j} style={{ borderBottom: `1px solid ${C.border}88`, background: j % 2 ? '#EEF2FF' : 'white' }}>
                      <td style={{ padding: '7px 10px', color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>{it.codigo_produto}</td>
                      <td style={{ padding: '7px 10px', maxWidth: 280 }}>
                        <span title={it.descricao_produto} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.brand, fontWeight: 500 }}>{it.descricao_produto}</span>
                      </td>
                      <td style={{ padding: '7px 10px', color: C.muted }}>{fmtInt(it.quantidade_pedida)}</td>
                      <td style={{ padding: '7px 10px', color: C.okText, fontWeight: 600 }}>{fmtInt(it.quantidade_entregue)}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ fontWeight: 700, color: parseFloat(it.quantidade_pendente) > 0 ? C.warning : C.success }}>{fmtInt(it.quantidade_pendente)}</span>
                        {parseFloat(it.quantidade_entregue) > 0 && parseFloat(it.quantidade_pendente) > 0 && (
                          <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>
                            ({Math.round(parseFloat(it.quantidade_entregue) / parseFloat(it.quantidade_pedida) * 100)}% entregue)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 600 }}>{fmtCurrency(it.valor_item)}</td>
                      <td style={{ padding: '7px 10px', color: C.muted }}>{fmtDate(it.data_pedido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── CALENDÁRIO ───────────────────────────────────────────────────────────────
function CalendarioEmbarques({ pedidos, onConfirmarEmbarque }) {
  const hoje = new Date()
  const hojeKey = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`
  const anoMes = hojeKey.slice(0, 7)
  const [mes, setMes] = useState(anoMes)
  const [diaSelected, setDiaSelected] = useState(null)

  const diasDoMes = useMemo(() => {
    const [y, m] = mes.split('-').map(Number)
    return { total: new Date(y, m, 0).getDate(), primeiro: new Date(y, m - 1, 1).getDay(), ano: y, mes: m }
  }, [mes])

  const embarquesPorDia = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      if (!p.data_embarque) return
      const s = String(p.data_embarque).match(/(\d{4})-(\d{2})-(\d{2})/)
      if (!s) return
      const key = `${s[1]}-${s[2]}-${s[3]}`
      if (!map[key]) map[key] = []
      map[key].push(p)
    })
    return map
  }, [pedidos])

  const navMes = d => {
    const [y, m] = mes.split('-').map(Number)
    const dt = new Date(y, m - 1 + d, 1)
    setMes(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`)
    setDiaSelected(null)
  }

  const semanas = useMemo(() => {
    const cells = []
    for (let i = 0; i < diasDoMes.primeiro; i++) cells.push(null)
    for (let d = 1; d <= diasDoMes.total; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const rows = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [diasDoMes])

  const pedidosDia = diaSelected
    ? embarquesPorDia[`${diasDoMes.ano}-${String(diasDoMes.mes).padStart(2,'0')}-${String(diaSelected).padStart(2,'0')}`] || []
    : []

  const nomesMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, alignItems: 'start' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => navMes(-1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 14px', cursor: 'pointer', fontSize: 16, color: C.brand }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>{nomesMes[diasDoMes.mes-1]} {diasDoMes.ano}</div>
          <button onClick={() => navMes(1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 14px', cursor: 'pointer', fontSize: 16, color: C.brand }}>›</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => <th key={d} style={{ padding: '6px 2px', textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 600 }}>{d}</th>)}</tr></thead>
          <tbody>
            {semanas.map((sem, si) => (
              <tr key={si}>{sem.map((dia, di) => {
                if (!dia) return <td key={di} style={{ padding: 3 }} />
                const key = `${diasDoMes.ano}-${String(diasDoMes.mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                const itens = embarquesPorDia[key] || []
                const isHoje = key === hojeKey
                const isSel = diaSelected === dia
                const passado = key < hojeKey
                return (
                  <td key={di} onClick={() => itens.length && setDiaSelected(isSel ? null : dia)} style={{ padding: 3, textAlign: 'center', verticalAlign: 'top', cursor: itens.length ? 'pointer' : 'default' }}>
                    <div style={{ borderRadius: 8, padding: '6px 4px', minHeight: 52, background: isSel ? C.accentDim : isHoje ? '#F0FDF4' : itens.length ? (passado ? C.dangerDim : C.warnDim) : 'transparent', border: isSel ? `2px solid ${C.accent}` : isHoje ? `2px solid ${C.success}` : itens.length ? `1px solid ${passado ? C.danger : C.warning}44` : '1px solid transparent' }}>
                      <div style={{ fontSize: 13, fontWeight: isHoje ? 800 : 500, color: isSel ? C.accentText : isHoje ? C.success : C.brand }}>{dia}</div>
                      {itens.length > 0 && <><div style={{ fontSize: 11, fontWeight: 700, color: passado ? C.danger : C.warning }}>{itens.length}</div><div style={{ fontSize: 9, color: passado ? C.danger : C.warning }}>emb.</div></>}
                    </div>
                  </td>
                )
              })}</tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: C.muted }}>
          <span>🟡 Previsto</span><span>🔴 Vencido</span><span style={{ color: C.success }}>● Hoje</span>
        </div>
      </Card>

      <Card>
        {diaSelected ? (
          <>
            <CardTitle>{pedidosDia.length} embarque{pedidosDia.length !== 1 ? 's' : ''} em {String(diaSelected).padStart(2,'0')}/{String(diasDoMes.mes).padStart(2,'0')}/{diasDoMes.ano}</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pedidosDia.map((p, i) => {
                const key = `${diasDoMes.ano}-${String(diasDoMes.mes).padStart(2,'0')}-${String(diaSelected).padStart(2,'0')}`
                const passado = key < hojeKey
                return (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: passado ? C.dangerDim : C.warnDim, border: `1px solid ${passado ? C.danger : C.warning}44` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.brand, marginBottom: 4 }}>Pedido <span style={{ color: C.accent }}>#{p.numero_pedido}</span> <CompradorChip nome={p.comprador} /></div>
                    <div style={{ fontSize: 12, color: C.brand, marginBottom: 2 }}>{p.fornecedor}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{p.descricao_produto} · Qtd: {fmtInt(p.quantidade_pendente)}</div>
                    {passado
                      ? <button onClick={() => onConfirmarEmbarque(p)} style={{ width: '100%', padding: '7px', borderRadius: 7, border: `1px solid ${C.success}`, background: C.okDim, color: C.okText, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✓ Confirmar embarque</button>
                      : <div style={{ fontSize: 11, color: C.warnText, fontWeight: 500 }}>📅 Embarque programado</div>
                    }
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.subtle }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13 }}>Clique em um dia com embarques</div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── RANKING ATRASOS ──────────────────────────────────────────────────────────
function RankingAtrasos({ pedidos }) {
  const ranking = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      if (statusEntrega(p.data_prevista_entrega, p.quantidade_pendente) !== 'ATRASADO') return
      const f = p.fornecedor || '—'
      if (!map[f]) map[f] = { fornecedor: f, itens: 0, diasTotal: 0, maior: 0 }
      map[f].itens++
      const d = Math.abs(diasDiferenca(p.data_prevista_entrega) || 0)
      map[f].diasTotal += d
      if (d > map[f].maior) map[f].maior = d
    })
    return Object.values(map).sort((a, b) => b.itens - a.itens).slice(0, 8)
  }, [pedidos])

  const max = Math.max(...ranking.map(r => r.itens), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
      <Card>
        <CardTitle>Quem mais atrasou — entregas fora do prazo</CardTitle>
        {ranking.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}><div style={{ fontSize: 36 }}>🎉</div><div>Sem atrasos</div></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ranking.map((r, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.brand }}>{i+1}. {r.fornecedor}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{r.itens} itens</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 24, background: '#FEE2E2', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: `linear-gradient(90deg, #DC2626, #FF6B6B)`, width: `${Math.round(r.itens/max*100)}%`, borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{r.itens} {r.itens===1?'item':'itens'}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>maior: <strong style={{ color: C.danger }}>{r.maior}d</strong> · média: <strong>{Math.round(r.diasTotal/r.itens)}d</strong></span>
                </div>
              </div>
            ))}
          </div>
        }
      </Card>
      <Card>
        <CardTitle>Detalhamento</CardTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#F9FAFB' }}>{['Fornecedor','Itens','Maior atraso','Média'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: `2px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {ranking.length === 0
              ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: C.subtle }}>Sem atrasos</td></tr>
              : ranking.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i%2?'#FAFAFA':C.surface }}>
                  <td style={{ padding: '8px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.fornecedor}>{r.fornecedor}</td>
                  <td style={{ padding: '8px 10px' }}><span style={{ background: C.dangerDim, color: C.dangerText, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.itens}</span></td>
                  <td style={{ padding: '8px 10px', color: C.danger, fontWeight: 700 }}>{r.maior}d</td>
                  <td style={{ padding: '8px 10px', color: C.muted }}>{Math.round(r.diasTotal/r.itens)}d</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Pedidos({ pedidos, onReload }) {
  const [search, setSearch]               = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('')
  const [filtroEmbarque, setFiltroEmbarque] = useState('')
  const [filtroForn, setFiltroForn]       = useState('')
  const [filtroComp, setFiltroComp]       = useState('')
  const [modalPedido, setModalPedido]     = useState(null)
  const [abaAtiva, setAbaAtiva]           = useState('lista')
  const [confirmando, setConfirmando]     = useState(null)
  const [obsConf, setObsConf]             = useState('')

  const fornecedores = useMemo(() => [...new Set(pedidos.map(p => p.fornecedor).filter(Boolean))].sort(), [pedidos])
  const compradores  = useMemo(() => [...new Set(pedidos.map(p => p.comprador).filter(Boolean))].sort(), [pedidos])

  // Agrupa pedidos por numero_pedido
  const pedidosAgrupados = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = []
      map[k].push({
        ...p,
        _stEmbarque: statusEmbarque(p.data_embarque, p.quantidade_pendente),
        _stEntrega:  statusEntrega(p.data_prevista_entrega, p.quantidade_pendente),
      })
    })

    return Object.entries(map)
      .map(([num, itens]) => ({ num, itens, _piorPrioridade: Math.min(...itens.map(i => i.prioridade || 5)) }))
      .filter(({ num, itens }) => {
        // Filtros
        if (filtroForn && itens[0]?.fornecedor !== filtroForn) return false
        if (filtroComp && itens[0]?.comprador  !== filtroComp) return false
        if (filtroEntrega) {
          const st = piorStatus(itens, 'data_prevista_entrega', statusEntrega)
          if (st !== filtroEntrega) return false
        }
        if (filtroEmbarque) {
          const st = piorStatus(itens, 'data_embarque', statusEmbarque)
          if (st !== filtroEmbarque) return false
        }
        if (search) {
          const q = search.toLowerCase()
          if (![(itens[0]?.fornecedor||''),(itens[0]?.comprador||''),num].some(v => String(v).toLowerCase().includes(q))
            && !itens.some(i => (i.descricao_produto||'').toLowerCase().includes(q))) return false
        }
        return true
      })
      .sort((a, b) => a._piorPrioridade - b._piorPrioridade)
  }, [pedidos, search, filtroForn, filtroComp, filtroEntrega, filtroEmbarque])

  const handleDecide = async (pedido, decisao) => {
    await supabase.from('alertas_multa').insert({
      numero_pedido: pedido.numero_pedido, fornecedor: pedido.fornecedor,
      codigo_produto: pedido.codigo_produto, data_embarque: pedido.data_embarque,
      decisao, observacao: JSON.stringify({ obs: obsConf }), decidido_em: new Date().toISOString(),
    })
    setModalPedido(null); setConfirmando(null); setObsConf(''); onReload()
  }

  const atrasados = pedidosAgrupados.filter(({ itens }) => piorStatus(itens, 'data_prevista_entrega', statusEntrega) === 'ATRASADO').length
  const alertas   = pedidosAgrupados.filter(({ itens }) => piorStatus(itens, 'data_embarque', statusEmbarque) === 'ALERTA').length

  return (
    <>
      {modalPedido && <ModalMulta pedido={modalPedido} onDecide={handleDecide} onClose={() => setModalPedido(null)} />}

      {confirmando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, marginBottom: 4 }}>✓ Confirmar embarque</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Pedido #{confirmando.numero_pedido} · {confirmando.fornecedor}</div>
            <div style={{ background: C.okDim, border: `1px solid ${C.success}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
              <div>Produto: <strong>{confirmando.descricao_produto}</strong></div>
              <div>Data embarque: <strong>{fmtDate(confirmando.data_embarque)}</strong></div>
            </div>
            <textarea value={obsConf} onChange={e => setObsConf(e.target.value)} rows={2} placeholder="Observação opcional..."
              style={{ width: '100%', marginBottom: 14, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', color: C.text, background: C.bg }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDecide(confirmando, 'EMBARCADO')} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.success}`, background: C.okDim, color: C.okText, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>✓ Confirmar</button>
              <button onClick={() => { setConfirmando(null); setObsConf('') }} style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 2 }}>
        {[['lista','📋 Pedidos'],['calendario','📅 Calendário'],['atrasos','📊 Ranking de atrasos']].map(([id, label]) => (
          <button key={id} onClick={() => setAbaAtiva(id)} style={{ padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13, background: 'transparent', fontWeight: abaAtiva === id ? 600 : 400, color: abaAtiva === id ? C.accent : C.muted, borderBottom: abaAtiva === id ? `2px solid ${C.accent}` : '2px solid transparent', transition: 'all 0.15s' }}>{label}</button>
        ))}
      </div>

      {abaAtiva === 'calendario' && <CalendarioEmbarques pedidos={pedidos} onConfirmarEmbarque={setConfirmando} />}
      {abaAtiva === 'atrasos'   && <RankingAtrasos pedidos={pedidos} />}

      {abaAtiva === 'lista' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Header + filtros */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>Pedidos em aberto</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', gap: 12 }}>
                <span><strong>{pedidosAgrupados.length}</strong> pedidos</span>
                <span style={{ color: C.muted }}>·</span>
                <span><strong>{pedidos.length}</strong> itens</span>
                {atrasados > 0 && <span style={{ color: C.danger, fontWeight: 600 }}>⚠ {atrasados} pedidos atrasados</span>}
                {alertas    > 0 && <span style={{ color: C.warning, fontWeight: 600 }}>🚚 {alertas} verificar embarque</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
              <Select value={filtroEntrega} onChange={setFiltroEntrega} options={[
                { value: '', label: 'Status entrega' },
                { value: 'ATRASADO',  label: '🔴 Atrasado' },
                { value: 'EM_BREVE',  label: '🟡 Vence em breve' },
                { value: 'NO_PRAZO',  label: '🟢 No prazo' },
                { value: 'SEM_DATA',  label: '⚪ Sem data' },
              ]} />
              <Select value={filtroEmbarque} onChange={setFiltroEmbarque} options={[
                { value: '', label: 'Status embarque' },
                { value: 'ALERTA',   label: '🟠 Verificar' },
                { value: 'EM_BREVE', label: '🟡 Em breve' },
                { value: 'NO_PRAZO', label: '🟢 No prazo' },
              ]} />
              <Select value={filtroComp} onChange={setFiltroComp} options={[
                { value: '', label: 'Todos compradores' },
                ...compradores.map(c => ({ value: c, label: c }))
              ]} />
              <Select value={filtroForn} onChange={setFiltroForn} options={[
                { value: '', label: 'Todos fornecedores' },
                ...fornecedores.map(f => ({ value: f, label: f.length > 30 ? f.slice(0, 30) + '…' : f }))
              ]} />
            </div>
          </div>

          {/* TABELA AGRUPADA */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ width: 32, borderBottom: `2px solid ${C.border}` }} />
                  {['Pedido','Comprador','Fornecedor / Projeto','Qtd pendente','Embarque','Prev. entrega','Situação','Valor total','Ações'].map(h => (
                    <th key={h} style={{ padding: '10px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosAgrupados.length === 0
                  ? <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.subtle }}>Nenhum pedido encontrado</td></tr>
                  : pedidosAgrupados.map(({ num, itens }, idx) => (
                    <PedidoRow key={num} pedido={num} itens={itens} idx={idx}
                      onVerificar={setModalPedido}
                      onConfirmarEmbarque={setConfirmando} />
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
