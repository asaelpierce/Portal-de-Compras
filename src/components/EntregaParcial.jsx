import { useMemo, useState, useEffect } from 'react'
import { Card, CardTitle, DataTable, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, statusEntrega } from '../lib/utils'
import { supabase } from '../lib/supabase'

function PctBar({ entregue, pedido }) {
  const pct = pedido > 0 ? Math.round((entregue / pedido) * 100) : 0
  const cor  = pct >= 100 ? C.success : pct >= 50 ? C.warning : C.danger
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background:cor, borderRadius:3, transition:'width 0.3s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color:cor, minWidth:32 }}>{pct}%</span>
    </div>
  )
}

// ── MODAL PROGRAMAR LOTES ────────────────────────────────────────────────────
function ModalProgramarLotes({ pedido, onClose, onSalvar }) {
  const hoje = new Date().toISOString().split('T')[0]
  const [qtdLotes, setQtdLotes] = useState(2)
  const [lotes, setLotes] = useState([
    { quantidade: '', data_prevista: '' },
    { quantidade: '', data_prevista: '' },
  ])
  const [salvando, setSalvando] = useState(false)

  const qtdTotal = pedido.itens.reduce((s, i) => s + (parseFloat(i.quantidade_pendente) || 0), 0)
  const qtdProgramada = lotes.reduce((s, l) => s + (parseFloat(l.quantidade) || 0), 0)
  const qtdRestante   = qtdTotal - qtdProgramada

  const setLote = (i, campo, val) => {
    setLotes(prev => prev.map((l, idx) => idx === i ? { ...l, [campo]: val } : l))
  }

  const ajustarLotes = (n) => {
    setQtdLotes(n)
    setLotes(prev => {
      const novo = [...prev]
      while (novo.length < n) novo.push({ quantidade: '', data_prevista: '' })
      return novo.slice(0, n)
    })
  }

  // Distribui quantidade igualmente
  const distribuirIgual = () => {
    const qtdPorLote = (qtdTotal / qtdLotes).toFixed(2)
    setLotes(prev => prev.map(l => ({ ...l, quantidade: qtdPorLote })))
  }

  const salvar = async () => {
    const validos = lotes.filter(l => l.quantidade && l.data_prevista)
    if (validos.length === 0) return
    setSalvando(true)
    await onSalvar(pedido, validos)
    setSalvando(false)
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 12, outline: 'none',
    fontFamily: 'inherit', color: C.text, background: C.bg,
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:560, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>📅 Programar entregas em lotes</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              Pedido #{pedido.numero_pedido} · {pedido.fornecedor}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.muted }}>×</button>
        </div>

        {/* Info do pedido */}
        <div style={{ padding:'10px 14px', borderRadius:8, background:C.accentDim, border:`1px solid ${C.accent}33`, marginBottom:20, fontSize:12 }}>
          <div style={{ fontWeight:600, color:C.brand, marginBottom:4 }}>
            {pedido.itens.map(i => i.descricao_produto).join(' · ')}
          </div>
          <div style={{ color:C.muted }}>
            Quantidade total pendente: <strong style={{ color:C.accent }}>{fmtInt(qtdTotal)}</strong>
            {qtdProgramada > 0 && (
              <span style={{ marginLeft:12, color: qtdRestante < 0 ? C.danger : C.success }}>
                Programado: {fmtInt(qtdProgramada)} · Restante: {fmtInt(qtdRestante)}
              </span>
            )}
          </div>
        </div>

        {/* Número de lotes */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            Número de lotes
          </label>
          <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
            {[2,3,4,5,6].map(n => (
              <button key={n} onClick={() => ajustarLotes(n)} style={{
                width:36, height:36, borderRadius:8, border:`1.5px solid ${qtdLotes===n?C.accent:C.border}`,
                background:qtdLotes===n?C.accentDim:C.bg, color:qtdLotes===n?C.accentText:C.muted,
                fontSize:14, fontWeight:700, cursor:'pointer',
              }}>{n}</button>
            ))}
            <button onClick={distribuirIgual} style={{
              marginLeft:'auto', padding:'6px 14px', borderRadius:8,
              border:`1px solid ${C.border}`, background:C.bg, color:C.muted,
              fontSize:11, cursor:'pointer', fontWeight:500,
            }}>
              ÷ Distribuir igual
            </button>
          </div>
        </div>

        {/* Lotes */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {lotes.map((l, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'32px 1fr 1fr', gap:10, alignItems:'center', padding:'10px 12px', background:'#F9FAFB', borderRadius:8, border:`1px solid ${C.border}` }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:C.brand, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                {i+1}
              </div>
              <div>
                <label style={{ fontSize:10, color:C.muted, fontWeight:600 }}>QUANTIDADE</label>
                <input type="number" value={l.quantidade} onChange={e => setLote(i, 'quantidade', e.target.value)}
                  placeholder="Ex: 300" style={{ ...inputStyle, marginTop:3 }} />
              </div>
              <div>
                <label style={{ fontSize:10, color:C.muted, fontWeight:600 }}>DATA PREVISTA</label>
                <input type="date" value={l.data_prevista} min={hoje} onChange={e => setLote(i, 'data_prevista', e.target.value)}
                  style={{ ...inputStyle, marginTop:3 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Aviso quantidade */}
        {qtdRestante < -0.01 && (
          <div style={{ padding:'8px 12px', background:C.dangerDim, borderRadius:8, fontSize:11, color:C.danger, marginBottom:12 }}>
            ⚠️ Quantidade programada ({fmtInt(qtdProgramada)}) excede o pendente ({fmtInt(qtdTotal)})
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={salvar} disabled={salvando || lotes.some(l => !l.quantidade || !l.data_prevista)}
            style={{ flex:1, padding:11, borderRadius:8, border:'none',
              background: lotes.some(l => !l.quantidade || !l.data_prevista) ? C.border : C.brand,
              color:'white', fontSize:13, cursor:'pointer', fontWeight:600 }}>
            {salvando ? 'Salvando...' : '📅 Salvar programação'}
          </button>
          <button onClick={onClose} style={{ padding:'11px 16px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ABA PROGRAMADAS ──────────────────────────────────────────────────────────
function EntregasProgramadas({ pedidos, nfs }) {
  const [lotes, setLotes]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalPedido, setModal]     = useState(null)
  const [search, setSearch]         = useState('')
  const [filtroStatus, setFiltro]   = useState('')
  const hoje = new Date().toISOString().split('T')[0]

  const carregar = async () => {
    setLoading(true)
    const { data } = await supabase.from('lotes_programados').select('*').order('data_prevista')
    // Cruza com NFs para marcar recebidos automaticamente
    const nfsPorPedido = {}
    nfs.forEach(n => {
      if (!n.numero_pedido_oc) return
      const k = String(n.numero_pedido_oc)
      if (!nfsPorPedido[k]) nfsPorPedido[k] = []
      nfsPorPedido[k].push(n)
    })

    // Atualiza status baseado em NFs e data
    const atualizados = (data || []).map(l => {
      const nfsLote = nfsPorPedido[String(l.numero_pedido)] || []
      const totalRecebido = nfsLote.reduce((s, n) => s + (parseFloat(n.quantidade_recebida) || 0), 0)
      const atrasado = l.data_prevista < hoje && l.status !== 'RECEBIDO'
      let status = l.status
      if (totalRecebido >= parseFloat(l.quantidade) * 0.95) status = 'RECEBIDO'
      else if (atrasado) status = 'ATRASADO'
      return { ...l, status, _qtd_recebida_nf: totalRecebido }
    })
    setLotes(atualizados)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [nfs])

  const salvarLotes = async (pedido, novosLotes) => {
    // Remove lotes existentes do pedido
    await supabase.from('lotes_programados').delete().eq('numero_pedido', pedido.numero_pedido)
    // Insere novos
    const items = novosLotes.map((l, i) => ({
      numero_pedido:     pedido.numero_pedido,
      fornecedor:        pedido.fornecedor,
      descricao_produto: pedido.itens.map(it => it.descricao_produto).join(', '),
      comprador:         pedido.itens[0]?.comprador,
      numero_lote:       i + 1,
      quantidade:        parseFloat(l.quantidade),
      data_prevista:     l.data_prevista,
      status:            'PENDENTE',
    }))
    await supabase.from('lotes_programados').insert(items)
    await carregar()
  }

  const kpis = useMemo(() => ({
    total:     lotes.length,
    pendentes: lotes.filter(l => l.status === 'PENDENTE').length,
    atrasados: lotes.filter(l => l.status === 'ATRASADO').length,
    recebidos: lotes.filter(l => l.status === 'RECEBIDO').length,
  }), [lotes])

  // Agrupa por pedido
  const porPedido = useMemo(() => {
    const map = {}
    lotes.forEach(l => {
      const k = String(l.numero_pedido)
      if (!map[k]) map[k] = { numero_pedido: l.numero_pedido, fornecedor: l.fornecedor, descricao: l.descricao_produto, comprador: l.comprador, lotes: [] }
      map[k].lotes.push(l)
    })
    return Object.values(map).filter(p => {
      if (filtroStatus === 'atrasado' && !p.lotes.some(l => l.status === 'ATRASADO')) return false
      if (filtroStatus === 'pendente' && !p.lotes.some(l => l.status === 'PENDENTE')) return false
      if (filtroStatus === 'recebido' && !p.lotes.every(l => l.status === 'RECEBIDO')) return false
      if (search) {
        const q = search.toLowerCase()
        if (![(p.fornecedor||''),(p.descricao||''),String(p.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
      }
      return true
    }).sort((a, b) => {
      const temAtrasadoA = a.lotes.some(l => l.status === 'ATRASADO') ? 0 : 1
      const temAtrasadoB = b.lotes.some(l => l.status === 'ATRASADO') ? 0 : 1
      return temAtrasadoA - temAtrasadoB
    })
  }, [lotes, search, filtroStatus])

  // Pedidos disponíveis para programar
  const pedidosMap = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = { numero_pedido: p.numero_pedido, fornecedor: p.fornecedor, itens: [] }
      map[k].itens.push(p)
    })
    return map
  }, [pedidos])

  const STATUS_CFG = {
    PENDENTE:  { label:'Pendente',  cor:C.accent,   bg:C.accentDim  },
    ATRASADO:  { label:'Atrasado',  cor:C.danger,   bg:C.dangerDim  },
    RECEBIDO:  { label:'Recebido',  cor:C.success,  bg:C.okDim      },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {modalPedido && (
        <ModalProgramarLotes
          pedido={pedidosMap[String(modalPedido)] || { numero_pedido: modalPedido, fornecedor:'', itens:[] }}
          onClose={() => setModal(null)}
          onSalvar={salvarLotes}
        />
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Total lotes',  value:kpis.total,     color:C.accent  },
          { label:'Pendentes',    value:kpis.pendentes,  color:C.accent  },
          { label:'Atrasados',    value:kpis.atrasados,  color:C.danger  },
          { label:'Recebidos',    value:kpis.recebidos,  color:C.success },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, justifyContent:'space-between', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
          <Select value={filtroStatus} onChange={setFiltro} options={[
            { value:'',         label:'Todos' },
            { value:'atrasado', label:'🔴 Atrasados' },
            { value:'pendente', label:'⏳ Pendentes' },
            { value:'recebido', label:'✅ Recebidos' },
          ]} />
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11, color:C.muted }}>
          <span>Programar lotes de um pedido:</span>
          <select onChange={e => e.target.value && setModal(e.target.value)} defaultValue=""
            style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.accent}`, background:C.bg, color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer', outline:'none' }}>
            <option value="">+ Selecionar pedido</option>
            {Object.values(pedidosMap).map(p => (
              <option key={p.numero_pedido} value={p.numero_pedido}>
                #{p.numero_pedido} · {(p.fornecedor||'').substring(0,30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de lotes por pedido */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Carregando...</div>
      ) : porPedido.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Nenhuma entrega programada</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Use o seletor acima para programar lotes de um pedido</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {porPedido.map((p, i) => {
              const temAtrasado = p.lotes.some(l => l.status === 'ATRASADO')
              const todosRecebidos = p.lotes.every(l => l.status === 'RECEBIDO')
              const corBorda = temAtrasado ? C.danger : todosRecebidos ? C.success : C.accent
              const totalQtd = p.lotes.reduce((s, l) => s + parseFloat(l.quantidade), 0)
              const totalRec = p.lotes.filter(l => l.status === 'RECEBIDO').reduce((s, l) => s + parseFloat(l.quantidade), 0)

              return (
                <div key={i} style={{ border:`1px solid ${corBorda}33`, borderLeft:`4px solid ${corBorda}`, borderRadius:10, padding:'14px 16px' }}>
                  {/* Header do pedido */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                    <div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontWeight:800, color:C.accent }}>#{p.numero_pedido}</span>
                        <span style={{ fontSize:12, color:C.brand }}>{p.fornecedor}</span>
                        {temAtrasado && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:C.dangerDim, color:C.danger, fontWeight:700 }}>⚠️ Lote atrasado</span>}
                        {todosRecebidos && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:C.okDim, color:C.okText, fontWeight:700 }}>✅ Todos recebidos</span>}
                      </div>
                      <div style={{ fontSize:11, color:C.muted }}>{p.descricao?.substring(0,60)}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{ textAlign:'right', fontSize:11, color:C.muted }}>
                        {p.lotes.filter(l=>l.status==='RECEBIDO').length}/{p.lotes.length} lotes recebidos
                      </div>
                      <button onClick={() => setModal(p.numero_pedido)}
                        style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:C.bg, color:C.muted, fontSize:11, cursor:'pointer' }}>
                        ✏️ Editar
                      </button>
                    </div>
                  </div>

                  {/* Barra de progresso geral */}
                  <div style={{ marginBottom:12 }}>
                    <PctBar entregue={totalRec} pedido={totalQtd} />
                    <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{fmtInt(totalRec)} de {fmtInt(totalQtd)} recebido</div>
                  </div>

                  {/* Grid de lotes */}
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(p.lotes.length, 5)}, 1fr)`, gap:8 }}>
                    {p.lotes.map((l, j) => {
                      const cfg = STATUS_CFG[l.status] || STATUS_CFG.PENDENTE
                      const diasAtraso = l.status === 'ATRASADO'
                        ? Math.round((new Date() - new Date(l.data_prevista + 'T12:00:00')) / 86400000)
                        : 0
                      return (
                        <div key={j} style={{ padding:'10px 12px', borderRadius:8, background:cfg.bg, border:`1px solid ${cfg.cor}33`, textAlign:'center' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:cfg.cor, marginBottom:6 }}>
                            Lote {l.numero_lote}
                          </div>
                          <div style={{ fontSize:13, fontWeight:700, color:C.brand }}>{fmtInt(l.quantidade)}</div>
                          <div style={{ fontSize:10, color:C.muted, margin:'4px 0' }}>{fmtDate(l.data_prevista)}</div>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'white', color:cfg.cor }}>
                            {cfg.label}
                          </span>
                          {diasAtraso > 0 && (
                            <div style={{ fontSize:9, color:C.danger, marginTop:4, fontWeight:600 }}>{diasAtraso}d atrasado</div>
                          )}
                          {l.status === 'RECEBIDO' && l._qtd_recebida_nf > 0 && (
                            <div style={{ fontSize:9, color:C.okText, marginTop:4 }}>NF: {fmtInt(l._qtd_recebida_nf)}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function EntregaParcial({ pedidos, nfs }) {
  const [search, setSearch]       = useState('')
  const [filtroStatus, setFiltro] = useState('')
  const [filtroComp, setFiltroComp] = useState('')
  const [aba, setAba]             = useState('parciais')

  const compradores = useMemo(() => [...new Set(pedidos.map(p => p.comprador).filter(Boolean))].sort(), [pedidos])

  const porPedido = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = {
        numero_pedido: p.numero_pedido, fornecedor: p.fornecedor,
        comprador: p.comprador, data_prevista_entrega: p.data_prevista_entrega,
        qtd_pedida_total: 0, qtd_entregue_total: 0, qtd_pendente_total: 0,
        valor_total: 0, itens: [],
      }
      map[k].qtd_pedida_total   += parseFloat(p.quantidade_pedida)   || 0
      map[k].qtd_entregue_total += parseFloat(p.quantidade_entregue) || 0
      map[k].qtd_pendente_total += parseFloat(p.quantidade_pendente) || 0
      map[k].valor_total        += parseFloat(p.valor_item)          || 0
      map[k].itens.push(p)
    })
    return Object.values(map).map(p => ({
      ...p,
      pct_entregue: p.qtd_pedida_total > 0 ? Math.round(p.qtd_entregue_total / p.qtd_pedida_total * 100) : 0,
      tem_parcial:  p.qtd_entregue_total > 0 && p.qtd_pendente_total > 0,
      status_entrega: statusEntrega(p.data_prevista_entrega, p.qtd_pendente_total),
    })).sort((a, b) => {
      if (a.tem_parcial && !b.tem_parcial) return -1
      if (!a.tem_parcial && b.tem_parcial) return  1
      return 0
    })
  }, [pedidos])

  const kpis = useMemo(() => {
    const parciais      = porPedido.filter(p => p.tem_parcial)
    const parcialAtraso = parciais.filter(p => p.status_entrega === 'ATRASADO')
    const pctMedio      = parciais.length ? parciais.reduce((s, p) => s + p.pct_entregue, 0) / parciais.length : 0
    const valorPendente = porPedido.reduce((s, p) => {
      const pct = p.qtd_pedida_total > 0 ? p.qtd_pendente_total / p.qtd_pedida_total : 0
      return s + p.valor_total * pct
    }, 0)
    return { parciais: parciais.length, parcialAtraso: parcialAtraso.length, pctMedio, valorPendente }
  }, [porPedido])

  const filtrados = useMemo(() => porPedido.filter(p => {
    if (filtroStatus === 'parcial'  && !p.tem_parcial)                    return false
    if (filtroStatus === 'atrasado' && p.status_entrega !== 'ATRASADO')   return false
    if (filtroComp && p.comprador !== filtroComp)                          return false
    if (search) {
      const q = search.toLowerCase()
      if (![(p.fornecedor||''),(p.comprador||''),String(p.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [porPedido, filtroStatus, filtroComp, search])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Entregas parciais',    value:kpis.parciais,       color:C.warning },
          { label:'Parcial + atrasado',   value:kpis.parcialAtraso,  color:C.danger  },
          { label:'Atendimento médio',    value:`${kpis.pctMedio?.toFixed(0)||0}%`, color:C.accent },
          { label:'Valor pendente est.',  value:fmtCurrency(kpis.valorPendente), color:C.brand, small:true },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:k.small?16:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${C.border}` }}>
        {[
          ['parciais',    '📊 Parciais reais'],
          ['programadas', '📅 Programadas'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} style={{
            padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13,
            background:'transparent', fontWeight:aba===id?600:400,
            color:aba===id?C.accent:C.muted,
            borderBottom:aba===id?`2px solid ${C.accent}`:'2px solid transparent',
            transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ABA PROGRAMADAS */}
      {aba === 'programadas' && <EntregasProgramadas pedidos={pedidos} nfs={nfs || []} />}

      {/* ABA PARCIAIS */}
      {aba === 'parciais' && (
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:10, flexWrap:'wrap' }}>
            <CardTitle>{filtrados.length} pedidos com entrega parcial</CardTitle>
            <div style={{ display:'flex', gap:8 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor..." />
              <Select value={filtroStatus} onChange={setFiltro} options={[
                { value:'',         label:'Todos' },
                { value:'parcial',  label:'📦 Entrega parcial' },
                { value:'atrasado', label:'🔴 Atrasados' },
              ]} />
              <Select value={filtroComp} onChange={setFiltroComp} options={[
                { value:'', label:'Todos compradores' },
                ...compradores.map(c => ({ value:c, label:c.split(' ')[0] }))
              ]} />
            </div>
          </div>

          <DataTable
            columns={[
              { label:'Pedido',    render:r => <span style={{ fontWeight:700, color:C.accent }}>#{r.numero_pedido}</span> },
              { label:'Fornecedor',render:r => <Ellipsis maxWidth={180}>{r.fornecedor}</Ellipsis> },
              { label:'Comprador', render:r => <span style={{ fontSize:11 }}>{r.comprador?.split(' ')[0]}</span> },
              { label:'Progresso', render:r => <div style={{ minWidth:120 }}><PctBar entregue={r.qtd_entregue_total} pedido={r.qtd_pedida_total} /></div> },
              { label:'Entregue',  render:r => <span style={{ color:C.okText, fontWeight:600 }}>{fmtInt(r.qtd_entregue_total)}</span> },
              { label:'Pendente',  render:r => <span style={{ color:C.danger, fontWeight:600 }}>{fmtInt(r.qtd_pendente_total)}</span> },
              { label:'Prev. entrega', render:r => <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>{fmtDate(r.data_prevista_entrega)}</span> },
              { label:'Valor', render:r => fmtCurrency(r.valor_total) },
            ]}
            rows={filtrados}
            emptyMsg="Nenhum pedido com entrega parcial encontrado"
          />
        </Card>
      )}
    </div>
  )
}
