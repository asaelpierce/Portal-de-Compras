import { useState, useMemo } from 'react'
import { Card, SearchInput, Select, DataTable, Ellipsis, Pill } from './UI'
import { C, SITUACAO_ENTREGA } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, cruzarOCxNF } from '../lib/utils'

export function NFsView({ nfs }) {
  const [search, setSearch] = useState('')
  const [filtroForn, setFiltroForn] = useState('')

  const fornecedores = useMemo(() =>
    [...new Set(nfs.map(n => n.fornecedor).filter(Boolean))].sort(), [nfs])

  const rows = useMemo(() => nfs.filter(n => {
    if (filtroForn && n.fornecedor !== filtroForn) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(n.fornecedor || ''), (n.descricao_produto || ''), String(n.numero_nf || '')].some(v => v.toLowerCase().includes(q)))
        return false
    }
    return true
  }), [nfs, search, filtroForn])

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.textStrong }}>NFs de entrada recebidas</div>
          <div style={{ fontSize: 12, color: C.subtle, marginTop: 2 }}>{rows.length} registros</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar NF, fornecedor..." />
          <Select value={filtroForn} onChange={setFiltroForn} options={[
            { value: '', label: 'Todos os fornecedores' },
            ...fornecedores.map(f => ({ value: f, label: f.length > 32 ? f.slice(0, 32) + '…' : f }))
          ]} />
        </div>
      </div>
      <DataTable
        columns={[
          { label: 'NF',              key: 'numero_nf',          tdStyle: { fontWeight: 700, color: C.accentText } },
          { label: 'Fornecedor',      render: r => <Ellipsis maxWidth={170}>{r.fornecedor}</Ellipsis> },
          { label: 'Produto',         render: r => <Ellipsis maxWidth={220} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
          { label: 'Qtd recebida',    render: r => fmtInt(r.quantidade_recebida) },
          { label: 'Data emissão',    render: r => <span style={{ whiteSpace: 'nowrap', color: C.muted }}>{fmtDate(r.data_emissao)}</span> },
          { label: 'Data recebimento',render: r => <span style={{ whiteSpace: 'nowrap', color: C.okText }}>{fmtDate(r.data_recebimento)}</span> },
          { label: 'Valor item',      render: r => fmtCurrency(r.valor_item) },
          { label: 'Valor NF',        render: r => <span style={{ fontWeight: 600, color: C.accentText }}>{fmtCurrency(r.valor_total_nf)}</span> },
          { label: 'Projeto',         render: r => <Pill>{r.projeto}</Pill> },
        ]}
        rows={rows}
      />
    </Card>
  )
}

export function CruzamentoView({ pedidos, nfs }) {
  const [search, setSearch] = useState('')

  const cruzado = useMemo(() => cruzarOCxNF(pedidos, nfs), [pedidos, nfs])

  const vinculados  = cruzado.filter(r => r.nf_vinculada).length
  const semNF       = cruzado.length - vinculados
  const noPrazo     = cruzado.filter(r => r.situacao_entrega === 'NO_PRAZO').length
  const comAtraso   = cruzado.filter(r => r.situacao_entrega === 'ATRASO').length

  const rows = useMemo(() => {
    if (!search) return cruzado
    const q = search.toLowerCase()
    return cruzado.filter(r =>
      [(r.fornecedor || ''), (r.descricao_produto || ''), String(r.numero_pedido || '')].some(v => v.toLowerCase().includes(q))
    )
  }, [cruzado, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Com NF vinculada',     value: vinculados, color: C.success    },
          { label: 'Sem NF localizada',    value: semNF,      color: C.danger     },
          { label: 'Recebidos no prazo',   value: noPrazo,    color: C.accentText },
          { label: 'Recebidos com atraso', value: comAtraso,  color: C.warning    },
        ].map((s, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textStrong }}>Cruzamento inteligente OC × NF</div>
            <div style={{ fontSize: 12, color: C.subtle, marginTop: 2 }}>Vinculação por fornecedor + produto + valor (tolerância R$ 0,50)</div>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." />
        </div>
        <DataTable
          columns={[
            { label: 'Pedido',           key: 'numero_pedido',        tdStyle: { fontWeight: 700, color: C.accentText, whiteSpace: 'nowrap' } },
            { label: 'Fornecedor',       render: r => <Ellipsis maxWidth={160}>{r.fornecedor}</Ellipsis> },
            { label: 'Produto',          render: r => <Ellipsis maxWidth={200} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
            { label: 'Data embarque',    render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.data_embarque)}</span> },
            { label: 'Prev. entrega',    render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.data_prevista_entrega)}</span> },
            {
              label: 'NF vinculada',
              render: r => r.nf_vinculada
                ? <span style={{ background: '#1E3A5F', border: `1px solid ${C.accentDim}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, color: C.accentText, fontWeight: 700 }}>{r.nf_vinculada.numero_nf}</span>
                : <span style={{ color: C.subtle }}>—</span>
            },
            { label: 'Data recebimento', render: r => r.nf_vinculada ? <span style={{ whiteSpace: 'nowrap', color: C.okText }}>{fmtDate(r.nf_vinculada.data_recebimento)}</span> : '—' },
            {
              label: 'Situação entrega',
              render: r => {
                const cfg = SITUACAO_ENTREGA[r.situacao_entrega]
                return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              }
            },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  )
}
