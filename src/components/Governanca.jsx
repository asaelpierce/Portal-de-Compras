import { useMemo, useState, useEffect } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CAMPOS = [
  { key: 'sem_comprador', label: 'Sem comprador',     cor: C.danger,  bg: C.dangerDim },
  { key: 'sem_embarque',  label: 'Sem data embarque', cor: C.warning, bg: C.warnDim   },
  { key: 'sem_orcado',    label: 'Sem orçamento',     cor: '#7C3AED', bg: '#F5F3FF'   },
]

const RESPONSAVEIS = ['Leonardo Henriques', 'Franciele Dias', 'Supervisor', 'TI / Administrador']

function Tag({ label, cor, bg, riscado }) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:20,
      fontSize:10, fontWeight:700, background: riscado ? C.okDim : bg,
      color: riscado ? C.okText : cor,
      border:`1px solid ${riscado ? C.success : cor}33`,
      whiteSpace:'nowrap',
      textDecoration: riscado ? 'line-through' : 'none',
      opacity: riscado ? 0.7 : 1,
    }}>
      {riscado ? '✓ ' : ''}{label}
    </span>
  )
}

function ScoreCampos({ n, total }) {
  const cor = total === 3 ? C.danger : total === 2 ? C.warning : '#7C3AED'
  const corAtivo = n > 0 ? cor : C.success
  return (
    <div style={{ display:'flex', gap:3 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width:10, height:10, borderRadius:2,
          background: i <= (total - n) ? C.success : i <= total ? cor : C.border,
        }} />
      ))}
    </div>
  )
}

// ── MODAL RESOLVER ──────────────────────────────────────────────────────────
function ModalResolver({ pedido, campo, onClose, onSalvar }) {
  const [responsavel, setResponsavel] = useState('')
  const [motivo, setMotivo]           = useState('')
  const [salvando, setSalvando]       = useState(false)

  const cfg = CAMPOS.find(c => c.key === campo)

  const salvar = async () => {
    if (!responsavel || !motivo.trim()) return
    setSalvando(true)
    await onSalvar(pedido.numero_pedido, campo, responsavel, motivo)
    setSalvando(false)
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:500, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>Resolver pendência</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Pedido #{pedido.numero_pedido} · {pedido.fornecedor}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.muted }}>×</button>
        </div>

        {/* Campo sendo resolvido */}
        <div style={{ padding:'10px 14px', borderRadius:8, background:cfg?.bg, border:`1px solid ${cfg?.cor}22`, marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:18 }}>
            {campo==='sem_comprador'?'👤':campo==='sem_embarque'?'📅':'💰'}
          </span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:cfg?.cor }}>{cfg?.label}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
              {campo==='sem_comprador' && 'Comprador não identificado no Sankhya (CODVEND)'}
              {campo==='sem_embarque'  && 'Data de embarque não preenchida (AD_DTEMBARQUE)'}
              {campo==='sem_orcado'    && 'Valor orçado não registrado (AD_ORCADO)'}
            </div>
          </div>
        </div>

        {/* Responsável */}
        <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>
          Quem está resolvendo
        </label>
        <select value={responsavel} onChange={e => setResponsavel(e.target.value)}
          style={{ width:'100%', marginTop:6, marginBottom:14, padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, outline:'none', background:C.bg, color:C.text }}>
          <option value="">Selecione...</option>
          {RESPONSAVEIS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Motivo */}
        <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>
          Justificativa / O que foi feito
        </label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
          placeholder="Ex: Campo preenchido no Sankhya. / Pedido de ajuste é importação da matriz, não tem comprador local. / Data de embarque combinada verbalmente com fornecedor, será atualizada no sistema amanhã."
          style={{ width:'100%', marginTop:6, marginBottom:16, padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, resize:'vertical', outline:'none', fontFamily:'inherit', color:C.text, background:C.bg, lineHeight:1.5 }} />

        <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:11, color:'#92400E' }}>
          ℹ️ Isso <strong>não altera o Sankhya</strong> — apenas registra que o comprador está ciente e a pendência foi tratada. O campo vai aparecer como resolvido no portal até a próxima atualização do sistema.
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={salvar} disabled={!responsavel || !motivo.trim() || salvando}
            style={{ flex:1, padding:10, borderRadius:8, border:`1px solid ${C.success}`, background: (!responsavel||!motivo.trim()) ? C.border : C.okDim, color: (!responsavel||!motivo.trim()) ? C.muted : C.okText, fontSize:13, cursor: (!responsavel||!motivo.trim()) ? 'not-allowed' : 'pointer', fontWeight:600 }}>
            {salvando ? 'Salvando...' : '✓ Marcar como resolvido'}
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GUIA DE CORREÇÃO ────────────────────────────────────────────────────────
function GuiaCorrecao() {
  const [campo, setCampo] = useState('comprador')
  const guias = {
    comprador: {
      titulo:'Como preencher o Comprador', cor:C.danger, icone:'👤',
      problema:'O pedido não tem comprador vinculado. Isso impede o portal de calcular saving e identificar responsabilidade.',
      passos:[
        { titulo:'Abra o Sankhya e localize o pedido', descricao:'Menu Compras → Pedidos de Compra. Busque pelo número do pedido.' },
        { titulo:'Clique em Editar', descricao:'Abra o pedido e clique no botão Editar para habilitar a edição dos campos.' },
        { titulo:'Vá para a aba Geral', descricao:'Na tela do pedido, clique na aba "Geral".' },
        { titulo:'Localize o campo Vendedor (CODVEND)', descricao:'Digite o código do comprador responsável:', destaque:'16 = Leonardo Henriques      31 = Franciele Dias' },
        { titulo:'Salve o pedido', descricao:'Clique em Salvar. O portal atualiza automaticamente na próxima sync.' },
      ]
    },
    embarque: {
      titulo:'Como preencher a Data de Embarque', cor:C.warning, icone:'📅',
      problema:'Sem data de embarque o portal não calcula atrasos, não gera alertas e o pedido não aparece no calendário.',
      passos:[
        { titulo:'Abra o Sankhya e localize o pedido', descricao:'Menu Compras → Pedidos de Compra.' },
        { titulo:'Clique em Editar', descricao:'Abra o pedido e clique em Editar.' },
        { titulo:'Localize o campo AD_DTEMBARQUE', descricao:'Pode estar na aba Geral ou em campos complementares.', destaque:'Campo: AD_DTEMBARQUE' },
        { titulo:'Informe a data acordada com o fornecedor', descricao:'Digite a data prevista para o embarque no formato DD/MM/AAAA.' },
        { titulo:'Salve o pedido', descricao:'O pedido aparece no calendário de embarques automaticamente.' },
      ]
    },
    orcado: {
      titulo:'Como preencher o Valor Orçado', cor:'#7C3AED', icone:'💰',
      problema:'Sem o valor orçado o portal não calcula o saving. O dashboard de compradores fica zerado.',
      passos:[
        { titulo:'Abra o Sankhya e localize o pedido', descricao:'Menu Compras → Pedidos de Compra.' },
        { titulo:'Clique em Editar', descricao:'Abra o pedido e clique em Editar.' },
        { titulo:'Localize o campo AD_ORCADO', descricao:'Em campos complementares do pedido.', destaque:'Campo: AD_ORCADO' },
        { titulo:'Informe o valor antes da negociação', descricao:'Valor original orçado antes de negociar. Saving = AD_ORCADO − AD_REALIZADO_2.', destaque:'Saving = Orçado (AD_ORCADO) − Realizado (AD_REALIZADO_2)' },
        { titulo:'Salve o pedido', descricao:'O saving aparece corretamente no dashboard de compradores.' },
      ]
    },
  }
  const g = guias[campo]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:8 }}>
        {[{key:'comprador',label:'👤 Comprador',cor:C.danger},{key:'embarque',label:'📅 Data embarque',cor:C.warning},{key:'orcado',label:'💰 Valor orçado',cor:'#7C3AED'}].map(opt => (
          <button key={opt.key} onClick={() => setCampo(opt.key)} style={{ padding:'8px 18px', borderRadius:8, border:`1.5px solid ${campo===opt.key?opt.cor:C.border}`, background:campo===opt.key?opt.cor+'12':C.surface, color:campo===opt.key?opt.cor:C.muted, fontSize:13, fontWeight:campo===opt.key?700:400, cursor:'pointer', transition:'all 0.15s' }}>{opt.label}</button>
        ))}
      </div>
      <Card>
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ width:48, height:48, borderRadius:12, background:g.cor+'15', border:`2px solid ${g.cor}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{g.icone}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.brand }}>{g.titulo}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2, lineHeight:1.5 }}>{g.problema}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {g.passos.map((p, i) => (
            <div key={i}>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:g.cor+'18', border:`2px solid ${g.cor}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:g.cor, flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.brand, marginBottom:3 }}>{p.titulo}</div>
                  <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{p.descricao}</div>
                  {p.destaque && <div style={{ marginTop:6, padding:'6px 10px', background:g.cor+'10', border:`1px solid ${g.cor}22`, borderRadius:6, fontSize:11, fontFamily:'monospace', color:g.cor, fontWeight:600 }}>{p.destaque}</div>}
                </div>
              </div>
              {i < g.passos.length-1 && <div style={{ marginLeft:46, marginTop:14, height:20, borderLeft:`2px dashed ${C.border}` }} />}
            </div>
          ))}
        </div>
        <div style={{ marginTop:20, padding:'10px 14px', background:'#F0F9FF', borderRadius:8, border:'1px solid #BAE6FD', fontSize:11, color:'#0369A1', lineHeight:1.6 }}>
          ⏱ <strong>Atualização:</strong> Após salvar no Sankhya, o portal sincroniza automaticamente às <strong>06h, 10h, 14h e 18h</strong>. Ou clique em <strong>Atualizar</strong> no topo para sincronizar agora.
        </div>
      </Card>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Governanca({ pedidos }) {
  const [search, setSearch]         = useState('')
  const [filtroCampo, setFiltro]    = useState('')
  const [expandido, setExpandido]   = useState(null)
  const [aba, setAba]               = useState('pedidos')
  const [resolucoes, setResolucoes] = useState([]) // { numero_pedido, campo }[]
  const [modal, setModal]           = useState(null) // { pedido, campo }

  // Mês atual como filtro padrão
  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`
  const [filtroMes, setFiltroMes]   = useState(mesAtual)

  // Carrega resoluções já registradas
  useEffect(() => {
    supabase.from('governanca_resolucoes').select('numero_pedido,campo').then(({ data }) => {
      setResolucoes(data || [])
    })
  }, [])

  const isResolvido = (numero_pedido, campo) =>
    resolucoes.some(r => String(r.numero_pedido) === String(numero_pedido) && r.campo === campo)

  const salvarResolucao = async (numero_pedido, campo, resolvido_por, motivo) => {
    await supabase.from('governanca_resolucoes').insert({ numero_pedido, campo, resolvido_por, motivo })
    setResolucoes(prev => [...prev, { numero_pedido: String(numero_pedido), campo }])
  }

  // Gera lista de meses disponíveis (últimos 6 + próximos 2)
  const mesesOpcoes = useMemo(() => {
    const opcoes = []
    for (let i = -5; i <= 2; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
      opcoes.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return opcoes
  }, [])

  // Monta lista de pedidos com problemas
  const porPedido = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      // Filtra pelo mês selecionado
      if (filtroMes && p.data_pedido) {
        const dp = String(p.data_pedido).slice(0,7)
        if (dp < filtroMes) return
      }
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = { numero_pedido:p.numero_pedido, fornecedor:p.fornecedor, comprador:p.comprador, data_embarque:p.data_embarque, vlr_orcado:p.vlr_orcado, data_pedido:p.data_pedido, valor_total:0, itens:0 }
      map[k].valor_total += parseFloat(p.valor_item) || 0
      map[k].itens++
    })

    return Object.values(map).map(p => {
      const problemas = []
      if (!p.comprador || p.comprador === 'Nao identificado') problemas.push('sem_comprador')
      if (!p.data_embarque)                                   problemas.push('sem_embarque')
      if (!p.vlr_orcado || parseFloat(p.vlr_orcado) === 0)   problemas.push('sem_orcado')

      // Pendências ainda abertas (não resolvidas)
      const abertas = problemas.filter(c => !isResolvido(p.numero_pedido, c))

      return { ...p, problemas, abertas, score: problemas.length }
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.abertas.length - a.abertas.length || b.score - a.score)
  }, [pedidos, resolucoes, filtroMes])

  // Só conta as abertas para os KPIs
  const porPedidoAbertos = porPedido.filter(p => p.abertas.length > 0)

  const kpis = useMemo(() => ({
    total:         porPedidoAbertos.length,
    tres_campos:   porPedidoAbertos.filter(p => p.abertas.length === 3).length,
    sem_comprador: porPedidoAbertos.filter(p => p.abertas.includes('sem_comprador')).length,
    sem_embarque:  porPedidoAbertos.filter(p => p.abertas.includes('sem_embarque')).length,
    sem_orcado:    porPedidoAbertos.filter(p => p.abertas.includes('sem_orcado')).length,
    resolvidos:    resolucoes.length,
    valor_exposto: porPedidoAbertos.reduce((s,p) => s + p.valor_total, 0),
  }), [porPedidoAbertos, resolucoes])

  const filtrados = useMemo(() => porPedido.filter(p => {
    if (filtroCampo === 'resolvidos') return p.abertas.length === 0 && p.score > 0
    if (filtroCampo === 'pendentes')  return p.abertas.length > 0
    if (filtroCampo && !p.abertas.includes(filtroCampo)) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(p.fornecedor||''),(p.comprador||''),String(p.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [porPedido, search, filtroCampo])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {modal && (
        <ModalResolver
          pedido={modal.pedido}
          campo={modal.campo}
          onClose={() => setModal(null)}
          onSalvar={salvarResolucao}
        />
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10 }}>
        {[
          { label:'Pendentes',       value:kpis.total,          color:C.danger  },
          { label:'3 campos',        value:kpis.tres_campos,    color:C.danger  },
          { label:'Sem comprador',   value:kpis.sem_comprador,  color:C.danger  },
          { label:'Sem embarque',    value:kpis.sem_embarque,   color:C.warning },
          { label:'Sem orçamento',   value:kpis.sem_orcado,     color:'#7C3AED' },
          { label:'Resolvidos',      value:kpis.resolvidos,     color:C.success },
          { label:'Valor exposto',   value:fmtCurrency(kpis.valor_exposto), color:C.accent, small:true },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:k.small?14:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${C.border}` }}>
        {[['pedidos',`⚠ Pendências (${porPedidoAbertos.length})`],['guia','📖 Guia de correção']].map(([id,label]) => (
          <button key={id} onClick={() => setAba(id)} style={{ padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13, background:'transparent', fontWeight:aba===id?600:400, color:aba===id?C.accent:C.muted, borderBottom:aba===id?`2px solid ${C.accent}`:'2px solid transparent', transition:'all 0.15s' }}>{label}</button>
        ))}
      </div>

      {aba === 'guia' && <GuiaCorrecao />}

      {aba === 'pedidos' && (
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:10, flexWrap:'wrap' }}>
            <div>
              <CardTitle>{filtrados.length} pedidos</CardTitle>
              <div style={{ fontSize:11, color:C.muted, marginTop:-10 }}>
                Somente pedidos a partir do mês selecionado — histórico antigo não exige correção
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor..." />

              {/* Filtro de mês */}
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 28px 7px 12px', fontSize:12, color:C.text, outline:'none' }}>
                <option value="">Todos os meses</option>
                {mesesOpcoes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>

              <Select value={filtroCampo} onChange={setFiltro} options={[
                { value:'',              label:'Todos' },
                { value:'pendentes',     label:'⚠ Pendentes' },
                { value:'resolvidos',    label:'✅ Resolvidos' },
                { value:'sem_comprador', label:'👤 Sem comprador' },
                { value:'sem_embarque',  label:'📅 Sem data embarque' },
                { value:'sem_orcado',    label:'💰 Sem orçamento' },
              ]} />
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtrados.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 20px', color:C.subtle }}>
                <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Tudo resolvido neste período!</div>
              </div>
            ) : filtrados.map((p, i) => {
              const todasResolvidas = p.abertas.length === 0
              const corBorda = todasResolvidas ? C.success : p.abertas.length===3 ? C.danger : p.abertas.length===2 ? C.warning : '#7C3AED'

              return (
                <div key={i} style={{ border:`1px solid ${corBorda}33`, borderLeft:`4px solid ${corBorda}`, borderRadius:10, overflow:'hidden', opacity: todasResolvidas ? 0.75 : 1 }}>

                  {/* Linha principal */}
                  <div
                    onClick={() => setExpandido(expandido===p.numero_pedido ? null : p.numero_pedido)}
                    style={{ display:'grid', gridTemplateColumns:'110px 1fr 220px 90px 110px 60px', gap:12, padding:'11px 14px', alignItems:'center', background: todasResolvidas ? C.okDim : expandido===p.numero_pedido ? '#F0F4FF' : i%2===0 ? C.surface : '#FAFAFA', cursor:'pointer' }}
                  >
                    <div>
                      <span style={{ fontSize:11, color:C.muted }}>{expandido===p.numero_pedido?'▼':'▶'}</span>
                      <span style={{ fontWeight:800, color: todasResolvidas ? C.okText : C.accent, marginLeft:4 }}>#{p.numero_pedido}</span>
                      <div style={{ marginTop:4 }}><ScoreCampos n={p.abertas.length} total={p.score} /></div>
                    </div>

                    <div>
                      <Ellipsis maxWidth={200}>{p.fornecedor}</Ellipsis>
                      <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{fmtDate(p.data_pedido)}</div>
                    </div>

                    {/* Tags dos campos — com riscado se resolvido */}
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {p.problemas.map(prob => {
                        const cfg = CAMPOS.find(c => c.key===prob)
                        const resolvido = isResolvido(p.numero_pedido, prob)
                        return cfg ? <Tag key={prob} label={cfg.label} cor={cfg.cor} bg={cfg.bg} riscado={resolvido} /> : null
                      })}
                    </div>

                    <div style={{ fontSize:11, color:C.muted }}>{p.itens} itens</div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.brand }}>{fmtCurrency(p.valor_total)}</div>

                    {todasResolvidas
                      ? <span style={{ fontSize:11, fontWeight:700, color:C.okText }}>✅ Ok</span>
                      : <span style={{ display:'inline-block', padding:'3px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:p.abertas.length===3?C.dangerDim:p.abertas.length===2?C.warnDim:'#F5F3FF', color:p.abertas.length===3?C.danger:p.abertas.length===2?C.warning:'#7C3AED' }}>
                          {p.abertas.length} aberto{p.abertas.length>1?'s':''}
                        </span>
                    }
                  </div>

                  {/* Expandido */}
                  {expandido===p.numero_pedido && (
                    <div style={{ background:'#F8FAFF', borderTop:`1px solid ${C.border}`, padding:'14px 16px 14px 32px' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                        Pendências do pedido #{p.numero_pedido}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {p.problemas.map(prob => {
                          const cfg = CAMPOS.find(c => c.key===prob)
                          const resolvido = isResolvido(p.numero_pedido, prob)
                          return (
                            <div key={prob} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background: resolvido ? C.okDim : cfg?.bg, borderRadius:8, border:`1px solid ${resolvido ? C.success : cfg?.cor}22` }}>
                              <span style={{ fontSize:18 }}>
                                {prob==='sem_comprador'?'👤':prob==='sem_embarque'?'📅':'💰'}
                              </span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:600, color: resolvido ? C.okText : cfg?.cor, textDecoration: resolvido ? 'line-through' : 'none' }}>
                                  {resolvido ? '✓ Resolvido — ' : ''}{cfg?.label}
                                </div>
                                <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                                  {prob==='sem_comprador' && 'Campo CODVEND · Aba Geral · 16=Leonardo · 31=Franciele'}
                                  {prob==='sem_embarque'  && 'Campo AD_DTEMBARQUE · Aba Geral'}
                                  {prob==='sem_orcado'    && 'Campo AD_ORCADO · Campos complementares'}
                                </div>
                              </div>
                              {!resolvido && (
                                <button
                                  onClick={e => { e.stopPropagation(); setModal({ pedido:p, campo:prob }) }}
                                  style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${cfg?.cor}`, background:'white', color:cfg?.cor, fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}
                                  onMouseEnter={e => { e.currentTarget.style.background=cfg?.cor; e.currentTarget.style.color='white' }}
                                  onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color=cfg?.cor }}
                                >
                                  Resolver →
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <button onClick={() => setAba('guia')} style={{ marginTop:10, padding:'5px 12px', borderRadius:7, border:`1px solid ${C.accent}`, background:'white', color:C.accent, fontSize:11, cursor:'pointer', fontWeight:600 }}>
                        📖 Ver guia de correção no Sankhya →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
