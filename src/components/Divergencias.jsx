import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtCurrency, fmtInt } from '../lib/utils'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://tocyzucfgwhvpfihakvj.supabase.co'

const TIPOS = {
  ERRO_LANCAMENTO:   { label: 'Lançamento errado', icon: '⚠️', cor: C.warning, bg: C.warnDim,   desc: 'Valor total bate mas quantidade ou unidade diferem. Material chegou certo, NF foi lançada diferente (ex: em caixa em vez de unidade).' },
  DIVERGENCIA_PRECO: { label: 'Preço divergente',  icon: '❌', cor: C.danger,  bg: C.dangerDim, desc: 'Preço unitário cobrado na NF é diferente do aprovado no pedido. A diferença abaixo é calculada sobre a quantidade entregue.' },
  QTD_MAIOR_OC:      { label: 'Excesso entregue',  icon: '🔴', cor: C.danger,  bg: C.dangerDim, desc: 'Quantidade na NF maior que o pedido. Fornecedor entregou e cobrou mais do que foi solicitado.' },
  DIFERENCA_MINIMA:  { label: 'Diferença mínima',  icon: '💬', cor: C.subtle,  bg: '#F3F4F6',   desc: 'Diferença de até R$1,00 — provavelmente arredondamento de impostos. Sem urgência, mas registrado para transparência.' },
}

const COBROU = {
  COBROU_MAIS:  { label: '↑ Cobrou mais',  cor: C.danger,  bg: C.dangerDim },
  COBROU_MENOS: { label: '↓ Cobrou menos', cor: C.success, bg: C.okDim     },
  IGUAL:        { label: '= Valor igual',  cor: C.subtle,  bg: '#F3F4F6'   },
}

const DECISOES = {
  PENDENTE:   { label: 'Pendente',   cor: C.warning, bg: C.warnDim   },
  ACEITO:     { label: 'Aceito',     cor: C.success, bg: C.okDim     },
  CONTESTADO: { label: 'Contestado', cor: C.danger,  bg: C.dangerDim },
}

function ModalDecisao({ item, onClose, onSalvar }) {
  const [decisao, setDecisao] = useState('')
  const [obs, setObs]         = useState('')
  const [salvando, setSalvando] = useState(false)
  const cfg = TIPOS[item.tipo_divergencia]

  const salvar = async () => {
    if (!decisao) return
    setSalvando(true)
    await onSalvar(item.id, decisao, obs)
    setSalvando(false)
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:540, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>Decisão sobre divergência</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>NF {item.numero_nf} · Pedido #{item.numero_pedido_oc}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.muted }}>×</button>
        </div>

        {/* Resumo */}
        <div style={{ padding:'12px 14px', borderRadius:8, background:cfg.bg, border:`1px solid ${cfg.cor}33`, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:cfg.cor, marginBottom:6 }}>{cfg.icon} {cfg.label}</div>
          <div style={{ fontSize:12, color:C.brand, marginBottom:4 }}>{item.descricao_produto}</div>
          <div style={{ display:'flex', gap:16, fontSize:12 }}>
            <div>
              <div style={{ color:C.muted, fontSize:10 }}>PEDIDO (OC)</div>
              <div style={{ fontWeight:600 }}>{item.qtd_oc} {item.unid_oc} × R$ {item.vlrunit_oc?.toFixed(4)} = <strong>{fmtCurrency(item.vlrtot_oc)}</strong></div>
            </div>
            <div style={{ color:C.border }}>→</div>
            <div>
              <div style={{ color:C.muted, fontSize:10 }}>NOTA FISCAL</div>
              <div style={{ fontWeight:600 }}>{item.qtd_nf} {item.unid_nf} × R$ {item.vlrunit_nf?.toFixed(4)} = <strong>{fmtCurrency(item.vlrtot_nf)}</strong></div>
            </div>
          </div>
          {item.diferenca_total !== 0 && (
            <div style={{ marginTop:8, fontSize:12, fontWeight:600, color: item.diferenca_total > 0 ? C.danger : C.success }}>
              Diferença: {item.diferenca_total > 0 ? '+' : ''}{fmtCurrency(item.diferenca_total)}
            </div>
          )}
          <div style={{ marginTop:8, fontSize:11, color:C.muted }}>{cfg.desc}</div>
        </div>

        {/* Decisão */}
        <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Decisão</label>
        <div style={{ display:'flex', gap:8, marginTop:6, marginBottom:14 }}>
          {[
            { v:'ACEITO',     label:'✓ Aceitar',    desc:'Diferença justificada ou sem impacto' },
            { v:'CONTESTADO', label:'✗ Contestar',  desc:'Solicitar correção ao fornecedor' },
          ].map(opt => (
            <button key={opt.v} onClick={() => setDecisao(opt.v)} style={{
              flex:1, padding:'10px 8px', borderRadius:8, cursor:'pointer',
              border:`1.5px solid ${decisao===opt.v ? (opt.v==='ACEITO'?C.success:C.danger) : C.border}`,
              background: decisao===opt.v ? (opt.v==='ACEITO'?C.okDim:C.dangerDim) : C.bg,
              color: decisao===opt.v ? (opt.v==='ACEITO'?C.okText:C.dangerText) : C.muted,
              fontSize:13, fontWeight: decisao===opt.v ? 700 : 400,
              transition:'all 0.15s',
            }}>
              <div>{opt.label}</div>
              <div style={{ fontSize:10, marginTop:2 }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Justificativa</label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
          placeholder="Ex: Fornecedor confirmou que é lançamento em caixa. / Contestado via e-mail em 23/07."
          style={{ width:'100%', marginTop:6, marginBottom:16, padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, resize:'none', outline:'none', fontFamily:'inherit', color:C.text, background:C.bg, lineHeight:1.5 }} />

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={salvar} disabled={!decisao || salvando}
            style={{ flex:1, padding:10, borderRadius:8, border:'none', background: !decisao?C.border:C.brand, color:'white', fontSize:13, cursor:!decisao?'not-allowed':'pointer', fontWeight:600 }}>
            {salvando ? 'Salvando...' : 'Confirmar decisão'}
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Divergencias() {
  const [dados, setDados]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [analisando, setAnalisando] = useState(false)
  const [modal, setModal]           = useState(null)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDecisao, setFiltroDecisao] = useState('PENDENTE')
  const [msg, setMsg]               = useState(null)

  const carregar = async () => {
    setLoading(true)
    const { data } = await supabase.from('divergencias_nf').select('*').order('tipo_divergencia').order('diferenca_total', { ascending: false })
    setDados(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const analisar = async () => {
    setAnalisando(true)
    setMsg(null)
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/supply-divergencias-sync`, { method:'POST', headers:{'Content-Type':'application/json'} })
      const d = await r.json()
      if (d.ok) {
        setMsg({ tipo:'ok', texto:`✓ ${d.divergencias} divergências encontradas em ${d.total_analisados} itens analisados` })
        await carregar()
      } else setMsg({ tipo:'erro', texto:'✗ Erro: ' + d.erro })
    } catch(e) { setMsg({ tipo:'erro', texto:'✗ ' + e.message }) }
    setAnalisando(false)
  }

  const decidir = async (id, decisao, observacao) => {
    await supabase.from('divergencias_nf').update({ decisao, observacao }).eq('id', id)
    await carregar()
  }

  const kpis = useMemo(() => ({
    total:      dados.length,
    lancamento: dados.filter(d => d.tipo_divergencia === 'ERRO_LANCAMENTO').length,
    preco:      dados.filter(d => d.tipo_divergencia === 'DIVERGENCIA_PRECO').length,
    excesso:    dados.filter(d => d.tipo_divergencia === 'QTD_MAIOR_OC').length,
    minima:     dados.filter(d => d.tipo_divergencia === 'DIFERENCA_MINIMA').length,
    pendentes:  dados.filter(d => d.decisao === 'PENDENTE').length,
    impacto:    dados.filter(d => d.tipo_divergencia !== 'DIFERENCA_MINIMA' && d.diferenca_total !== 0).reduce((s, d) => s + (d.diferenca_total || 0), 0),
  }), [dados])

  const filtrados = useMemo(() => dados.filter(d => {
    if (filtroTipo   && d.tipo_divergencia !== filtroTipo)  return false
    if (filtroDecisao && d.decisao !== filtroDecisao)       return false
    if (search) {
      const q = search.toLowerCase()
      if (![(d.fornecedor||''),(d.descricao_produto||''),String(d.numero_nf||''),String(d.numero_pedido_oc||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [dados, filtroTipo, filtroDecisao, search])

  // Agrupa por NF para exibição
  const porNF = useMemo(() => {
    const map = {}
    filtrados.forEach(d => {
      const k = String(d.numero_nf)
      if (!map[k]) map[k] = { numero_nf: d.numero_nf, fornecedor: d.fornecedor, itens: [] }
      map[k].itens.push(d)
    })
    return Object.values(map).sort((a, b) => {
      const prioridade = { DIVERGENCIA_PRECO:0, QTD_MAIOR_OC:1, ERRO_LANCAMENTO:2, DIFERENCA_MINIMA:3 }
      const pA = Math.min(...a.itens.map(i => prioridade[i.tipo_divergencia] ?? 9))
      const pB = Math.min(...b.itens.map(i => prioridade[i.tipo_divergencia] ?? 9))
      return pA - pB
    })
  }, [filtrados])

  const [expandido, setExpandido] = useState(null)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {modal && <ModalDecisao item={modal} onClose={() => setModal(null)} onSalvar={decidir} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>🔎 Análise inteligente de divergências NF × OC</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Detecta erros de lançamento, preço divergente e excessos — filtra entregas parciais normais automaticamente</div>
        </div>
        <button onClick={analisar} disabled={analisando} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:'none', background: analisando?C.border:C.brand, color:'white', fontSize:13, cursor:analisando?'not-allowed':'pointer', fontWeight:600 }}>
          {analisando ? '⏳ Analisando...' : '🔎 Executar análise'}
        </button>
      </div>

      {msg && (
        <div style={{ padding:'10px 16px', borderRadius:8, fontSize:13, fontWeight:500, background:msg.tipo==='ok'?C.okDim:C.dangerDim, color:msg.tipo==='ok'?C.okText:C.dangerText, border:`1px solid ${msg.tipo==='ok'?C.success:C.danger}44` }}>
          {msg.texto}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10 }}>
        {[
          { label:'Total',            value:kpis.total,      color:C.accent  },
          { label:'Lançamento errado',value:kpis.lancamento, color:C.warning },
          { label:'Preço divergente', value:kpis.preco,      color:C.danger  },
          { label:'Excesso entregue', value:kpis.excesso,    color:C.danger  },
          { label:'Dif. mínima',      value:kpis.minima,     color:C.subtle  },
          { label:'Pendentes',        value:kpis.pendentes,  color:C.warning },
          { label:'Impacto financeiro',value:fmtCurrency(Math.abs(kpis.impacto)), color:kpis.impacto>0?C.danger:C.success, small:true },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{k.label}</div>
            <div style={{ fontSize:k.small?13:22, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="NF, pedido, fornecedor, produto..." />
        <Select value={filtroTipo} onChange={setFiltroTipo} options={[
          { value:'',                  label:'Todos os tipos' },
          { value:'ERRO_LANCAMENTO',   label:'⚠️ Lançamento errado' },
          { value:'DIVERGENCIA_PRECO', label:'❌ Preço divergente' },
          { value:'QTD_MAIOR_OC',      label:'🔴 Excesso entregue' },
          { value:'DIFERENCA_MINIMA',  label:'💬 Diferença mínima' },
        ]} />
        <Select value={filtroDecisao} onChange={setFiltroDecisao} options={[
          { value:'',          label:'Todas as decisões' },
          { value:'PENDENTE',  label:'⏳ Pendentes' },
          { value:'ACEITO',    label:'✓ Aceitos' },
          { value:'CONTESTADO',label:'✗ Contestados' },
        ]} />
      </div>

      {/* Lista agrupada por NF */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Carregando...</div>
      ) : porNF.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔎</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Nenhuma divergência encontrada</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Clique em "Executar análise" para verificar os dados</div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>{porNF.length} notas fiscais com divergências · {filtrados.length} itens</CardTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {porNF.map((nf, i) => {
              const aberto = expandido === nf.numero_nf
              const piorTipo = [
                nf.itens.find(d => d.tipo_divergencia==='DIVERGENCIA_PRECO'),
                nf.itens.find(d => d.tipo_divergencia==='QTD_MAIOR_OC'),
                nf.itens.find(d => d.tipo_divergencia==='ERRO_LANCAMENTO'),
                nf.itens.find(d => d.tipo_divergencia==='DIFERENCA_MINIMA'),
              ].find(Boolean)
              const cfgPior = TIPOS[piorTipo?.tipo_divergencia] || TIPOS.DIFERENCA_MINIMA
              const todosResolvidos = nf.itens.every(d => d.decisao !== 'PENDENTE')

              return (
                <div key={i} style={{ border:`1px solid ${cfgPior.cor}22`, borderLeft:`4px solid ${todosResolvidos?C.success:cfgPior.cor}`, borderRadius:10, overflow:'hidden', opacity:todosResolvidos?0.7:1 }}>
                  {/* Linha NF */}
                  <div
                    onClick={() => setExpandido(aberto ? null : nf.numero_nf)}
                    style={{ display:'grid', gridTemplateColumns:'120px 1fr 140px 100px 80px', gap:12, padding:'12px 16px', alignItems:'center', background:aberto?'#F0F4FF':i%2===0?C.surface:'#FAFAFA', cursor:'pointer' }}
                  >
                    <div>
                      <span style={{ fontSize:11, color:C.muted }}>{aberto?'▼':'▶'}</span>
                      <span style={{ fontWeight:800, color:C.accent, marginLeft:4 }}>NF {nf.numero_nf}</span>
                    </div>
                    <div>
                      <Ellipsis maxWidth={240}>{nf.fornecedor}</Ellipsis>
                      <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{nf.itens.length} divergência{nf.itens.length!==1?'s':''}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {[...new Set(nf.itens.map(d=>d.tipo_divergencia))].map(tipo => {
                        const cfg = TIPOS[tipo]
                        return (
                          <span key={tipo} style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, background:cfg.bg, color:cfg.cor, whiteSpace:'nowrap' }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        )
                      })}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color: nf.itens.reduce((s,d)=>s+(d.diferenca_total||0),0)>0?C.danger:C.success, textAlign:'right' }}>
                      {(() => { const t=nf.itens.reduce((s,d)=>s+(d.diferenca_total||0),0); return t!==0?`${t>0?'+':''}${fmtCurrency(t)}`:'—' })()}
                    </div>
                    {todosResolvidos
                      ? <span style={{ fontSize:11, fontWeight:700, color:C.okText }}>✅ Resolvido</span>
                      : <span style={{ fontSize:11, fontWeight:700, color:C.warning }}>{nf.itens.filter(d=>d.decisao==='PENDENTE').length} pendente{nf.itens.filter(d=>d.decisao==='PENDENTE').length!==1?'s':''}</span>
                    }
                  </div>

                  {/* Itens expandidos */}
                  {aberto && (
                    <div style={{ background:'#F8FAFF', borderTop:`1px solid ${C.border}` }}>
                      {nf.itens.map((d, j) => {
                        const cfg = TIPOS[d.tipo_divergencia]
                        const dec = DECISOES[d.decisao]
                        return (
                          <div key={j} style={{ padding:'12px 16px 12px 28px', borderBottom:j<nf.itens.length-1?`1px solid ${C.border}88`:'none', background:j%2?'#F0F4FF':'#F8FAFF' }}>
                            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                              <div style={{ flex:1 }}>
                                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.cor }}>{cfg.icon} {cfg.label}</span>
                                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:dec.bg, color:dec.cor, fontWeight:600 }}>{dec.label}</span>
                                  <span style={{ fontSize:11, color:C.muted }}>Pedido <strong style={{ color:C.accent }}>#{d.numero_pedido_oc}</strong></span>
                                </div>
                                <div style={{ fontSize:13, fontWeight:500, color:C.brand, marginBottom:6 }}>{d.descricao_produto}</div>
                                <div style={{ display:'flex', gap:20, fontSize:12 }}>
                                  <div>
                                    <div style={{ fontSize:10, color:C.muted, fontWeight:600, marginBottom:2 }}>PEDIDO (OC)</div>
                                    <div>{d.qtd_oc} <strong>{d.unid_oc}</strong> × R$ {d.vlrunit_oc?.toFixed(4)} = <strong>{fmtCurrency(d.vlrtot_oc)}</strong></div>
                                  </div>
                                  <div style={{ color:C.muted, alignSelf:'center', fontSize:16 }}>→</div>
                                  <div>
                                    <div style={{ fontSize:10, color:C.muted, fontWeight:600, marginBottom:2 }}>NOTA FISCAL</div>
                                    <div>{d.qtd_nf} <strong>{d.unid_nf}</strong> × R$ {d.vlrunit_nf?.toFixed(4)} = <strong>{fmtCurrency(d.vlrtot_nf)}</strong></div>
                                  </div>
                                  {d.tipo_divergencia !== 'ERRO_LANCAMENTO' && (
                                    <div style={{ alignSelf:'center' }}>
                                      <div style={{ fontSize:10, color:C.muted, fontWeight:600, marginBottom:4 }}>IMPACTO FINANCEIRO</div>
                                      {d.cobrou && d.cobrou !== 'IGUAL' && (
                                        <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700, background:COBROU[d.cobrou]?.bg, color:COBROU[d.cobrou]?.cor, marginBottom:4 }}>
                                          {COBROU[d.cobrou]?.label}
                                        </span>
                                      )}
                                      {d.diferenca_total !== 0 && (
                                        <div style={{ fontWeight:800, fontSize:14, color:d.diferenca_total>0?C.danger:C.success }}>
                                          {d.diferenca_total>0?'+':''}{fmtCurrency(d.diferenca_total)}
                                        </div>
                                      )}
                                      {d.tipo_divergencia==='DIVERGENCIA_PRECO' && d.diferenca_pct>0 && (
                                        <div style={{ fontSize:11, color:C.muted }}>
                                          {d.diferenca_pct.toFixed(1)}% {d.cobrou==='COBROU_MAIS'?'acima':'abaixo'} do preço aprovado
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize:11, color:C.muted, marginTop:6, fontStyle:'italic' }}>{cfg.desc}</div>
                                {d.observacao && <div style={{ fontSize:11, color:C.accent, marginTop:4 }}>💬 {d.observacao}</div>}
                              </div>
                              {d.decisao === 'PENDENTE' && (
                                <button onClick={() => setModal(d)} style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${cfg.cor}`, background:'white', color:cfg.cor, fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0, transition:'all 0.15s' }}
                                  onMouseEnter={e=>{e.currentTarget.style.background=cfg.cor;e.currentTarget.style.color='white'}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color=cfg.cor}}>
                                  Decidir →
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
