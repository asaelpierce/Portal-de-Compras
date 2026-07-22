import { useMemo, useState } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency } from '../lib/utils'

const CAMPOS = [
  { key: 'sem_comprador', label: 'Sem comprador',     cor: C.danger,  bg: C.dangerDim },
  { key: 'sem_embarque',  label: 'Sem data embarque', cor: C.warning, bg: C.warnDim   },
  { key: 'sem_orcado',    label: 'Sem orçamento',     cor: '#7C3AED', bg: '#F5F3FF'   },
]

function Tag({ label, cor, bg }) {
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:bg, color:cor, border:`1px solid ${cor}33`, whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

function ScoreCampos({ n }) {
  const cor = n === 3 ? C.danger : n === 2 ? C.warning : '#7C3AED'
  return (
    <div style={{ display:'flex', gap:3 }}>
      {[1,2,3].map(i => <div key={i} style={{ width:10, height:10, borderRadius:2, background: i<=n ? cor : C.border }} />)}
    </div>
  )
}

// ── GUIA PASSO A PASSO ──────────────────────────────────────────────────────
function PassoGuia({ numero, titulo, descricao, destaque, cor = C.accent }) {
  return (
    <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:cor+'18', border:`2px solid ${cor}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:cor, flexShrink:0 }}>
        {numero}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.brand, marginBottom:3 }}>{titulo}</div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{descricao}</div>
        {destaque && (
          <div style={{ marginTop:6, padding:'6px 10px', background:cor+'10', border:`1px solid ${cor}22`, borderRadius:6, fontSize:11, fontFamily:'monospace', color:cor, fontWeight:600 }}>
            {destaque}
          </div>
        )}
      </div>
    </div>
  )
}

function GuiaCorrecao() {
  const [campo, setCampo] = useState('comprador')

  const guias = {
    comprador: {
      titulo: 'Como preencher o Comprador',
      cor: C.danger,
      icone: '👤',
      problema: 'O pedido não tem comprador vinculado. Isso impede o portal de calcular saving por comprador e identificar responsabilidade.',
      passos: [
        { titulo: 'Abra o Sankhya e localize o pedido', descricao: 'Menu Compras → Pedidos de Compra. Busque pelo número do pedido listado no portal.' },
        { titulo: 'Clique em Editar', descricao: 'Abra o pedido e clique no botão Editar (lápis) para habilitar a edição dos campos.' },
        { titulo: 'Vá para a aba Geral', descricao: 'Na tela do pedido, clique na aba "Geral" — é onde fica o campo de Vendedor/Comprador.' },
        { titulo: 'Localize o campo Vendedor (CODVEND)', descricao: 'Procure o campo chamado "Vendedor" ou "CODVEND". Digite o código do comprador responsável:', destaque: '16 = Leonardo Henriques      31 = Franciele Dias' },
        { titulo: 'Salve o pedido', descricao: 'Clique em Salvar. O portal atualizará automaticamente na próxima sync (até 6h).' },
      ]
    },
    embarque: {
      titulo: 'Como preencher a Data de Embarque',
      cor: C.warning,
      icone: '📅',
      problema: 'Sem data de embarque o portal não consegue calcular atrasos, gerar alertas nem exibir o pedido no calendário de embarques.',
      passos: [
        { titulo: 'Abra o Sankhya e localize o pedido', descricao: 'Menu Compras → Pedidos de Compra. Busque pelo número do pedido.' },
        { titulo: 'Clique em Editar', descricao: 'Abra o pedido e clique no botão Editar para habilitar a edição.' },
        { titulo: 'Localize o campo AD_DTEMBARQUE', descricao: 'Pode estar na aba Geral ou em campos complementares. Procure por "Data Embarque" ou "DTEMBARQUE".', destaque: 'Campo: AD_DTEMBARQUE' },
        { titulo: 'Informe a data acordada com o fornecedor', descricao: 'Digite a data prevista que o fornecedor confirmou para embarcar o material. Use o formato DD/MM/AAAA.' },
        { titulo: 'Salve o pedido', descricao: 'Clique em Salvar. O pedido vai aparecer no calendário de embarques do portal automaticamente.' },
      ]
    },
    orcado: {
      titulo: 'Como preencher o Valor Orçado',
      cor: '#7C3AED',
      icone: '💰',
      problema: 'Sem o valor orçado o portal não consegue calcular o saving (economia gerada pela negociação). O saving aparece zerado no dashboard.',
      passos: [
        { titulo: 'Abra o Sankhya e localize o pedido', descricao: 'Menu Compras → Pedidos de Compra. Busque pelo número do pedido.' },
        { titulo: 'Clique em Editar', descricao: 'Abra o pedido e clique no botão Editar para habilitar a edição.' },
        { titulo: 'Localize o campo AD_ORCADO', descricao: 'Procure por "Orçado" ou "AD_ORCADO" nos campos complementares do pedido.', destaque: 'Campo: AD_ORCADO' },
        { titulo: 'Informe o valor antes da negociação', descricao: 'Digite o valor original orçado — o preço cotado antes de negociar. O portal calcula: Saving = AD_ORCADO − AD_REALIZADO_2.', destaque: 'Saving = Orçado (AD_ORCADO) − Realizado (AD_REALIZADO_2)' },
        { titulo: 'Salve o pedido', descricao: 'Clique em Salvar. O saving vai aparecer corretamente no dashboard de compradores.' },
      ]
    },
  }

  const guia = guias[campo]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Seletor de campo */}
      <div style={{ display:'flex', gap:8 }}>
        {[
          { key:'comprador', label:'👤 Comprador',      cor: C.danger  },
          { key:'embarque',  label:'📅 Data embarque',  cor: C.warning },
          { key:'orcado',    label:'💰 Valor orçado',   cor: '#7C3AED' },
        ].map(opt => (
          <button key={opt.key} onClick={() => setCampo(opt.key)} style={{
            padding:'8px 18px', borderRadius:8, border:`1.5px solid ${campo===opt.key ? opt.cor : C.border}`,
            background: campo===opt.key ? opt.cor+'12' : C.surface,
            color: campo===opt.key ? opt.cor : C.muted,
            fontSize:13, fontWeight: campo===opt.key ? 700 : 400, cursor:'pointer',
            transition:'all 0.15s',
          }}>{opt.label}</button>
        ))}
      </div>

      {/* Card do guia */}
      <Card>
        {/* Header */}
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ width:48, height:48, borderRadius:12, background:guia.cor+'15', border:`2px solid ${guia.cor}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
            {guia.icone}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.brand }}>{guia.titulo}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2, maxWidth:500, lineHeight:1.5 }}>{guia.problema}</div>
          </div>
        </div>

        {/* Passos */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {guia.passos.map((p, i) => (
            <div key={i}>
              <PassoGuia
                numero={i+1}
                titulo={p.titulo}
                descricao={p.descricao}
                destaque={p.destaque}
                cor={guia.cor}
              />
              {i < guia.passos.length - 1 && (
                <div style={{ marginLeft:46, marginTop:14, height:20, borderLeft:`2px dashed ${C.border}` }} />
              )}
            </div>
          ))}
        </div>

        {/* Dica final */}
        <div style={{ marginTop:20, padding:'10px 14px', background:'#F0F9FF', borderRadius:8, border:'1px solid #BAE6FD', fontSize:11, color:'#0369A1', lineHeight:1.6 }}>
          ⏱ <strong>Tempo de atualização:</strong> Após salvar no Sankhya, o portal atualiza automaticamente nos horários: <strong>06h, 10h, 14h e 18h</strong> (dias úteis). Ou clique em <strong>Atualizar</strong> no topo do portal para forçar a sync agora.
        </div>
      </Card>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Governanca({ pedidos }) {
  const [search, setSearch]      = useState('')
  const [filtroCampo, setFiltro] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [aba, setAba]            = useState('pedidos')

  const porPedido = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
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
      return { ...p, problemas, score: problemas.length }
    }).filter(p => p.score > 0).sort((a,b) => b.score - a.score)
  }, [pedidos])

  const kpis = useMemo(() => ({
    total:         porPedido.length,
    tres_campos:   porPedido.filter(p => p.score === 3).length,
    sem_comprador: porPedido.filter(p => p.problemas.includes('sem_comprador')).length,
    sem_embarque:  porPedido.filter(p => p.problemas.includes('sem_embarque')).length,
    sem_orcado:    porPedido.filter(p => p.problemas.includes('sem_orcado')).length,
    valor_exposto: porPedido.reduce((s,p) => s + p.valor_total, 0),
  }), [porPedido])

  const filtrados = useMemo(() => porPedido.filter(p => {
    if (filtroCampo && !p.problemas.includes(filtroCampo)) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(p.fornecedor||''),(p.comprador||''),String(p.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [porPedido, search, filtroCampo])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
        {[
          { label:'Pedidos incompletos', value:kpis.total,          color:C.danger  },
          { label:'3 campos faltando',   value:kpis.tres_campos,    color:C.danger  },
          { label:'Sem comprador',       value:kpis.sem_comprador,  color:C.danger  },
          { label:'Sem data embarque',   value:kpis.sem_embarque,   color:C.warning },
          { label:'Sem orçamento',       value:kpis.sem_orcado,     color:'#7C3AED' },
          { label:'Valor exposto',       value:fmtCurrency(kpis.valor_exposto), color:C.accent, small:true },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:k.small?16:26, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${C.border}` }}>
        {[
          ['pedidos', `⚠ Pedidos incompletos (${porPedido.length})`],
          ['guia',    '📖 Guia de correção no Sankhya'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} style={{
            padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13,
            background:'transparent', fontWeight: aba===id ? 600 : 400,
            color: aba===id ? C.accent : C.muted,
            borderBottom: aba===id ? `2px solid ${C.accent}` : '2px solid transparent',
            transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ABA GUIA */}
      {aba === 'guia' && <GuiaCorrecao />}

      {/* ABA PEDIDOS */}
      {aba === 'pedidos' && (
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:10, flexWrap:'wrap' }}>
            <CardTitle>{filtrados.length} pedidos com campos obrigatórios faltando</CardTitle>
            <div style={{ display:'flex', gap:8 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor..." />
              <Select value={filtroCampo} onChange={setFiltro} options={[
                { value:'',              label:'Todos os problemas'  },
                { value:'sem_comprador', label:'👤 Sem comprador'    },
                { value:'sem_embarque',  label:'📅 Sem data embarque'},
                { value:'sem_orcado',    label:'💰 Sem orçamento'    },
              ]} />
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtrados.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 20px', color:C.subtle }}>
                <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Todos os pedidos estão completos!</div>
              </div>
            ) : filtrados.map((p, i) => (
              <div key={i} style={{ border:`1px solid ${p.score===3?C.danger+'44':C.border}`, borderLeft:`4px solid ${p.score===3?C.danger:p.score===2?C.warning:'#7C3AED'}`, borderRadius:10, overflow:'hidden' }}>
                <div
                  onClick={() => setExpandido(expandido===p.numero_pedido ? null : p.numero_pedido)}
                  style={{ display:'grid', gridTemplateColumns:'100px 1fr 180px 100px 100px 80px', gap:12, padding:'11px 14px', alignItems:'center', background: expandido===p.numero_pedido?'#F0F4FF':i%2===0?C.surface:'#FAFAFA', cursor:'pointer' }}
                >
                  <div>
                    <span style={{ fontSize:11, color:C.muted }}>{expandido===p.numero_pedido?'▼':'▶'}</span>
                    <span style={{ fontWeight:800, color:C.accent, marginLeft:4 }}>#{p.numero_pedido}</span>
                    <div style={{ marginTop:4 }}><ScoreCampos n={p.score} /></div>
                  </div>
                  <div>
                    <Ellipsis maxWidth={200}>{p.fornecedor}</Ellipsis>
                    <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>Pedido em {fmtDate(p.data_pedido)}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {p.problemas.map(prob => {
                      const cfg = CAMPOS.find(c => c.key===prob)
                      return cfg ? <Tag key={prob} label={cfg.label} cor={cfg.cor} bg={cfg.bg} /> : null
                    })}
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>{p.itens} {p.itens===1?'item':'itens'}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.brand }}>{fmtCurrency(p.valor_total)}</div>
                  <span style={{ display:'inline-block', padding:'3px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:p.score===3?C.dangerDim:p.score===2?C.warnDim:'#F5F3FF', color:p.score===3?C.danger:p.score===2?C.warning:'#7C3AED' }}>
                    {p.score} campo{p.score>1?'s':''}
                  </span>
                </div>

                {/* Expandido — instrução rápida + botão ver guia */}
                {expandido === p.numero_pedido && (
                  <div style={{ background:'#F8FAFF', borderTop:`1px solid ${C.border}`, padding:'12px 16px 12px 32px' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                      O que preencher no Sankhya
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {p.problemas.includes('sem_comprador') && (
                        <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 12px', background:C.dangerDim, borderRadius:8, border:`1px solid ${C.danger}22` }}>
                          <span style={{ fontSize:16 }}>👤</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.danger }}>Campo: Vendedor (CODVEND) · Aba: Geral</div>
                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>16 = Leonardo Henriques · 31 = Franciele Dias</div>
                          </div>
                        </div>
                      )}
                      {p.problemas.includes('sem_embarque') && (
                        <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 12px', background:C.warnDim, borderRadius:8, border:`1px solid ${C.warning}22` }}>
                          <span style={{ fontSize:16 }}>📅</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.warning }}>Campo: AD_DTEMBARQUE · Aba: Geral</div>
                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Data prevista que o fornecedor vai embarcar</div>
                          </div>
                        </div>
                      )}
                      {p.problemas.includes('sem_orcado') && (
                        <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 12px', background:'#F5F3FF', borderRadius:8, border:'1px solid #C4B5FD44' }}>
                          <span style={{ fontSize:16 }}>💰</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#7C3AED' }}>Campo: AD_ORCADO · Campos complementares</div>
                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Valor cotado antes da negociação</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setAba('guia')} style={{ marginTop:10, padding:'6px 14px', borderRadius:7, border:`1px solid ${C.accent}`, background:'white', color:C.accent, fontSize:11, cursor:'pointer', fontWeight:600 }}>
                      📖 Ver guia completo passo a passo →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
