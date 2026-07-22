import { useState, useMemo } from 'react'
import { Card, SearchInput, Select, Badge, Ellipsis, Pill, ModalMulta } from './UI'
import { C, STATUS_EMBARQUE, STATUS_ENTREGA } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, diasDiferenca, statusEmbarque, statusEntrega } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

function CompradorChip({ nome }) {
  if (!nome || nome.includes('identificado') || nome.includes('N/I')) return <span style={{ color: C.subtle, fontSize: 11 }}>—</span>
  const cor = CORES_COMP[nome] || C.accent
  const ini = nome.split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: cor + '20', border: `1.5px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: cor }}>{ini}</div>
      <span style={{ fontSize: 12, color: C.brand, fontWeight: 500, whiteSpace: 'nowrap' }}>{nome.split(' ')[0]}</span>
    </div>
  )
}

// Coluna de atraso — clara e intuitiva
function AtrasoChip({ dias }) {
  if (dias === null || dias === undefined) return <span style={{ color: C.subtle }}>—</span>
  const d = Math.round(dias)
  if (d > 0) return (
    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.dangerDim, color: C.danger, border: `1px solid ${C.danger}44`, whiteSpace: 'nowrap' }}>
      ⚠ {d}d atrasado
    </span>
  )
  if (d === 0) return (
    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.warnDim, color: C.warning, whiteSpace: 'nowrap' }}>
      📅 Hoje
    </span>
  )
  const restam = Math.abs(d)
  const cor = restam <= 3 ? C.warning : C.success
  const bgCor = restam <= 3 ? C.warnDim : C.okDim
  return (
    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bgCor, color: cor, whiteSpace: 'nowrap' }}>
      ✓ {restam}d restam
    </span>
  )
}

// Aba Calendário de embarques
function CalendarioEmbarques({ pedidos, onConfirmarEmbarque }) {
  const hoje = new Date()
  const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const [mes, setMes] = useState(anoMes)

  const diasDoMes = useMemo(() => {
    const [y, m] = mes.split('-').map(Number)
    const total = new Date(y, m, 0).getDate()
    const primeiro = new Date(y, m - 1, 1).getDay()
    return { total, primeiro, ano: y, mes: m }
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

  const navMes = (d) => {
    const [y, m] = mes.split('-').map(Number)
    const dt = new Date(y, m - 1 + d, 1)
    setMes(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
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

  const [diaSelected, setDiaSelected] = useState(null)
  const pedidosDia = diaSelected
    ? embarquesPorDia[`${diasDoMes.ano}-${String(diasDoMes.mes).padStart(2, '0')}-${String(diaSelected).padStart(2, '0')}`] || []
    : []

  const nomesMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, alignItems: 'start' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => navMes(-1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontSize: 14, color: C.brand }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>{nomesMes[diasDoMes.mes - 1]} {diasDoMes.ano}</div>
          <button onClick={() => navMes(1)}  style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontSize: 14, color: C.brand }}>›</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <th key={d} style={{ padding: '6px 2px', textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 600 }}>{d}</th>
            ))}</tr>
          </thead>
          <tbody>
            {semanas.map((sem, si) => (
              <tr key={si}>
                {sem.map((dia, di) => {
                  if (!dia) return <td key={di} />
                  const key = `${diasDoMes.ano}-${String(diasDoMes.mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                  const itens = embarquesPorDia[key] || []
                  const isHoje = key === `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`
                  const isSel = diaSelected === dia
                  const passado = new Date(key) < new Date(hoje.toDateString())
                  const temItens = itens.length > 0
                  return (
                    <td key={di} onClick={() => temItens && setDiaSelected(isSel ? null : dia)}
                      style={{ padding: 3, textAlign: 'center', verticalAlign: 'top', cursor: temItens ? 'pointer' : 'default' }}>
                      <div style={{
                        borderRadius: 8, padding: '6px 4px', minHeight: 52, position: 'relative',
                        background: isSel ? C.accentDim : isHoje ? '#F0FDF4' : temItens ? (passado ? C.dangerDim : C.warnDim) : 'transparent',
                        border: isSel ? `2px solid ${C.accent}` : isHoje ? `2px solid ${C.success}` : temItens ? `1px solid ${passado ? C.danger : C.warning}44` : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: isHoje ? 800 : 500, color: isSel ? C.accentText : isHoje ? C.success : C.brand }}>{dia}</div>
                        {temItens && (
                          <div style={{ marginTop: 2 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: passado ? C.danger : C.warning }}>{itens.length}</div>
                            <div style={{ fontSize: 9, color: passado ? C.danger : C.warning }}>{itens.length === 1 ? 'embarq.' : 'embarqs.'}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: C.muted }}>
          <span>🟡 Embarque previsto</span>
          <span>🔴 Embarque vencido</span>
          <span style={{ color: C.success }}>● Hoje</span>
        </div>
      </Card>

      {/* Painel do dia selecionado */}
      <Card style={{ minHeight: 200 }}>
        {diaSelected ? (
          <>
            <CardTitle>{pedidosDia.length} embarque{pedidosDia.length !== 1 ? 's' : ''} em {String(diaSelected).padStart(2,'0')}/{String(diasDoMes.mes).padStart(2,'0')}/{diasDoMes.ano}</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pedidosDia.map((p, i) => {
                const passado = new Date(p.data_embarque) < new Date(hoje.toDateString())
                return (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: passado ? C.dangerDim : C.warnDim, border: `1px solid ${passado ? C.danger : C.warning}44` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.brand }}>
                      Pedido <span style={{ color: C.accent }}>#{p.numero_pedido}</span>
                      <CompradorChip nome={p.comprador} />
                    </div>
                    <div style={{ fontSize: 12, color: C.brand, margin: '3px 0' }}>{p.fornecedor}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{p.descricao_produto} · Qtd: {fmtInt(p.quantidade_pendente)}</div>
                    {passado && (
                      <button onClick={() => onConfirmarEmbarque(p)} style={{
                        width: '100%', padding: '7px', borderRadius: 7,
                        border: `1px solid ${C.success}`, background: C.okDim,
                        color: C.okText, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      }}>✓ Confirmar embarque</button>
                    )}
                    {!passado && (
                      <div style={{ fontSize: 11, color: C.warnText, fontWeight: 500 }}>📅 Embarque programado</div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.subtle }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13 }}>Clique em um dia com embarques para ver os detalhes</div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function Pedidos({ pedidos, onReload }) {
  const [search, setSearch]           = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('')
  const [filtroEmbarque, setFiltroEmbarque] = useState('')
  const [filtroForn, setFiltroForn]   = useState('')
  const [filtroComp, setFiltroComp]   = useState('')
  const [modalPedido, setModalPedido] = useState(null)
  const [abaAtiva, setAbaAtiva]       = useState('lista')
  const [confirmando, setConfirmando] = useState(null)
  const [obsConf, setObsConf]         = useState('')

  const fornecedores = useMemo(() => [...new Set(pedidos.map(p => p.fornecedor).filter(Boolean))].sort(), [pedidos])
  const compradores  = useMemo(() => [...new Set(pedidos.map(p => p.comprador).filter(Boolean))].sort(), [pedidos])

  const rows = useMemo(() => {
    return pedidos.map(p => ({
      ...p,
      _stEmbarque:  statusEmbarque(p.data_embarque, p.quantidade_pendente),
      _stEntrega:   statusEntrega(p.data_prevista_entrega, p.quantidade_pendente),
      _diasEntrega: diasDiferenca(p.data_prevista_entrega),
    })).filter(p => {
      if (filtroEntrega  && p._stEntrega  !== filtroEntrega)  return false
      if (filtroEmbarque && p._stEmbarque !== filtroEmbarque) return false
      if (filtroForn     && p.fornecedor  !== filtroForn)     return false
      if (filtroComp     && p.comprador   !== filtroComp)     return false
      if (search) {
        const q = search.toLowerCase()
        if (![(p.fornecedor||''),(p.descricao_produto||''),(p.comprador||''),String(p.numero_pedido||'')].some(v => v.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [pedidos, search, filtroEntrega, filtroEmbarque, filtroForn, filtroComp])

  const alertas   = rows.filter(r => r._stEmbarque === 'ALERTA').length
  const atrasados = rows.filter(r => r._stEntrega  === 'ATRASADO').length

  const handleDecide = async (pedido, decisao) => {
    await supabase.from('alertas_multa').insert({
      numero_pedido: pedido.numero_pedido, fornecedor: pedido.fornecedor,
      codigo_produto: pedido.codigo_produto, data_embarque: pedido.data_embarque,
      decisao, observacao: JSON.stringify({ obs: obsConf }), decidido_em: new Date().toISOString(),
    })
    setModalPedido(null)
    setConfirmando(null)
    setObsConf('')
    onReload()
  }

  const handleConfirmarEmbarque = (pedido) => setConfirmando(pedido)

  const { CardTitle } = { CardTitle: ({ children }) => <div style={{ fontSize: 14, fontWeight: 700, color: C.brand, marginBottom: 14 }}>{children}</div> }

  return (
    <>
      {modalPedido && <ModalMulta pedido={modalPedido} onDecide={handleDecide} onClose={() => setModalPedido(null)} />}

      {/* Modal confirmar embarque */}
      {confirmando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, marginBottom: 4 }}>✓ Confirmar embarque</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Pedido #{confirmando.numero_pedido} · {confirmando.fornecedor}</div>
            <div style={{ background: C.okDim, border: `1px solid ${C.success}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: C.brand }}>
              <div>Produto: <strong>{confirmando.descricao_produto}</strong></div>
              <div>Data de embarque: <strong>{fmtDate(confirmando.data_embarque)}</strong></div>
              <div>Qtd pendente: <strong>{fmtInt(confirmando.quantidade_pendente)}</strong></div>
            </div>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Observação (opcional)</label>
            <textarea value={obsConf} onChange={e => setObsConf(e.target.value)} rows={2}
              placeholder="Ex: Transportadora contratada, previsão chegada 25/07..."
              style={{ width: '100%', marginTop: 6, marginBottom: 14, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', color: C.text, background: C.bg }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDecide(confirmando, 'EMBARCADO')} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.success}`, background: C.okDim, color: C.okText, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>✓ Confirmar embarque</button>
              <button onClick={() => { setConfirmando(null); setObsConf('') }} style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 2 }}>
        {[['lista','📋 Lista de pedidos'], ['calendario','📅 Calendário de embarques']].map(([id, label]) => (
          <button key={id} onClick={() => setAbaAtiva(id)} style={{
            padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13,
            background: 'transparent', fontWeight: abaAtiva === id ? 600 : 400,
            color: abaAtiva === id ? C.accent : C.muted,
            borderBottom: abaAtiva === id ? `2px solid ${C.accent}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {abaAtiva === 'calendario' && (
        <CalendarioEmbarques pedidos={pedidos} onConfirmarEmbarque={handleConfirmarEmbarque} />
      )}

      {abaAtiva === 'lista' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>Pedidos em aberto</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', gap: 12 }}>
                <span>{rows.length} itens</span>
                {atrasados > 0 && <span style={{ color: C.danger, fontWeight: 600 }}>⚠ {atrasados} atrasados</span>}
                {alertas    > 0 && <span style={{ color: C.warning, fontWeight: 600 }}>🚚 {alertas} verificar embarque</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, comprador..." />
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Pedido','Comprador','Fornecedor','Produto','Qtd pedida','Pendente','Embarque','Prev. entrega','Situação','Data pedido','Projeto','Valor','Ação'].map(h => (
                    <th key={h} style={{ padding: '10px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0
                  ? <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: C.subtle }}>Nenhum pedido encontrado</td></tr>
                  : rows.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#FAFAFA' : C.surface }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#FAFAFA' : C.surface}
                    >
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: C.accent }}>{p.numero_pedido}</td>
                      <td style={{ padding: '9px 10px' }}><CompradorChip nome={p.comprador} /></td>
                      <td style={{ padding: '9px 10px' }}><Ellipsis maxWidth={160}>{p.fornecedor}</Ellipsis></td>
                      <td style={{ padding: '9px 10px' }}><Ellipsis maxWidth={200} title={p.descricao_produto}>{p.descricao_produto}</Ellipsis></td>
                      <td style={{ padding: '9px 10px', color: C.muted }}>{fmtInt(p.quantidade_pedida)}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 600, color: parseFloat(p.quantidade_pendente) > 0 ? C.warning : C.success }}>{fmtInt(p.quantidade_pendente)}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{fmtDate(p.data_embarque)}</div>
                        <Badge cfg={STATUS_EMBARQUE[p._stEmbarque]} />
                        {p._stEmbarque === 'ALERTA' && (
                          <button onClick={() => setModalPedido(p)} style={{ display: 'block', marginTop: 3, fontSize: 10, padding: '2px 7px', borderRadius: 4, border: `1px solid ${C.warning}`, background: C.warnDim, color: C.warnText, cursor: 'pointer' }}>Verificar →</button>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ fontSize: 11, marginBottom: 2 }}>{fmtDate(p.data_prevista_entrega)}</div>
                        <Badge cfg={STATUS_ENTREGA[p._stEntrega]} />
                      </td>
                      <td style={{ padding: '9px 10px' }}><AtrasoChip dias={p._diasEntrega} /></td>
                      <td style={{ padding: '9px 10px', color: C.muted, fontSize: 11 }}>{fmtDate(p.data_pedido)}</td>
                      <td style={{ padding: '9px 10px' }}><Pill>{p.projeto}</Pill></td>
                      <td style={{ padding: '9px 10px', fontWeight: 600 }}>{fmtCurrency(p.valor_item)}</td>
                      <td style={{ padding: '9px 10px' }}>
                        {p.data_embarque && (
                          <button onClick={() => handleConfirmarEmbarque(p)} style={{
                            padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.success}`,
                            background: C.okDim, color: C.okText, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                          }}>✓ Embarcou</button>
                        )}
                      </td>
                    </tr>
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
