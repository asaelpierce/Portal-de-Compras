import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, DataTable } from './UI'
import { C } from '../lib/tokens'
import { fmtDate } from '../lib/utils'
import { supabase } from '../lib/supabase'

// ── KdB 044/05 — Avaliação e Reavaliação de Provedor Externo ─────────────────
const CRITERIOS = [
  { id: 'especificacao_tecnica', label: 'Atendimento a especificação técnica' },
  { id: 'prazo_entrega',         label: 'Prazo de entrega' },
  { id: 'prazo_pagamento',       label: 'Prazo de pagamento' },
  { id: 'preco',                 label: 'Preço' },
]

const CRIT_CALIBRACAO = {
  id: 'servicos_calibracao',
  label: 'Serviços de calibração devem apresentar padrões de calibração rastreados à entidade credenciada, como pertencente à RBC (Rede Brasileira de Calibração) ou ao INMETRO, ou utilizar padrão internacional',
}

const CRIT_DESEMPENHO = {
  id: 'desempenho_periodo',
  label: 'Desempenho do Provedor no período de fornecimento',
}

const OPCOES = {
  'Atende':         { cor: C.success, bg: C.okDim     },
  'Insatisfatório': { cor: C.danger,  bg: C.dangerDim },
  'Não Aplicável':  { cor: C.subtle,  bg: '#F3F4F6'   },
}

const OPCOES_DESEMPENHO = {
  'Satisfatório':   { cor: C.success, bg: C.okDim     },
  'Insatisfatório': { cor: C.danger,  bg: C.dangerDim },
}

const RESULTADO = {
  APROVADO:  { label: '🟢 APROVADO',  cor: C.success, bg: C.okDim     },
  REPROVADO: { label: '🔴 REPROVADO', cor: C.danger,  bg: C.dangerDim },
}

// Aprovado se nenhum critério aplicável for Insatisfatório
function calcularResultado(form, isReav) {
  const crits = [...CRITERIOS.map(c => form[c.id]), form.servicos_calibracao]
  if (isReav) crits.push(form.desempenho_periodo)
  if (crits.some(v => !v)) return null
  const temInsatisfatorio = crits.some(v => v === 'Insatisfatório')
  return temInsatisfatorio ? 'REPROVADO' : 'APROVADO'
}

function ModalAval({ aval, fornecedores, onClose, onSalvar }) {
  const [form, setForm] = useState(aval || {
    fornecedor: '', produto_servico: '', tipo: 'AVALIACAO',
    especificacao_tecnica: '', prazo_entrega: '', prazo_pagamento: '', preco: '',
    servicos_calibracao: 'Não Aplicável', desempenho_periodo: '',
    responsavel: '', observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const isReav = form.tipo === 'REAVALIACAO'
  const resultado = calcularResultado(form, isReav)
  const cfgRes = resultado ? RESULTADO[resultado] : null
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    if (!form.fornecedor || !resultado) return
    setSalvando(true)
    await onSalvar({ ...form, resultado })
    setSalvando(false)
    onClose()
  }

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 12, outline: 'none',
    fontFamily: 'inherit', color: C.text, background: C.bg,
  }

  const BotoesOpcao = ({ campo, opcoes = OPCOES }) => (
    <div style={{ display:'flex', gap:6 }}>
      {Object.entries(opcoes).map(([k, cfg]) => (
        <button key={k} onClick={() => set(campo, k)} style={{
          flex:1, padding:'6px 8px', borderRadius:7, cursor:'pointer',
          border:`1.5px solid ${form[campo]===k ? cfg.cor : C.border}`,
          background: form[campo]===k ? cfg.bg : 'white',
          color: form[campo]===k ? cfg.cor : C.muted,
          fontSize:11, fontWeight: form[campo]===k ? 700 : 500,
          transition:'all 0.15s', whiteSpace:'nowrap',
        }}>{k}</button>
      ))}
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:720, maxHeight:'88vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.brand }}>
              {aval ? '✏️ Editar' : '📝 Nova'} {isReav ? 'reavaliação' : 'avaliação'}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              KdB 044/05 — Avaliação e Reavaliação de Provedor Externo
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.muted, lineHeight:1 }}>×</button>
        </div>

        {/* Tipo */}
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          {[['AVALIACAO','📝 Avaliação'],['REAVALIACAO','🔄 Reavaliação']].map(([k, lbl]) => (
            <button key={k} onClick={() => set('tipo', k)} style={{
              flex:1, padding:'9px', borderRadius:8, cursor:'pointer',
              border:`1.5px solid ${form.tipo===k ? C.accent : C.border}`,
              background: form.tipo===k ? C.accentDim : 'white',
              color: form.tipo===k ? C.accentText : C.muted,
              fontSize:13, fontWeight: form.tipo===k ? 700 : 500,
            }}>{lbl}</button>
          ))}
        </div>

        {/* Dados */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Provedor Externo *</label>
            <input list="forn-044" value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)}
              placeholder="Nome do fornecedor" style={{ ...inp, marginTop:5 }} />
            <datalist id="forn-044">{fornecedores.map(f => <option key={f} value={f} />)}</datalist>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Produto / Serviço</label>
            <input value={form.produto_servico} onChange={e => set('produto_servico', e.target.value)}
              placeholder="Ex: Tubulação, Jateamento..." style={{ ...inp, marginTop:5 }} />
          </div>
        </div>

        {/* Critérios */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.brand, marginBottom:10 }}>
            {isReav ? 'REAVALIAÇÃO' : 'AVALIAÇÃO'}
          </div>
          {CRITERIOS.map(crit => (
            <div key={crit.id} style={{ marginBottom:10, padding:'12px 14px', background:'#F9FAFB', borderRadius:9, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.brand, marginBottom:8 }}>{crit.label}</div>
              <BotoesOpcao campo={crit.id} />
            </div>
          ))}

          {/* Desempenho — só reavaliação */}
          {isReav && (
            <div style={{ marginBottom:10, padding:'12px 14px', background:'#FFF7ED', borderRadius:9, border:`1px solid ${C.warning}33` }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.brand, marginBottom:8 }}>{CRIT_DESEMPENHO.label}</div>
              <BotoesOpcao campo={CRIT_DESEMPENHO.id} opcoes={OPCOES_DESEMPENHO} />
            </div>
          )}

          {/* Calibração */}
          <div style={{ padding:'12px 14px', background:'#F0F4FF', borderRadius:9, border:`1px solid ${C.accent}22` }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.brand, marginBottom:8, lineHeight:1.5 }}>{CRIT_CALIBRACAO.label}</div>
            <BotoesOpcao campo={CRIT_CALIBRACAO.id} />
          </div>
        </div>

        {/* Resultado */}
        {cfgRes && (
          <div style={{ padding:'16px 18px', borderRadius:10, background:cfgRes.bg, border:`1px solid ${cfgRes.cor}44`, marginBottom:18, textAlign:'center' }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Resultado</div>
            <div style={{ fontSize:22, fontWeight:800, color:cfgRes.cor, marginTop:4 }}>{cfgRes.label}</div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Resp. pelas informações</label>
            <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
              placeholder="Seu nome" style={{ ...inp, marginTop:5 }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Observações</label>
            <input value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              placeholder="Comentários" style={{ ...inp, marginTop:5 }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={salvar} disabled={!form.fornecedor || !resultado || salvando}
            style={{ flex:1, padding:11, borderRadius:8, border:'none',
              background: (!form.fornecedor || !resultado) ? C.border : C.brand, color:'white',
              fontSize:13, cursor:(!form.fornecedor || !resultado) ? 'not-allowed' : 'pointer', fontWeight:600 }}>
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
          <button onClick={onClose} style={{ padding:'11px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Kdb044A() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [nova, setNova]         = useState(false)
  const [search, setSearch]     = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroRes, setFiltroRes]   = useState('')

  const carregar = async () => {
    setLoading(true)
    const [{ data: avs }, { data: forns }] = await Promise.all([
      supabase.from('kdb044a_avaliacoes').select('*').order('data_avaliacao', { ascending: false }),
      supabase.from('pedidos_encerrados').select('fornecedor').limit(2000),
    ])
    setAvaliacoes(avs || [])
    setFornecedores([...new Set((forns || []).map(f => f.fornecedor).filter(Boolean))].sort())
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const salvar = async (dados) => {
    if (dados.id) await supabase.from('kdb044a_avaliacoes').update({ ...dados, atualizado_em: new Date().toISOString() }).eq('id', dados.id)
    else await supabase.from('kdb044a_avaliacoes').insert(dados)
    await carregar()
  }
  const excluir = async (id) => {
    if (!confirm('Excluir esta avaliação?')) return
    await supabase.from('kdb044a_avaliacoes').delete().eq('id', id)
    await carregar()
  }

  const kpis = useMemo(() => ({
    total:       avaliacoes.length,
    avaliacoes:  avaliacoes.filter(a => a.tipo === 'AVALIACAO').length,
    reavaliacoes:avaliacoes.filter(a => a.tipo === 'REAVALIACAO').length,
    aprovados:   avaliacoes.filter(a => a.resultado === 'APROVADO').length,
    reprovados:  avaliacoes.filter(a => a.resultado === 'REPROVADO').length,
  }), [avaliacoes])

  const filtrados = useMemo(() => avaliacoes.filter(a => {
    if (filtroTipo && a.tipo !== filtroTipo) return false
    if (filtroRes  && a.resultado !== filtroRes) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(a.fornecedor||''),(a.produto_servico||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [avaliacoes, filtroTipo, filtroRes, search])

  const Badge = ({ valor }) => {
    const cfg = OPCOES[valor] || OPCOES_DESEMPENHO[valor] || { cor: C.subtle, bg: '#F3F4F6' }
    return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.cor, fontWeight:600, whiteSpace:'nowrap' }}>{valor || '—'}</span>
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {(modal || nova) && (
        <ModalAval aval={modal} fornecedores={fornecedores}
          onClose={() => { setModal(null); setNova(false) }} onSalvar={salvar} />
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>📝 KdB 044/05 — Avaliação e Reavaliação de Provedor Externo</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
            Avaliação por critérios Atende / Insatisfatório · Aprovação anual de fornecedores críticos
          </div>
        </div>
        <button onClick={() => setNova(true)} style={{
          padding:'10px 18px', borderRadius:9, border:'none', background:C.brand,
          color:'white', fontSize:13, cursor:'pointer', fontWeight:600 }}>
          + Nova avaliação
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        {[
          { label:'Total registros', value:kpis.total,        color:C.accent  },
          { label:'Avaliações',      value:kpis.avaliacoes,   color:C.brand   },
          { label:'Reavaliações',    value:kpis.reavaliacoes, color:C.warning },
          { label:'Aprovados',       value:kpis.aprovados,    color:C.success },
          { label:'Reprovados',      value:kpis.reprovados,   color:C.danger  },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar provedor ou produto..."
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.text, outline:'none', minWidth:220 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.text, outline:'none' }}>
          <option value=''>Todos os tipos</option>
          <option value='AVALIACAO'>📝 Avaliação</option>
          <option value='REAVALIACAO'>🔄 Reavaliação</option>
        </select>
        <select value={filtroRes} onChange={e => setFiltroRes(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.text, outline:'none' }}>
          <option value=''>Todos resultados</option>
          <option value='APROVADO'>🟢 Aprovado</option>
          <option value='REPROVADO'>🔴 Reprovado</option>
        </select>
        {(search || filtroTipo || filtroRes) && (
          <button onClick={() => { setSearch(''); setFiltroTipo(''); setFiltroRes('') }}
            style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.muted, cursor:'pointer' }}>
            ✕ Limpar
          </button>
        )}
      </div>

      <Card>
        <CardTitle>{filtrados.length} registros</CardTitle>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:C.muted }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📝</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Nenhuma avaliação registrada</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Clique em "Nova avaliação" para começar</div>
          </div>
        ) : (
          <DataTable
            columns={[
              { label:'Provedor Externo', render:r => (
                <div>
                  <div style={{ fontWeight:600, color:C.brand }}>{r.fornecedor}</div>
                  <div style={{ fontSize:10, color:C.muted }}>
                    {r.tipo === 'REAVALIACAO' ? '🔄 Reavaliação' : '📝 Avaliação'}
                  </div>
                </div>
              )},
              { label:'Produto/Serviço', render:r => <span style={{ fontSize:11 }}>{r.produto_servico || '—'}</span> },
              { label:'Especificação técnica', render:r => <Badge valor={r.especificacao_tecnica} /> },
              { label:'Prazo de entrega',      render:r => <Badge valor={r.prazo_entrega} /> },
              { label:'Prazo de pagamento',    render:r => <Badge valor={r.prazo_pagamento} /> },
              { label:'Preço',                 render:r => <Badge valor={r.preco} /> },
              { label:'Calibração',            render:r => <Badge valor={r.servicos_calibracao} /> },
              { label:'Desempenho', render:r => r.tipo === 'REAVALIACAO' ? <Badge valor={r.desempenho_periodo} /> : <span style={{color:C.subtle,fontSize:11}}>—</span> },
              { label:'Resultado', render:r => {
                const cfg = RESULTADO[r.resultado]
                return cfg ? <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:cfg.bg, color:cfg.cor, whiteSpace:'nowrap' }}>{cfg.label}</span> : '—'
              }},
              { label:'Resp.', render:r => <span style={{ fontSize:11, color:C.muted }}>{r.responsavel || '—'}</span> },
              { label:'Data da avaliação', render:r => <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>{fmtDate(r.data_avaliacao)}</span> },
              { label:'', render:r => (
                <div style={{ display:'flex', gap:5 }}>
                  <button onClick={() => setModal(r)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.muted, fontSize:11, cursor:'pointer' }}>✏️</button>
                  <button onClick={() => excluir(r.id)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.danger}44`, background:C.dangerDim, color:C.danger, fontSize:11, cursor:'pointer' }}>🗑</button>
                </div>
              )},
            ]}
            rows={filtrados}
          />
        )}
      </Card>
    </div>
  )
}
