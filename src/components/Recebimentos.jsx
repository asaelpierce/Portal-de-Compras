import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, DataTable, SearchInput, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmt } from '../lib/utils'
import { supabase } from '../lib/supabase'

function ScoreBadge({ pct, inverso = false }) {
  // inverso: quanto menor, melhor (ex: % NC)
  const bom = inverso ? pct <= 20 : pct >= 80
  const ok  = inverso ? pct <= 50 : pct >= 60
  const cor = bom ? C.success : ok ? C.warning : C.danger
  const bg  = bom ? C.okDim   : ok ? C.warnDim  : C.dangerDim
  return (
    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color:cor }}>
      {pct}%
    </span>
  )
}

function MiniBar({ value, total, color }) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:5, background:C.border, borderRadius:3 }}>
        <div style={{ height:'100%', borderRadius:3, background:color, width:`${pct}%`, transition:'width .5s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color, minWidth:28 }}>{value}</span>
    </div>
  )
}

export default function Recebimentos() {
  const [dados, setDados]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroNC, setFiltroNC]   = useState('')
  const [detalhe, setDetalhe]     = useState(null)

  useEffect(() => {
    supabase.from('recebimentos').select('*').order('data_recebimento', { ascending: false }).then(({ data }) => {
      setDados(data || [])
      setLoading(false)
    })
  }, [])

  // Score por fornecedor — normaliza nomes
  const porFornecedor = useMemo(() => {
    const map = {}
    dados.forEach(r => {
      const k = (r.fornecedor || '').trim().toUpperCase()
      if (!k || k.length < 3) return
      if (!map[k]) map[k] = { nome: r.fornecedor?.trim(), total:0, prazo:0, emb:0, nf:0, nc:0, recebimentos: [] }
      map[k].total++
      if (r.prazo_dentro_esperado === 'Sim') map[k].prazo++
      if (r.embalagem_conforme    === 'Sim') map[k].emb++
      if (r.nf_conforme_pedido    === 'Sim') map[k].nf++
      if (r.nao_conformidade      === 'Sim') map[k].nc++
      map[k].recebimentos.push(r)
    })
    return Object.values(map)
      .map(f => ({
        ...f,
        pct_prazo: Math.round(f.prazo / f.total * 100),
        pct_emb:   Math.round(f.emb   / f.total * 100),
        pct_nf:    Math.round(f.nf    / f.total * 100),
        pct_nc:    Math.round(f.nc    / f.total * 100),
        // Score composto: 40% prazo + 30% embalagem + 20% NF conforme + 10% (100-NC%)
        score: Math.round(
          (f.prazo / f.total * 100 * 0.40) +
          (f.emb   / f.total * 100 * 0.30) +
          (f.nf    / f.total * 100 * 0.20) +
          ((1 - f.nc / f.total) * 100 * 0.10)
        ),
      }))
      .filter(f => f.total >= 1)
      .sort((a, b) => b.nc - a.nc || a.score - b.score)
  }, [dados])

  const filtrados = useMemo(() => porFornecedor.filter(f => {
    if (filtroNC === 'com_nc'   && f.nc === 0)  return false
    if (filtroNC === 'sem_nc'   && f.nc > 0)    return false
    if (filtroNC === 'prazo_nok' && f.pct_prazo >= 80) return false
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [porFornecedor, search, filtroNC])

  const kpis = useMemo(() => ({
    total:       dados.length,
    nc_total:    dados.filter(r => r.nao_conformidade === 'Sim').length,
    prazo_ok:    dados.filter(r => r.prazo_dentro_esperado === 'Sim').length,
    emb_nok:     dados.filter(r => r.embalagem_conforme === 'Não').length,
    fornecedores: porFornecedor.length,
    criticos:    porFornecedor.filter(f => f.pct_nc >= 30 && f.total >= 2).length,
  }), [dados, porFornecedor])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Modal detalhe */}
      {detalhe && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:C.surface, borderRadius:16, padding:28, width:600, maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.brand }}>{detalhe.nome}</div>
              <button onClick={() => setDetalhe(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.muted }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              {[
                { l:'Recebimentos', v:detalhe.total, c:C.accent },
                { l:'Prazo OK',    v:`${detalhe.pct_prazo}%`, c: detalhe.pct_prazo>=80?C.success:C.danger },
                { l:'Emb. OK',     v:`${detalhe.pct_emb}%`,   c: detalhe.pct_emb>=80?C.success:C.danger },
                { l:'Não conf.',   v:detalhe.nc,              c: detalhe.nc===0?C.success:C.danger },
              ].map((k,i) => (
                <div key={i} style={{ textAlign:'center', padding:'10px', background:'#F9FAFB', borderRadius:8, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em' }}>{k.l}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:k.c, marginTop:4 }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Histórico de recebimentos</div>
            {detalhe.recebimentos.map((r, i) => (
              <div key={i} style={{ padding:'10px 12px', marginBottom:6, borderRadius:8, background: r.nao_conformidade==='Sim' ? C.dangerDim : '#F9FAFB', border:`1px solid ${r.nao_conformidade==='Sim' ? C.danger+'33' : C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:C.brand }}>NF {r.nota_fiscal} · Pedido {r.pedido_compra || '—'}</span>
                  <span style={{ fontSize:11, color:C.muted }}>{fmtDate(r.data_recebimento)}</span>
                </div>
                <div style={{ display:'flex', gap:8, fontSize:11 }}>
                  {[
                    { l:'Prazo', v:r.prazo_dentro_esperado },
                    { l:'NF ok', v:r.nf_conforme_pedido },
                    { l:'Embal.', v:r.embalagem_conforme },
                    { l:'NC',    v:r.nao_conformidade },
                  ].map((s,j) => {
                    const ok = s.v === 'Sim'
                    const negativo = s.l === 'NC' ? s.v === 'Sim' : !ok
                    const cor = negativo ? C.danger : C.success
                    return <span key={j} style={{ padding:'1px 7px', borderRadius:20, background:negativo?C.dangerDim:C.okDim, color:cor, fontWeight:600 }}>{s.l}: {s.v||'—'}</span>
                  })}
                </div>
                {r.observacoes_conferencia && <div style={{ fontSize:11, color:C.muted, marginTop:4, fontStyle:'italic' }}>"{r.observacoes_conferencia}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
        {[
          { l:'Recebimentos',  v:kpis.total,       c:C.accent   },
          { l:'Fornecedores',  v:kpis.fornecedores,c:C.brand    },
          { l:'Não conformid.',v:kpis.nc_total,    c:C.danger   },
          { l:'Embalagem ruim',v:kpis.emb_nok,     c:C.warning  },
          { l:'No prazo',      v:kpis.prazo_ok,    c:C.success  },
          { l:'Fornec. críticos',v:kpis.criticos,  c:C.danger   },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.c}`, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{k.l}</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.brand, marginTop:4 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Score por fornecedor */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:10, flexWrap:'wrap' }}>
          <div>
            <CardTitle>Score de qualidade por fornecedor</CardTitle>
            <div style={{ fontSize:11, color:C.muted, marginTop:-12 }}>Baseado no formulário de recebimento do almoxarifado · Score = 40% prazo + 30% embalagem + 20% NF conforme + 10% sem NC</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar fornecedor..." />
            <select value={filtroNC} onChange={e => setFiltroNC(e.target.value)}
              style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 28px 7px 12px', fontSize:12, color:C.text, outline:'none' }}>
              <option value="">Todos</option>
              <option value="com_nc">Com não conformidade</option>
              <option value="sem_nc">Sem não conformidade</option>
              <option value="prazo_nok">Prazo irregular</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:C.muted }}>Carregando...</div>
        ) : (
          <DataTable
            columns={[
              { label:'Fornecedor',  render:r => <span style={{ fontWeight:500, cursor:'pointer', color:C.accent }} onClick={() => setDetalhe(r)}>{r.nome}</span> },
              { label:'Receb.',      render:r => <span style={{ color:C.muted }}>{r.total}</span> },
              { label:'Prazo %',     render:r => <div style={{ minWidth:100 }}><MiniBar value={r.prazo} total={r.total} color={r.pct_prazo>=80?C.success:C.danger} /></div> },
              { label:'Embalagem %', render:r => <div style={{ minWidth:100 }}><MiniBar value={r.emb}   total={r.total} color={r.pct_emb>=80?C.success:C.danger} /></div> },
              { label:'NF conforme', render:r => <ScoreBadge pct={r.pct_nf} /> },
              { label:'Não conform.',render:r => (
                <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700,
                  background:r.nc===0?C.okDim:C.dangerDim, color:r.nc===0?C.okText:C.dangerText }}>
                  {r.nc} ocorrência{r.nc!==1?'s':''}
                </span>
              )},
              { label:'Score', render:r => (
                <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:800,
                  background: r.score>=80?C.okDim:r.score>=60?C.warnDim:C.dangerDim,
                  color:      r.score>=80?C.okText:r.score>=60?C.warnText:C.dangerText,
                  border:`1px solid ${r.score>=80?C.success:r.score>=60?C.warning:C.danger}33` }}>
                  {r.score}
                </span>
              )},
              { label:'', render:r => (
                <button onClick={() => setDetalhe(r)} style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.accent, fontSize:11, cursor:'pointer' }}>
                  Ver histórico
                </button>
              )},
            ]}
            rows={filtrados}
            emptyMsg="Nenhum fornecedor encontrado"
          />
        )}
      </Card>

      {/* Não conformidades recentes */}
      <Card>
        <CardTitle>Últimas não conformidades registradas</CardTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {dados.filter(r => r.nao_conformidade === 'Sim' && r.observacoes_conferencia).slice(0,8).map((r,i) => (
            <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:C.dangerDim, border:`1px solid ${C.danger}22`, borderLeft:`4px solid ${C.danger}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:600, color:C.brand }}>{r.fornecedor?.trim()}</span>
                <span style={{ fontSize:11, color:C.muted }}>{fmtDate(r.data_recebimento)} · NF {r.nota_fiscal}</span>
              </div>
              <div style={{ fontSize:12, color:C.text }}>{r.observacoes_conferencia}</div>
              {r.responsavel_recebimento && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Conferido por: {r.responsavel_recebimento?.trim()}</div>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ padding:'10px 14px', background:'#F0F9FF', borderRadius:8, border:`1px solid #BAE6FD`, fontSize:11, color:'#0369A1', lineHeight:1.6 }}>
        💡 <strong>Automação futura:</strong> Configure um fluxo no <strong>Power Automate</strong> para que cada novo preenchimento do Forms dispare automaticamente para:
        {' '}<code>https://tocyzucfgwhvpfihakvj.supabase.co/functions/v1/recebimento-webhook</code>
        {' '}— os dados chegam em tempo real no portal sem precisar exportar planilha.
      </div>
    </div>
  )
}
