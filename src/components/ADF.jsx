import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, DataTable } from './UI'
import { C } from '../lib/tokens'
import { fmtDate } from '../lib/utils'
import { supabase } from '../lib/supabase'

// ── Metodologia KdB 114/02 — ADF ─────────────────────────────────────────────
const QUESITOS = [
  { id: 'parecer_tecnico',        label: 'Parecer técnico do usuário no período',  pontos: 40,
    desc: 'Avaliação qualitativa do usuário interno sobre o produto/serviço fornecido' },
  { id: 'resultados_indesejaveis',label: 'Resultados indesejáveis / devolução',    pontos: 30,
    desc: 'Ocorrência de não conformidades, devoluções ou retrabalho no período' },
  { id: 'cumprimento_prazo',      label: 'Cumprimento do prazo de entrega',        pontos: 30,
    desc: 'Aderência aos prazos acordados nas ordens de compra' },
]

const ATENDIMENTO = {
  TOTAL:        { label: 'Total',        pct: 1.0,  cor: C.success, bg: C.okDim     },
  PARCIAL:      { label: 'Parcial',      pct: 0.5,  cor: C.warning, bg: C.warnDim   },
  NAO:          { label: 'Não atende',   pct: 0.0,  cor: C.danger,  bg: C.dangerDim },
  NAO_AVALIADO: { label: 'Não avaliado', pct: null, cor: C.subtle,  bg: '#F3F4F6'   },
}

const CLASSIF = {
  APROVADO:          { label: '🟢 Aprovado',            cor: C.success, bg: C.okDim,     min: 71 },
  APROVADO_RESSALVA: { label: '🟡 Aprovado c/ ressalva', cor: C.warning, bg: C.warnDim,   min: 60 },
  REPROVADO:         { label: '🔴 Reprovado',            cor: C.danger,  bg: C.dangerDim, min: 0  },
  NAO_AVALIADO:      { label: '⚪ Não avaliado',         cor: C.subtle,  bg: '#F3F4F6',   min: null },
}

const PROVIDENCIAS = {
  APROVADO:          'Manter fornecedor. Continuar monitoramento periódico.',
  APROVADO_RESSALVA: 'Comunicar pontos de melhoria ao fornecedor e reavaliar no próximo período.',
  REPROVADO:         'Emitir notificação formal. Avaliar substituição ou plano de ação com prazo definido.',
  NAO_AVALIADO:      'Aguardando informações para completar a avaliação.',
}

function calcularADF(av) {
  const vals = QUESITOS.map(q => ATENDIMENTO[av[q.id]]?.pct)
  if (vals.some(v => v === null || v === undefined)) {
    return { pontuacao: null, classificacao: 'NAO_AVALIADO' }
  }
  const pontos = QUESITOS.reduce((s, q, i) => s + q.pontos * vals[i], 0)
  const cls = pontos >= 71 ? 'APROVADO' : pontos >= 60 ? 'APROVADO_RESSALVA' : 'REPROVADO'
  return { pontuacao: parseFloat(pontos.toFixed(1)), classificacao: cls }
}

// ── Modal de avaliação ───────────────────────────────────────────────────────
function ModalADF({ avaliacao, fornecedores, onClose, onSalvar }) {
  const [form, setForm] = useState(avaliacao || {
    fornecedor: '', produto_servico: '',
    periodo: `${new Date().getFullYear()}-S${new Date().getMonth() < 6 ? 1 : 2}`,
    parecer_tecnico: 'NAO_AVALIADO', parecer_obs: '',
    resultados_indesejaveis: 'NAO_AVALIADO', resultados_obs: '',
    cumprimento_prazo: 'NAO_AVALIADO', prazo_obs: '',
    responsavel: '', observacoes_gerais: '',
  })
  const [salvando, setSalvando] = useState(false)

  const resultado = calcularADF(form)
  const cfgCls = CLASSIF[resultado.classificacao]

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    if (!form.fornecedor) return
    setSalvando(true)
    await onSalvar({
      ...form,
      pontuacao_final: resultado.pontuacao,
      classificacao: resultado.classificacao,
      providencia_sugerida: PROVIDENCIAS[resultado.classificacao],
    })
    setSalvando(false)
    onClose()
  }

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 12, outline: 'none',
    fontFamily: 'inherit', color: C.text, background: C.bg,
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:700, maxHeight:'88vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.brand }}>
              {avaliacao ? '✏️ Editar avaliação' : '📋 Nova avaliação ADF'}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              KdB 114/02 — Análise de Desempenho de Fornecedor
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.muted, lineHeight:1 }}>×</button>
        </div>

        {/* Dados básicos */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:18 }}>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Fornecedor *</label>
            <input list="forn-list" value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)}
              placeholder="Nome do fornecedor" style={{ ...inp, marginTop:5 }} />
            <datalist id="forn-list">
              {fornecedores.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Período</label>
            <select value={form.periodo} onChange={e => set('periodo', e.target.value)} style={{ ...inp, marginTop:5 }}>
              {[2025, 2026, 2027].flatMap(ano => [1, 2].map(s => (
                <option key={`${ano}-S${s}`} value={`${ano}-S${s}`}>{ano} — {s}º semestre</option>
              )))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Produto / Serviço</label>
          <input value={form.produto_servico} onChange={e => set('produto_servico', e.target.value)}
            placeholder="Ex: Chapas de aço, Jateamento, Flanges..." style={{ ...inp, marginTop:5 }} />
        </div>

        {/* Quesitos */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.brand, marginBottom:10 }}>QUESITOS DE AVALIAÇÃO</div>
          {QUESITOS.map(q => (
            <div key={q.id} style={{ marginBottom:14, padding:'14px 16px', background:'#F9FAFB', borderRadius:10, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.brand }}>{q.label}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{q.desc}</div>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:20, background:C.accentDim, color:C.accentText, fontSize:12, fontWeight:800, whiteSpace:'nowrap', marginLeft:10 }}>
                  {q.pontos} pts
                </span>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                {Object.entries(ATENDIMENTO).map(([k, cfg]) => (
                  <button key={k} onClick={() => set(q.id, k)} style={{
                    flex:1, padding:'7px 6px', borderRadius:7, cursor:'pointer',
                    border:`1.5px solid ${form[q.id]===k ? cfg.cor : C.border}`,
                    background: form[q.id]===k ? cfg.bg : 'white',
                    color: form[q.id]===k ? cfg.cor : C.muted,
                    fontSize:11, fontWeight: form[q.id]===k ? 700 : 500,
                    transition:'all 0.15s',
                  }}>
                    {cfg.label}
                    {cfg.pct !== null && <div style={{ fontSize:9, marginTop:1 }}>{(cfg.pct*100).toFixed(0)}%</div>}
                  </button>
                ))}
              </div>
              <input value={form[q.id.replace('_tecnico','_obs').replace('_indesejaveis','_obs').replace('cumprimento_prazo','prazo_obs')] || ''}
                onChange={e => set(q.id === 'parecer_tecnico' ? 'parecer_obs' : q.id === 'resultados_indesejaveis' ? 'resultados_obs' : 'prazo_obs', e.target.value)}
                placeholder="Justificativa (opcional)"
                style={{ ...inp, marginTop:8, fontSize:11, padding:'6px 10px' }} />
            </div>
          ))}
        </div>

        {/* Resultado em tempo real */}
        <div style={{ padding:'16px 18px', borderRadius:10, background: cfgCls.bg, border:`1px solid ${cfgCls.cor}44`, marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Pontuação final</div>
              <div style={{ fontSize:30, fontWeight:800, color:cfgCls.cor, marginTop:2 }}>
                {resultado.pontuacao !== null ? resultado.pontuacao : '—'}
                {resultado.pontuacao !== null && <span style={{ fontSize:16, fontWeight:500 }}> / 100</span>}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Classificação</div>
              <div style={{ fontSize:16, fontWeight:700, color:cfgCls.cor, marginTop:4 }}>{cfgCls.label}</div>
            </div>
          </div>
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${cfgCls.cor}22`, fontSize:11, color:C.text, lineHeight:1.6 }}>
            <strong style={{ color:cfgCls.cor }}>Providência sugerida: </strong>
            {PROVIDENCIAS[resultado.classificacao]}
          </div>
        </div>

        {/* Responsável e obs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Responsável</label>
            <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
              placeholder="Seu nome" style={{ ...inp, marginTop:5 }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Observações gerais</label>
            <input value={form.observacoes_gerais} onChange={e => set('observacoes_gerais', e.target.value)}
              placeholder="Comentários adicionais" style={{ ...inp, marginTop:5 }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={salvar} disabled={!form.fornecedor || salvando}
            style={{ flex:1, padding:11, borderRadius:8, border:'none',
              background: !form.fornecedor ? C.border : C.brand, color:'white',
              fontSize:13, cursor: !form.fornecedor ? 'not-allowed' : 'pointer', fontWeight:600 }}>
            {salvando ? 'Salvando...' : '💾 Salvar avaliação'}
          </button>
          <button onClick={onClose} style={{ padding:'11px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ADF() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)
  const [novaAval, setNovaAval]     = useState(false)
  const [search, setSearch]         = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroClassif, setFiltroClassif] = useState('')
  const [mostraMetodo, setMostraMetodo]   = useState(false)

  const carregar = async () => {
    setLoading(true)
    const [{ data: avs }, { data: forns }] = await Promise.all([
      supabase.from('adf_avaliacoes').select('*').order('data_avaliacao', { ascending: false }),
      supabase.from('pedidos_encerrados').select('fornecedor').limit(2000),
    ])
    setAvaliacoes(avs || [])
    setFornecedores([...new Set((forns || []).map(f => f.fornecedor).filter(Boolean))].sort())
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async (dados) => {
    if (dados.id) {
      await supabase.from('adf_avaliacoes').update({ ...dados, atualizado_em: new Date().toISOString() }).eq('id', dados.id)
    } else {
      await supabase.from('adf_avaliacoes').insert(dados)
    }
    await carregar()
  }

  const excluir = async (id) => {
    if (!confirm('Excluir esta avaliação?')) return
    await supabase.from('adf_avaliacoes').delete().eq('id', id)
    await carregar()
  }

  const periodos = useMemo(() => [...new Set(avaliacoes.map(a => a.periodo).filter(Boolean))].sort().reverse(), [avaliacoes])

  const kpis = useMemo(() => ({
    total:     avaliacoes.length,
    aprovados: avaliacoes.filter(a => a.classificacao === 'APROVADO').length,
    ressalva:  avaliacoes.filter(a => a.classificacao === 'APROVADO_RESSALVA').length,
    reprovados:avaliacoes.filter(a => a.classificacao === 'REPROVADO').length,
    media:     avaliacoes.filter(a => a.pontuacao_final != null).length
      ? (avaliacoes.filter(a => a.pontuacao_final != null).reduce((s,a) => s + parseFloat(a.pontuacao_final), 0) /
         avaliacoes.filter(a => a.pontuacao_final != null).length).toFixed(1)
      : '—',
  }), [avaliacoes])

  const filtrados = useMemo(() => avaliacoes.filter(a => {
    if (filtroPeriodo && a.periodo !== filtroPeriodo) return false
    if (filtroClassif && a.classificacao !== filtroClassif) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(a.fornecedor||''),(a.produto_servico||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [avaliacoes, filtroPeriodo, filtroClassif, search])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {(modal || novaAval) && (
        <ModalADF
          avaliacao={modal}
          fornecedores={fornecedores}
          onClose={() => { setModal(null); setNovaAval(false) }}
          onSalvar={salvar}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>📋 ADF — Análise de Desempenho de Fornecedor</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
            KdB 114/02 · Avaliação semestral qualitativa · Complementa o IDF operacional
          </div>
          <button onClick={() => setMostraMetodo(m => !m)} style={{
            marginTop:8, padding:'5px 12px', borderRadius:7,
            border:`1px solid ${C.accent}`, background: mostraMetodo ? C.accent : C.accentDim,
            color: mostraMetodo ? 'white' : C.accentText, fontSize:11, cursor:'pointer', fontWeight:600,
          }}>
            {mostraMetodo ? '▼' : '▶'} Metodologia de pontuação
          </button>
        </div>
        <button onClick={() => setNovaAval(true)} style={{
          padding:'10px 18px', borderRadius:9, border:'none', background:C.brand,
          color:'white', fontSize:13, cursor:'pointer', fontWeight:600,
        }}>
          + Nova avaliação
        </button>
      </div>

      {/* Metodologia */}
      {mostraMetodo && (
        <div style={{ padding:'16px 18px', background:'#F8FAFF', border:`1px solid ${C.accent}33`, borderRadius:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.brand, marginBottom:12 }}>QUESITOS E PONTUAÇÃO</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {QUESITOS.map(q => (
              <div key={q.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'white', borderRadius:8, border:`1px solid ${C.border}` }}>
                <div style={{ width:50, height:50, borderRadius:'50%', background:C.accentDim, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:C.accentText }}>{q.pontos}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.brand }}>{q.label}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{q.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:12, fontWeight:700, color:C.brand, marginBottom:8 }}>NÍVEIS DE ATENDIMENTO</div>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            {Object.entries(ATENDIMENTO).filter(([k]) => k !== 'NAO_AVALIADO').map(([k, cfg]) => (
              <div key={k} style={{ flex:1, minWidth:130, padding:'10px 14px', background:cfg.bg, borderRadius:8, borderLeft:`3px solid ${cfg.cor}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:cfg.cor }}>{cfg.label}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Vale {(cfg.pct*100).toFixed(0)}% dos pontos</div>
              </div>
            ))}
          </div>

          <div style={{ padding:'10px 14px', background:C.brand, borderRadius:8, fontSize:13, fontFamily:'monospace', color:'white', fontWeight:600, textAlign:'center', marginBottom:12 }}>
            Pontuação = (40 × nível₁) + (30 × nível₂) + (30 × nível₃)
          </div>

          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[['71 a 100','Aprovado',C.success],['60 a 70','Aprovado c/ ressalva',C.warning],['abaixo de 60','Reprovado',C.danger]].map(([f,d,cor],i) => (
              <div key={i} style={{ flex:1, minWidth:150, padding:'8px 12px', background:'white', borderRadius:7, borderLeft:`3px solid ${cor}`, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:13, fontWeight:800, color:cor }}>{f}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        {[
          { label:'Total avaliações', value:kpis.total,      color:C.accent  },
          { label:'Pontuação média',  value:kpis.media,      color:C.brand   },
          { label:'Aprovados',        value:kpis.aprovados,  color:C.success },
          { label:'Com ressalva',     value:kpis.ressalva,   color:C.warning },
          { label:'Reprovados',       value:kpis.reprovados, color:C.danger  },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar fornecedor ou produto..."
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.text, outline:'none', minWidth:220 }} />
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.text, outline:'none' }}>
          <option value=''>Todos os períodos</option>
          {periodos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroClassif} onChange={e => setFiltroClassif(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.text, outline:'none' }}>
          <option value=''>Todas classificações</option>
          {Object.entries(CLASSIF).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
        </select>
        {(search || filtroPeriodo || filtroClassif) && (
          <button onClick={() => { setSearch(''); setFiltroPeriodo(''); setFiltroClassif('') }}
            style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, fontSize:12, color:C.muted, cursor:'pointer' }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      <Card>
        <CardTitle>{filtrados.length} avaliações</CardTitle>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:C.muted }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:600, color:C.brand }}>Nenhuma avaliação registrada</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Clique em "Nova avaliação" para começar</div>
          </div>
        ) : (
          <DataTable
            columns={[
              { label:'Fornecedor', render:r => (
                <div>
                  <div style={{ fontWeight:600, color:C.brand }}>{r.fornecedor}</div>
                  {r.produto_servico && <div style={{ fontSize:10, color:C.muted }}>{r.produto_servico}</div>}
                </div>
              )},
              { label:'Período', render:r => <span style={{ fontSize:11, color:C.muted }}>{r.periodo}</span> },
              { label:'Parecer (40)', render:r => {
                const cfg = ATENDIMENTO[r.parecer_tecnico] || ATENDIMENTO.NAO_AVALIADO
                return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.cor, fontWeight:600 }}>{cfg.label}</span>
              }},
              { label:'Devoluções (30)', render:r => {
                const cfg = ATENDIMENTO[r.resultados_indesejaveis] || ATENDIMENTO.NAO_AVALIADO
                return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.cor, fontWeight:600 }}>{cfg.label}</span>
              }},
              { label:'Prazo (30)', render:r => {
                const cfg = ATENDIMENTO[r.cumprimento_prazo] || ATENDIMENTO.NAO_AVALIADO
                return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.cor, fontWeight:600 }}>{cfg.label}</span>
              }},
              { label:'Pontuação', render:r => {
                const cfg = CLASSIF[r.classificacao] || CLASSIF.NAO_AVALIADO
                return <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:14, fontWeight:800, background:cfg.bg, color:cfg.cor }}>
                  {r.pontuacao_final != null ? r.pontuacao_final : '—'}
                </span>
              }},
              { label:'Classificação', render:r => {
                const cfg = CLASSIF[r.classificacao] || CLASSIF.NAO_AVALIADO
                return <span style={{ fontSize:11, fontWeight:600, color:cfg.cor }}>{cfg.label}</span>
              }},
              { label:'Data', render:r => <span style={{ fontSize:11, color:C.muted }}>{fmtDate(r.data_avaliacao)}</span> },
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
