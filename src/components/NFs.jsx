import { useMemo, useState } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt } from '../lib/utils'

export function NFsView({ nfs }) {
  const [search, setSearch]       = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroPed, setFiltroPed] = useState('')

  const meses = useMemo(() => {
    const set = new Set()
    nfs.forEach(n => { if (n.data_recebimento) set.add(String(n.data_recebimento).slice(0,7)) })
    return [...set].sort().reverse()
  }, [nfs])

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
    if (filtroMes && !String(n.data_recebimento||'').startsWith(filtroMes)) return false
    if (filtroPed === 'com_oc' && !n.numero_pedido_oc) return false
    if (filtroPed === 'sem_oc' &&  n.numero_pedido_oc) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(n.fornecedor||''), String(n.numero_nf), String(n.numero_pedido_oc||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  })

  const fmtMes = (m) => {
    const [y, mon] = m.split('-')
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${nomes[parseInt(mon)-1]}/${y}`
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
        <div style={{ fontSize:13, color:C.muted }}>{filtradas.length} notas fiscais</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="NF, fornecedor, pedido..." />
          <Select value={filtroMes} onChange={setFiltroMes} options={[
            { value:'', label:'Todos os meses' },
            ...meses.map(m => ({ value:m, label:fmtMes(m) }))
          ]} />
          <Select value={filtroPed} onChange={setFiltroPed} options={[
            { value:'',       label:'Todas as NFs' },
            { value:'com_oc', label:'✅ Com pedido vinculado' },
            { value:'sem_oc', label:'❌ Sem pedido vinculado' },
          ]} />
        </div>
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
  const [search, setSearch]         = useState('')
  const [filtroComp, setFiltroComp] = useState('')
  const [filtroAlerta, setFiltroAlerta] = useState('')
  const [expandido, setExpandido]   = useState(null)

  // Índice de NFs por pedido via TGFVAR
  const nfsPorPedido = useMemo(() => {
    const map = {}
    nfs.forEach(n => {
      if (!n.numero_pedido_oc) return
      const k = String(n.numero_pedido_oc)
      if (!map[k]) map[k] = []
      map[k].push(n)
    })
    return map
  }, [nfs])

  // Deduplica pedidos por numero_pedido
  const pedidosUnicos = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const k = String(p.numero_pedido)
      if (!map[k]) map[k] = { ...p, _itens: [] }
      map[k]._itens.push(p)
    })
    return Object.values(map)
  }, [pedidos])

  // Só os SEM NF vinculada
  const semNF = useMemo(() => {
    return pedidosUnicos
      .map(p => {
        const nfsVinculadas = nfsPorPedido[String(p.numero_pedido)] || []
        const qtdEntregue   = parseFloat(p.quantidade_entregue) || 0
        const qtdPendente   = parseFloat(p.quantidade_pendente) || 0
        // Alerta especial: Sankhya diz entregue mas sem NF
        const entregue_sem_nf = qtdEntregue > 0 && nfsVinculadas.length === 0
        return { ...p, nfsVinculadas, entregue_sem_nf }
      })
      .filter(p => p.nfsVinculadas.length === 0)
      .sort((a, b) => {
        // Entregue sem NF primeiro
        if (a.entregue_sem_nf && !b.entregue_sem_nf) return -1
        if (!a.entregue_sem_nf && b.entregue_sem_nf) return  1
        return (b.prioridade || 5) - (a.prioridade || 5)
      })
  }, [pedidosUnicos, nfsPorPedido])

  const kpis = useMemo(() => ({
    total:          semNF.length,
    entregue_sem_nf: semNF.filter(p => p.entregue_sem_nf).length,
    atrasados:       semNF.filter(p => p.prioridade <= 2).length,
    valor_exposto:   semNF.reduce((s, p) => s + (parseFloat(p.valor_item) || 0), 0),
  }), [semNF])

  const filtrados = useMemo(() => semNF.filter(p => {
    if (filtroComp  && p.comprador !== filtroComp)       return false
    if (filtroAlerta === 'entregue_sem_nf' && !p.entregue_sem_nf) return false
    if (filtroAlerta === 'atrasado' && p.prioridade > 2) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(p.fornecedor||''),(p.descricao_produto||''),String(p.numero_pedido)].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [semNF, filtroComp, filtroAlerta, search])

  const compradores = useMemo(() =>
    [...new Set(semNF.map(p => p.comprador).filter(Boolean))].sort(), [semNF])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Pedidos sem NF',      value: kpis.total,            color: C.accent  },
          { label: 'Entregue sem NF ⚠️',  value: kpis.entregue_sem_nf,  color: C.danger  },
          { label: 'Atrasados',           value: kpis.atrasados,         color: C.warning },
          { label: 'Valor exposto',       value: fmtCurrency(kpis.valor_exposto), color: C.brand, small: true },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: k.small ? 15 : 24, fontWeight: 800, color: C.brand, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Aviso entregue sem NF */}
      {kpis.entregue_sem_nf > 0 && (
        <div style={{ padding: '12px 16px', background: C.dangerDim, borderRadius: 8, border: `1px solid ${C.danger}44`, fontSize: 13, color: C.danger, fontWeight: 500 }}>
          ⚠️ <strong>{kpis.entregue_sem_nf} pedido{kpis.entregue_sem_nf > 1 ? 's' : ''}</strong> com quantidade entregue no Sankhya mas <strong>sem NF vinculada</strong> — verificar lançamento.
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
        <Select value={filtroAlerta} onChange={setFiltroAlerta} options={[
          { value: '',                label: 'Todos' },
          { value: 'entregue_sem_nf', label: '⚠️ Entregue sem NF' },
          { value: 'atrasado',        label: '🔴 Atrasados' },
        ]} />
        <Select value={filtroComp} onChange={setFiltroComp} options={[
          { value: '', label: 'Todos compradores' },
          ...compradores.map(c => ({ value: c, label: c.split(' ')[0] }))
        ]} />
      </div>

      {/* Tabela */}
      <Card>
        <CardTitle>{filtrados.length} pedidos em aberto sem nota fiscal vinculada</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Todos os pedidos têm NF vinculada!</div>
            </div>
          ) : filtrados.map((p, i) => {
            const corBorda = p.entregue_sem_nf ? C.danger : p.prioridade <= 2 ? C.warning : C.border

            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 130px 110px 90px 100px',
                gap: 12, padding: '11px 16px', alignItems: 'center',
                background: p.entregue_sem_nf ? C.dangerDim : i % 2 === 0 ? C.surface : '#FAFAFA',
                border: `1px solid ${corBorda}33`,
                borderLeft: `4px solid ${corBorda}`,
                borderRadius: 8,
              }}>
                <div>
                  <span style={{ fontWeight: 800, color: C.accent }}>#{p.numero_pedido}</span>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{p.comprador?.split(' ')[0]}</div>
                </div>

                <div>
                  <Ellipsis maxWidth={200}>{p.fornecedor}</Ellipsis>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{p.descricao_produto?.substring(0, 40)}</div>
                </div>

                <div style={{ fontSize: 11 }}>
                  {p.entregue_sem_nf ? (
                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: C.dangerDim, color: C.danger }}>
                      ⚠️ Entregue sem NF
                    </span>
                  ) : p.prioridade <= 2 ? (
                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: C.warnDim, color: C.warning }}>
                      🔴 Atrasado
                    </span>
                  ) : (
                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#F3F4F6', color: C.muted }}>
                      Aguardando NF
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                  <div>Qtd pedida: <strong>{fmtInt(p.quantidade_pedida)}</strong></div>
                  {p.entregue_sem_nf && <div style={{ color: C.danger }}>Entregue: <strong>{fmtInt(p.quantidade_entregue)}</strong></div>}
                </div>

                <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                  {fmtDate(p.data_prevista_entrega) || '—'}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, textAlign: 'right' }}>
                  {fmtCurrency(p.valor_item)}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
