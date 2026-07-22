import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, SearchInput, Select } from './UI'
import { C } from '../lib/tokens'
import { fmtDate } from '../lib/utils'
import { supabase } from '../lib/supabase'

const COMPRADORES = ['Leonardo Henriques', 'Franciele Dias']
const RECORRENCIAS = [
  { value: 'unico',    label: 'Uma vez' },
  { value: 'diario',   label: 'Todo dia' },
  { value: 'semanal',  label: 'Toda semana' },
]

const STATUS_COR = {
  pendente:  { bg: C.warnDim,   cor: C.warning, label: 'Pendente'   },
  enviado:   { bg: C.okDim,     cor: C.success, label: 'Enviado'    },
  cancelado: { bg: '#F3F4F6',   cor: C.muted,   label: 'Cancelado'  },
}

const hoje = new Date().toISOString().split('T')[0]

function ModalNovoLembrete({ pedidos, onSalvar, onClose }) {
  const [form, setForm] = useState({
    titulo: '', descricao: '', comprador: 'Leonardo Henriques',
    numero_pedido: '', fornecedor: '', data_lembrete: hoje,
    hora_lembrete: '08:00', recorrencia: 'unico',
  })
  const [salvando, setSalvando] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Quando seleciona pedido, preenche fornecedor automaticamente
  const pedidoSelecionado = pedidos.find(p => String(p.numero_pedido) === String(form.numero_pedido))
  useEffect(() => {
    if (pedidoSelecionado) set('fornecedor', pedidoSelecionado.fornecedor || '')
  }, [form.numero_pedido])

  const salvar = async () => {
    if (!form.titulo.trim() || !form.data_lembrete) return
    setSalvando(true)
    await onSalvar(form)
    setSalvando(false)
    onClose()
  }

  const pedidosFiltrados = [...new Map(
    pedidos.filter(p => p.comprador === form.comprador)
           .map(p => [p.numero_pedido, p])
  ).values()]

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
    fontFamily: 'inherit', color: C.text, background: C.bg,
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.brand }}>🔔 Novo lembrete</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.muted }}>×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Comprador */}
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Comprador</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              {COMPRADORES.map(c => (
                <button key={c} onClick={() => set('comprador', c)} style={{
                  flex:1, padding:'8px', borderRadius:8,
                  border:`1.5px solid ${form.comprador===c ? C.accent : C.border}`,
                  background: form.comprador===c ? C.accentDim : C.bg,
                  color: form.comprador===c ? C.accentText : C.muted,
                  fontSize:12, fontWeight: form.comprador===c ? 700 : 400, cursor:'pointer',
                }}>{c.split(' ')[0]}</button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Título do lembrete *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
              placeholder="Ex: Ligar para fornecedor, Confirmar embarque..."
              style={{ ...inputStyle, marginTop:6 }} />
          </div>

          {/* Pedido vinculado */}
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Pedido vinculado (opcional)</label>
            <select value={form.numero_pedido} onChange={e => set('numero_pedido', e.target.value)}
              style={{ ...inputStyle, marginTop:6 }}>
              <option value="">Sem pedido vinculado</option>
              {pedidosFiltrados.map(p => (
                <option key={p.numero_pedido} value={p.numero_pedido}>
                  #{p.numero_pedido} · {(p.fornecedor||'').substring(0,35)}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Descrição / O que fazer</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
              rows={2} placeholder="Ex: Solicitar previsão de embarque atualizada ao fornecedor..."
              style={{ ...inputStyle, marginTop:6, resize:'vertical', lineHeight:1.5 }} />
          </div>

          {/* Data e hora */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Data *</label>
              <input type="date" value={form.data_lembrete} onChange={e => set('data_lembrete', e.target.value)}
                min={hoje} style={{ ...inputStyle, marginTop:6 }} />
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Hora</label>
              <input type="time" value={form.hora_lembrete} onChange={e => set('hora_lembrete', e.target.value)}
                style={{ ...inputStyle, marginTop:6 }} />
            </div>
          </div>

          {/* Recorrência */}
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Recorrência</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              {RECORRENCIAS.map(r => (
                <button key={r.value} onClick={() => set('recorrencia', r.value)} style={{
                  flex:1, padding:'8px', borderRadius:8,
                  border:`1.5px solid ${form.recorrencia===r.value ? C.accent : C.border}`,
                  background: form.recorrencia===r.value ? C.accentDim : C.bg,
                  color: form.recorrencia===r.value ? C.accentText : C.muted,
                  fontSize:12, fontWeight: form.recorrencia===r.value ? 700 : 400, cursor:'pointer',
                }}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {form.titulo && (
            <div style={{ padding:'12px 14px', background:'#F0F9FF', borderRadius:8, border:'1px solid #BAE6FD', fontSize:12, color:'#0369A1', lineHeight:1.6 }}>
              <strong>Preview do Teams:</strong><br/>
              🔔 <strong>{form.titulo}</strong><br/>
              {form.descricao && <>{form.descricao}<br/></>}
              {form.numero_pedido && <>Pedido: #{form.numero_pedido} · {form.fornecedor}<br/></>}
              📅 {fmtDate(form.data_lembrete)} às {form.hora_lembrete} · {RECORRENCIAS.find(r=>r.value===form.recorrencia)?.label}
            </div>
          )}

        </div>

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={salvar} disabled={!form.titulo.trim() || !form.data_lembrete || salvando}
            style={{ flex:1, padding:11, borderRadius:8, border:'none', background: (!form.titulo.trim()||!form.data_lembrete) ? C.border : C.brand, color:'white', fontSize:13, cursor:(!form.titulo.trim()||!form.data_lembrete)?'not-allowed':'pointer', fontWeight:600 }}>
            {salvando ? 'Salvando...' : '🔔 Criar lembrete'}
          </button>
          <button onClick={onClose} style={{ padding:'11px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Lembretes({ pedidos }) {
  const [lembretes, setLembretes]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalAberto, setModal]     = useState(false)
  const [search, setSearch]         = useState('')
  const [filtroComp, setFiltroComp] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('pendente')

  const carregar = async () => {
    setLoading(true)
    const { data } = await supabase.from('lembretes').select('*').order('data_lembrete').order('hora_lembrete')
    setLembretes(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async (form) => {
    await supabase.from('lembretes').insert({
      titulo:        form.titulo.trim(),
      descricao:     form.descricao.trim() || null,
      comprador:     form.comprador,
      numero_pedido: form.numero_pedido ? parseFloat(form.numero_pedido) : null,
      fornecedor:    form.fornecedor || null,
      data_lembrete: form.data_lembrete,
      hora_lembrete: form.hora_lembrete,
      recorrencia:   form.recorrencia,
      status:        'pendente',
    })
    await carregar()
  }

  const cancelar = async (id) => {
    await supabase.from('lembretes').update({ status: 'cancelado' }).eq('id', id)
    await carregar()
  }

  const kpis = useMemo(() => ({
    total:     lembretes.length,
    pendentes: lembretes.filter(l => l.status === 'pendente').length,
    hoje:      lembretes.filter(l => l.status === 'pendente' && l.data_lembrete === hoje).length,
    enviados:  lembretes.filter(l => l.status === 'enviado').length,
  }), [lembretes])

  const filtrados = useMemo(() => lembretes.filter(l => {
    if (filtroStatus && l.status !== filtroStatus) return false
    if (filtroComp   && l.comprador !== filtroComp) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(l.titulo||''),(l.fornecedor||''),(l.comprador||''),String(l.numero_pedido||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [lembretes, filtroStatus, filtroComp, search])

  const vencidos = filtrados.filter(l => l.status === 'pendente' && l.data_lembrete < hoje)
  const deHoje   = filtrados.filter(l => l.status === 'pendente' && l.data_lembrete === hoje)
  const futuros  = filtrados.filter(l => l.status === 'pendente' && l.data_lembrete > hoje)
  const outros   = filtrados.filter(l => l.status !== 'pendente')

  const LembreteCard = ({ l }) => {
    const st = STATUS_COR[l.status] || STATUS_COR.pendente
    const vencido = l.status === 'pendente' && l.data_lembrete < hoje
    const ehHoje  = l.status === 'pendente' && l.data_lembrete === hoje
    const corBorda = vencido ? C.danger : ehHoje ? C.warning : C.accent

    return (
      <div style={{
        padding:'14px 16px', borderRadius:10,
        background: vencido ? C.dangerDim : ehHoje ? C.warnDim : C.surface,
        border:`1px solid ${corBorda}33`,
        borderLeft:`4px solid ${corBorda}`,
        opacity: l.status === 'cancelado' ? 0.6 : 1,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.brand }}>{l.titulo}</span>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.cor }}>{st.label}</span>
              {l.recorrencia !== 'unico' && (
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:C.accentDim, color:C.accentText }}>
                  {l.recorrencia === 'diario' ? '↻ Todo dia' : '↻ Toda semana'}
                </span>
              )}
            </div>
            {l.descricao && <div style={{ fontSize:12, color:C.muted, marginBottom:4, lineHeight:1.5 }}>{l.descricao}</div>}
            <div style={{ display:'flex', gap:12, fontSize:11, color:C.muted, flexWrap:'wrap' }}>
              <span>👤 {l.comprador?.split(' ')[0]}</span>
              {l.numero_pedido && <span>📦 Pedido #{l.numero_pedido}</span>}
              {l.fornecedor && <span>🏭 {l.fornecedor.substring(0,25)}</span>}
              <span style={{ fontWeight:600, color: vencido ? C.danger : ehHoje ? C.warning : C.accent }}>
                📅 {fmtDate(l.data_lembrete)} às {l.hora_lembrete?.slice(0,5)}
              </span>
            </div>
          </div>
          {l.status === 'pendente' && (
            <button onClick={() => cancelar(l.id)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:11, cursor:'pointer', flexShrink:0 }}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    )
  }

  const Secao = ({ titulo, cor, items }) => {
    if (items.length === 0) return null
    return (
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:cor, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:cor }} />
          {titulo} ({items.length})
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(l => <LembreteCard key={l.id} l={l} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {modalAberto && <ModalNovoLembrete pedidos={pedidos} onSalvar={salvar} onClose={() => setModal(false)} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>🔔 Lembretes</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Crie lembretes vinculados a pedidos — notificação automática no Teams</div>
        </div>
        <button onClick={() => setModal(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:'none', background:C.brand, color:'white', fontSize:13, cursor:'pointer', fontWeight:600 }}>
          + Novo lembrete
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Total',     value:kpis.total,     color:C.accent  },
          { label:'Pendentes', value:kpis.pendentes,  color:C.warning },
          { label:'Hoje',      value:kpis.hoje,       color:C.danger  },
          { label:'Enviados',  value:kpis.enviados,   color:C.success },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar lembrete, pedido, fornecedor..." />
        <Select value={filtroStatus} onChange={setFiltroStatus} options={[
          { value:'',         label:'Todos' },
          { value:'pendente', label:'⏳ Pendentes' },
          { value:'enviado',  label:'✅ Enviados' },
          { value:'cancelado',label:'❌ Cancelados' },
        ]} />
        <Select value={filtroComp} onChange={setFiltroComp} options={[
          { value:'',                   label:'Todos compradores' },
          { value:'Leonardo Henriques', label:'Leonardo' },
          { value:'Franciele Dias',     label:'Franciele' },
        ]} />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Nenhum lembrete encontrado</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Clique em "Novo lembrete" para criar</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Secao titulo="Vencidos" cor={C.danger}  items={vencidos} />
            <Secao titulo="Hoje"     cor={C.warning} items={deHoje}   />
            <Secao titulo="Próximos" cor={C.accent}  items={futuros}  />
            <Secao titulo="Histórico" cor={C.muted}  items={outros}   />
          </div>
        </Card>
      )}

      {/* Aviso webhook */}
      <div style={{ padding:'12px 16px', background:'#F0F9FF', borderRadius:8, border:'1px solid #BAE6FD', fontSize:11, color:'#0369A1', lineHeight:1.6 }}>
        📣 <strong>Notificação no Teams:</strong> Para ativar o envio automático no Teams, me manda a URL do Incoming Webhook do canal. O sistema vai disparar a notificação automaticamente no horário definido.
      </div>
    </div>
  )
}
