import { useMemo, useState } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt } from '../lib/utils'

export function NFsView({ nfs }) {
  const [search, setSearch] = useState('')

  const agrupadas = useMemo(() => {
    const map = {}
    nfs.forEach(n => {
      const k = String(n.numero_nf)
      if (!map[k]) map[k] = { numero_nf: n.numero_nf, fornecedor: n.fornecedor, data_recebimento: n.data_recebimento, itens: 0, valor_total: 0, numero_pedido_oc: n.numero_pedido_oc }
      map[k].itens++
      map[k].valor_total += parseFloat(n.valor_item) || 0
    })
    return Object.values(map).sort((a, b) => new Date(b.data_recebimento) - new Date(a.data_recebimento))
  }, [nfs])

  const filtradas = agrupadas.filter(n => {
    if (!search) return true
    const q = search.toLowerCase()
    return [(n.fornecedor||''), String(n.numero_nf), String(n.numero_pedido_oc||'')].some(v => v.toLowerCase().includes(q))
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:13, color:C.muted }}>{filtradas.length} notas fiscais</div>
        <SearchInput value={search} onChange={setSearch} placeholder="NF, fornecedor, pedido..." />
      </div>
      <Card>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'#F9FAFB' }}>
              {['NF','Fornecedor','Pedido OC','Itens','Recebimento','Valor total'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:C.muted, fontWeight:600, fontSize:10, textTransform:'uppercase', borderBottom:`2px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((n, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${C.border}`, background: i%2 ? '#FAFAFA' : C.surface }}>
                <td style={{ padding:'10px 12px', fontWeight:700, color:C.accent }}>{n.numero_nf}</td>
                <td style={{ padding:'10px 12px' }}><Ellipsis maxWidth={200}>{n.fornecedor}</Ellipsis></td>
                <td style={{ padding:'10px 12px', fontWeight:600, color: n.numero_pedido_oc ? C.success : C.subtle }}>
                  {n.numero_pedido_oc ? `#${n.numero_pedido_oc}` : '—'}
                </td>
                <td style={{ padding:'10px 12px', color:C.muted }}>{n.itens} {n.itens===1?'item':'itens'}</td>
                <td style={{ padding:'10px 12px', color:C.okText, fontWeight:500, whiteSpace:'nowrap' }}>{fmtDate(n.data_recebimento)}</td>
                <td style={{ padding:'10px 12px', fontWeight:700 }}>{fmtCurrency(n.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function CruzamentoView({ pedidos, nfs }) {
  const [search, setSearch]     = useState('')
  const [filtroStatus, setFiltro] = useState('')
  const [expandido, setExpandido] = useState(null)

  // Cruzamento 100% preciso via numero_pedido_oc (TGFVAR)
  const cruzamento = useMemo(() => {
    // Índice de NFs por número de pedido OC
    const nfsPorPedido = {}
    nfs.forEach(n => {
      if (!n.numero_pedido_oc) return
      const k = String(n.numero_pedido_oc)
      if (!nfsPorPedido[k]) nfsPorPedido[k] = []
      nfsPorPedido[k].push(n)
    })

    // Deduplica pedidos por numero_pedido
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = { ...p, itens: [] }
      map[k].itens.push(p)
    })

    return Object.values(map).map(p => {
      const nfsVinculadas = nfsPorPedido[String(p.numero_pedido)] || []
      const qtdRecebida   = nfsVinculadas.reduce((s, n) => s + (parseFloat(n.quantidade_recebida) || 0), 0)
      const vlrRecebido   = nfsVinculadas.reduce((s, n) => s + (parseFloat(n.valor_item) || 0), 0)
      const ultimaNF      = [...nfsVinculadas].sort((a, b) => new Date(b.data_recebimento) - new Date(a.data_recebimento))[0]
      const nfsUnicas     = [...new Map(nfsVinculadas.map(n => [n.numero_nf, n])).values()]

      return {
        pedido:       p,
        nfs:          nfsUnicas,
        totalNFs:     nfsUnicas.length,
        qtdRecebida,
        vlrRecebido,
        ultimaNF,
        vinculado:    nfsUnicas.length > 0,
      }
    }).sort((a, b) => a.vinculado - b.vinculado || 0)
  }, [pedidos, nfs])

  const kpis = useMemo(() => ({
    total:       cruzamento.length,
    comNF:       cruzamento.filter(c => c.vinculado).length,
    semNF:       cruzamento.filter(c => !c.vinculado).length,
    vlrRecebido: cruzamento.reduce((s, c) => s + c.vlrRecebido, 0),
    totalNFs:    nfs.length,
  }), [cruzamento, nfs])

  const filtrados = useMemo(() => cruzamento.filter(c => {
    if (filtroStatus === 'com_nf' && !c.vinculado)  return false
    if (filtroStatus === 'sem_nf' &&  c.vinculado)  return false
    if (search) {
      const q = search.toLowerCase()
      if (![(c.pedido.fornecedor||''),(c.pedido.descricao_produto||''),String(c.pedido.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [cruzamento, filtroStatus, search])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        {[
          { label:'Pedidos em aberto', value:kpis.total,       color:C.accent  },
          { label:'Com NF vinculada',  value:kpis.comNF,       color:C.success },
          { label:'Sem NF',            value:kpis.semNF,       color:C.danger  },
          { label:'NFs recebidas',     value:kpis.totalNFs,    color:C.accent  },
          { label:'Valor recebido',    value:fmtCurrency(kpis.vlrRecebido), color:C.brand, small:true },
        ].map((k,i) => (
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
            <div style={{ fontSize:k.small?15:24, fontWeight:800, color:C.brand, marginTop:4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ padding:'8px 14px', background:C.okDim, borderRadius:8, border:`1px solid ${C.success}33`, fontSize:11, color:C.okText }}>
        ✅ <strong>Vínculo via TGFVAR</strong> — cruzamento 100% preciso pelo campo de origem do documento no Sankhya. Sem aproximações por fornecedor ou produto.
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
        <Select value={filtroStatus} onChange={setFiltro} options={[
          { value:'',       label:'Todos' },
          { value:'com_nf', label:'✅ Com NF vinculada' },
          { value:'sem_nf', label:'❌ Sem NF' },
        ]} />
      </div>

      {/* Tabela */}
      <Card>
        <CardTitle>{filtrados.length} pedidos em aberto</CardTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtrados.map((c, i) => {
            const aberto = expandido === i
            const cor = c.vinculado ? C.success : C.danger

            return (
              <div key={i} style={{ border:`1px solid ${cor}22`, borderLeft:`4px solid ${cor}`, borderRadius:10, overflow:'hidden' }}>
                <div
                  onClick={() => c.nfs.length > 0 && setExpandido(aberto ? null : i)}
                  style={{
                    display:'grid', gridTemplateColumns:'120px 1fr 140px 100px 110px 100px 100px',
                    gap:10, padding:'11px 14px', alignItems:'center',
                    background: aberto ? '#F0F4FF' : i%2===0 ? C.surface : '#FAFAFA',
                    cursor: c.nfs.length > 0 ? 'pointer' : 'default',
                  }}
                >
                  {/* Pedido */}
                  <div>
                    <span style={{ fontSize:11, color:C.muted }}>{c.nfs.length>0?(aberto?'▼':'▶'):' '}</span>
                    <span style={{ fontWeight:800, color:C.accent, marginLeft:4 }}>#{c.pedido.numero_pedido}</span>
                  </div>

                  {/* Fornecedor */}
                  <div>
                    <Ellipsis maxWidth={200}>{c.pedido.fornecedor}</Ellipsis>
                    <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{c.pedido.comprador?.split(' ')[0]}</div>
                  </div>

                  {/* Status */}
                  <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                    background: c.vinculado ? C.okDim : C.dangerDim,
                    color: c.vinculado ? C.okText : C.dangerText,
                    whiteSpace:'nowrap' }}>
                    {c.vinculado ? `✅ ${c.totalNFs} NF${c.totalNFs>1?'s':''}` : '❌ Sem NF'}
                  </span>

                  {/* Última NF */}
                  <div style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>
                    {c.ultimaNF ? fmtDate(c.ultimaNF.data_recebimento) : '—'}
                  </div>

                  {/* Qtd recebida */}
                  <div style={{ fontSize:12, textAlign:'center' }}>
                    {c.qtdRecebida > 0
                      ? <span style={{ color:C.okText, fontWeight:600 }}>{fmtInt(c.qtdRecebida)}</span>
                      : <span style={{ color:C.subtle }}>—</span>
                    }
                  </div>

                  {/* Valor recebido */}
                  <div style={{ fontSize:12, fontWeight:600, color:C.brand }}>
                    {c.vlrRecebido > 0 ? fmtCurrency(c.vlrRecebido) : '—'}
                  </div>

                  {/* Valor pedido */}
                  <div style={{ fontSize:12, color:C.muted }}>
                    {fmtCurrency(c.pedido.valor_item)}
                  </div>
                </div>

                {/* NFs expandidas */}
                {aberto && c.nfs.length > 0 && (
                  <div style={{ background:'#F8FAFF', borderTop:`1px solid ${C.border}`, padding:'10px 14px 10px 32px' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                      NFs vinculadas — vínculo via TGFVAR (origem do documento)
                    </div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'#EEF2FF' }}>
                          {['NF','Produto','Qtd recebida','Valor','Recebimento'].map(h => (
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:C.muted, fontWeight:600, fontSize:10, textTransform:'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {c.nfs.map((n, j) => (
                          <tr key={j} style={{ borderBottom:`1px solid ${C.border}`, background: j%2?'#F5F7FF':'white' }}>
                            <td style={{ padding:'7px 10px', fontWeight:700, color:C.accent }}>{n.numero_nf}</td>
                            <td style={{ padding:'7px 10px', maxWidth:220 }}>
                              <span title={n.descricao_produto} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.descricao_produto}</span>
                            </td>
                            <td style={{ padding:'7px 10px', color:C.okText, fontWeight:600 }}>{fmtInt(n.quantidade_recebida)}</td>
                            <td style={{ padding:'7px 10px', fontWeight:600 }}>{fmtCurrency(n.valor_item)}</td>
                            <td style={{ padding:'7px 10px', color:C.muted, whiteSpace:'nowrap' }}>{fmtDate(n.data_recebimento)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          {filtrados.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:C.subtle }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
              <div>Nenhum resultado encontrado</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
