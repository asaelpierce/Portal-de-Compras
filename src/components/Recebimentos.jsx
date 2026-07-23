import { useState, useMemo, useEffect } from 'react'
import { Card, SearchInput, Select } from './UI'
import { C } from '../lib/tokens'
import { fmtCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function DiaSemana({ label }) {
  const fim = label === 'Dom' || label === 'Sáb'
  return (
    <div style={{ textAlign:'center', fontSize:11, fontWeight:700, color: fim ? C.muted : C.brand, padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
      {label}
    </div>
  )
}

function DiaCalendario({ dia, recebimentos, hoje, onClickDia }) {
  if (!dia) return <div style={{ background:'transparent' }} />

  const temRec   = recebimentos.length > 0
  const temNC    = recebimentos.some(r => r.nao_conformidade === 'Sim')
  const ehHoje   = dia === hoje
  const fimSemana = new Date(dia + 'T12:00:00').getDay() === 0 || new Date(dia + 'T12:00:00').getDay() === 6

  const bg = temNC ? '#FEE2E2' : temRec ? C.okDim : fimSemana ? '#F9FAFB' : C.surface
  const cor = temNC ? C.danger : temRec ? C.success : fimSemana ? C.subtle : C.muted
  const numDia = parseInt(dia.split('-')[2])

  return (
    <div
      onClick={() => temRec && onClickDia(dia, recebimentos)}
      style={{
        minHeight: 72, padding:'6px', borderRadius:8,
        background: bg,
        border: ehHoje ? `2px solid ${C.accent}` : `1px solid ${temRec ? cor+'33' : C.border}`,
        cursor: temRec ? 'pointer' : 'default',
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (temRec) e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      <div style={{ fontSize:12, fontWeight: ehHoje ? 800 : 500, color: ehHoje ? C.accent : fimSemana ? C.subtle : C.brand, marginBottom:4 }}>
        {numDia}
        {ehHoje && <span style={{ fontSize:9, marginLeft:4, color:C.accent }}>hoje</span>}
      </div>
      {temRec && (
        <>
          <div style={{ fontSize:10, fontWeight:700, color:cor }}>
            {recebimentos.length} receb.
          </div>
          <div style={{ fontSize:9, color:C.muted }}>
            {[...new Set(recebimentos.map(r => r.fornecedor?.split(' ')[0]))].slice(0,2).join(', ')}
            {recebimentos.length > 2 ? '...' : ''}
          </div>
          {temNC && (
            <div style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:C.danger }} title="Não conformidade" />
          )}
        </>
      )}
    </div>
  )
}

function ModalDia({ dia, recebimentos, onClose }) {
  const fmtDia = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })
  const temNC  = recebimentos.some(r => r.nao_conformidade === 'Sim')

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width:580, maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.brand, textTransform:'capitalize' }}>{fmtDia}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{recebimentos.length} recebimento{recebimentos.length!==1?'s':''} · {temNC?'⚠️ Há não conformidades':'✅ Sem não conformidades'}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.muted }}>×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {recebimentos.map((r, i) => {
            const nc = r.nao_conformidade === 'Sim'
            return (
              <div key={i} style={{ padding:'14px 16px', borderRadius:10, background: nc ? '#FEF2F2' : '#F0FDF4', border:`1px solid ${nc ? C.danger : C.success}33`, borderLeft:`4px solid ${nc ? C.danger : C.success}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.brand, marginBottom:4 }}>{r.fornecedor}</div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:C.muted, flexWrap:'wrap', marginBottom:6 }}>
                      {r.nota_fiscal    && <span>📄 NF: <strong>{r.nota_fiscal}</strong></span>}
                      {r.pedido_compra  && <span>📦 OC: <strong>#{r.pedido_compra}</strong></span>}
                      {r.grupo_produto  && <span>🏷️ {r.grupo_produto}</span>}
                      {r.responsavel_recebimento && <span>👤 {r.responsavel_recebimento}</span>}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {[
                        { label:'Qtd conforme NF', val:r.qtd_conforme_nf, ok:r.qtd_conforme_nf==='Sim' },
                        { label:'NF conforme OC',   val:r.nf_conforme_pedido, ok:r.nf_conforme_pedido==='Sim' },
                        { label:'Prazo',             val:r.prazo_dentro_esperado, ok:r.prazo_dentro_esperado==='Sim' },
                        { label:'Embalagem',         val:r.embalagem_conforme, ok:r.embalagem_conforme==='Sim' },
                      ].map((item, j) => (
                        <span key={j} style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600,
                          background: item.ok ? C.okDim : '#FEF2F2',
                          color: item.ok ? C.okText : C.danger }}>
                          {item.ok ? '✓' : '✗'} {item.label}
                        </span>
                      ))}
                    </div>
                    {nc && r.observacoes_conferencia && (
                      <div style={{ marginTop:8, padding:'8px 10px', background:'#FEE2E2', borderRadius:6, fontSize:11, color:C.danger }}>
                        ⚠️ {r.observacoes_conferencia}
                      </div>
                    )}
                    {r.observacoes_gerais && (
                      <div style={{ marginTop:6, fontSize:11, color:C.muted, fontStyle:'italic' }}>{r.observacoes_gerais}</div>
                    )}
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:nc?C.dangerDim:C.okDim, color:nc?C.danger:C.okText, whiteSpace:'nowrap' }}>
                    {nc ? '⚠️ NC' : '✅ OK'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Recebimentos() {
  const [dados, setDados]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalDia, setModalDia]     = useState(null)
  const [mesAtual, setMesAtual]     = useState(() => {
    const d = new Date()
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })
  const [search, setSearch]         = useState('')
  const [filtroNC, setFiltroNC]     = useState('')

  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    supabase.from('recebimentos').select('*').order('data_recebimento', { ascending: false })
      .then(({ data }) => { setDados(data || []); setLoading(false) })
  }, [])

  const kpis = useMemo(() => ({
    total:    dados.length,
    nc:       dados.filter(d => d.nao_conformidade === 'Sim').length,
    prazo_ok: dados.filter(d => d.prazo_dentro_esperado === 'Sim').length,
    forn:     new Set(dados.map(d => d.fornecedor).filter(Boolean)).size,
  }), [dados])

  // Dados filtrados para o calendário
  const dadosFiltrados = useMemo(() => dados.filter(d => {
    if (filtroNC === 'com_nc' && d.nao_conformidade !== 'Sim') return false
    if (filtroNC === 'sem_nc' && d.nao_conformidade === 'Sim') return false
    if (search) {
      const q = search.toLowerCase()
      if (![(d.fornecedor||''),(d.grupo_produto||''),(d.nota_fiscal||''),(d.pedido_compra||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [dados, filtroNC, search])

  // Agrupa recebimentos por dia
  const porDia = useMemo(() => {
    const map = {}
    dadosFiltrados.forEach(d => {
      if (!d.data_recebimento) return
      const dia = String(d.data_recebimento).slice(0, 10)
      if (!map[dia]) map[dia] = []
      map[dia].push(d)
    })
    return map
  }, [dadosFiltrados])

  // Gera os dias do mês atual
  const diasDoMes = useMemo(() => {
    const { ano, mes } = mesAtual
    const primeiroDia = new Date(ano, mes, 1).getDay()
    const totalDias   = new Date(ano, mes + 1, 0).getDate()
    const dias = []
    // Dias vazios no início
    for (let i = 0; i < primeiroDia; i++) dias.push(null)
    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      const str = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      dias.push(str)
    }
    return dias
  }, [mesAtual])

  // Estatísticas do mês
  const statsDoMes = useMemo(() => {
    const { ano, mes } = mesAtual
    const prefixo = `${ano}-${String(mes+1).padStart(2,'0')}`
    const doMes = dadosFiltrados.filter(d => String(d.data_recebimento||'').startsWith(prefixo))
    return {
      total:    doMes.length,
      nc:       doMes.filter(d => d.nao_conformidade === 'Sim').length,
      prazo_ok: doMes.filter(d => d.prazo_dentro_esperado === 'Sim').length,
      dias_com_rec: new Set(doMes.map(d => String(d.data_recebimento||'').slice(0,10))).size,
    }
  }, [dadosFiltrados, mesAtual])

  const irMes = (delta) => setMesAtual(({ ano, mes }) => {
    const d = new Date(ano, mes + delta, 1)
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {modalDia && <ModalDia dia={modalDia.dia} recebimentos={modalDia.recs} onClose={() => setModalDia(null)} />}

      {/* KPIs globais */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Total recebimentos', value:kpis.total,    color:C.accent  },
          { label:'Não conformidades',  value:kpis.nc,       color:C.danger  },
          { label:'Dentro do prazo',    value:kpis.prazo_ok, color:C.success },
          { label:'Fornecedores',       value:kpis.forn,     color:C.brand   },
        ].map((k, i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Fornecedor, NF, pedido, grupo..." />
        <Select value={filtroNC} onChange={setFiltroNC} options={[
          { value:'',       label:'Todos' },
          { value:'com_nc', label:'⚠️ Com não conformidade' },
          { value:'sem_nc', label:'✅ Sem não conformidade' },
        ]} />
      </div>

      {/* Calendário */}
      <Card>
        {/* Navegação do mês */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <button onClick={() => irMes(-1)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, cursor:'pointer', fontSize:14, color:C.brand }}>‹</button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.brand }}>{MESES[mesAtual.mes]} {mesAtual.ano}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
              {statsDoMes.dias_com_rec} dias com recebimento · {statsDoMes.total} entradas · {statsDoMes.nc} NC · {statsDoMes.prazo_ok} no prazo
            </div>
          </div>
          <button onClick={() => irMes(1)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, cursor:'pointer', fontSize:14, color:C.brand }}>›</button>
        </div>

        {/* Cabeçalho dias da semana */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
          {DIAS_SEMANA.map(d => <DiaSemana key={d} label={d} />)}
        </div>

        {/* Grid do calendário */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
          {diasDoMes.map((dia, i) => (
            <DiaCalendario
              key={i}
              dia={dia}
              recebimentos={dia ? (porDia[dia] || []) : []}
              hoje={hoje}
              onClickDia={(d, recs) => setModalDia({ dia: d, recs })}
            />
          ))}
        </div>

        {/* Legenda */}
        <div style={{ display:'flex', gap:16, marginTop:16, padding:'10px 14px', background:'#F9FAFB', borderRadius:8, fontSize:11, color:C.muted, flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:C.okDim, border:`1px solid ${C.success}33`, display:'inline-block' }} /> Recebimento OK</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:'#FEE2E2', border:'1px solid #FCA5A533', display:'inline-block' }} /> Com não conformidade</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:12, height:12, borderRadius:3, background:C.surface, border:`1px solid ${C.border}`, display:'inline-block' }} /> Sem recebimento</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:8, height:8, borderRadius:'50%', background:C.danger, display:'inline-block' }} /> NC detectada no dia</span>
          <span style={{ marginLeft:'auto', color:C.accent, fontWeight:600 }}>Clique em um dia para ver os detalhes</span>
        </div>
      </Card>
    </div>
  )
}
