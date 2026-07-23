import { useState, useMemo } from 'react'
import { Card, CardTitle, DataTable, SearchInput, Select, Badge, Ellipsis, Pill } from './UI'
import { C, STATUS_ENTREGA, STATUS_EMBARQUE } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, statusEntrega, statusEmbarque, diasDiferenca } from '../lib/utils'

const PRIORIDADE_LABEL = {
  1: { label: 'Embarque atrasado', color: C.amberText, bg: C.amberDim },
  2: { label: 'Entrega atrasada',  color: C.dangerText, bg: C.dangerDim },
  3: { label: 'Embarca em breve',  color: C.warnText, bg: C.warnDim },
  4: { label: 'Entrega em breve',  color: C.warnText, bg: C.warnDim },
  5: { label: 'No prazo',          color: C.okText, bg: C.okDim },
}

export default function FollowUp({ pedidos, nfs }) {
  const [search, setSearch]               = useState('')
  const [filtroForn, setFiltroForn]       = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState('')
  const [filtroComp, setFiltroComp]       = useState('')
  const [filtroNF, setFiltroNF]           = useState('')

  const fornecedores = useMemo(() =>
    [...new Set(pedidos.map(p => p.fornecedor).filter(Boolean))].sort(),
    [pedidos]
  )
  const compradores = useMemo(() =>
    [...new Set(pedidos.map(p => p.comprador).filter(Boolean))].sort(),
    [pedidos]
  )

  // Enriquece pedidos com status calculado e vínculo NF
  const rows = useMemo(() => {
    return pedidos
      .map(p => {
        const nfVinculada = nfs.find(n =>
          n.cod_fornecedor == p.cod_fornecedor &&
          n.codigo_produto == p.codigo_produto &&
          Math.abs((parseFloat(n.valor_item) || 0) - (parseFloat(p.valor_item) || 0)) < 0.5
        )
        return {
          ...p,
          _stEmbarque: statusEmbarque(p.data_embarque, p.quantidade_pendente),
          _stEntrega:  statusEntrega(p.data_prevista_entrega, p.quantidade_pendente),
          _diasEntrega: diasDiferenca(p.data_prevista_entrega),
          _diasEmbarque: diasDiferenca(p.data_embarque),
          _nfRecebida: nfVinculada || null,
          _recebido: !!nfVinculada,
        }
      })
      .filter(p => {
        if (filtroPrioridade && String(p.prioridade) !== filtroPrioridade) return false
        if (filtroForn && p.fornecedor !== filtroForn) return false
        if (filtroComp && p.comprador !== filtroComp) return false
        if (filtroNF === 'com_nf' && !p._recebido) return false
        if (filtroNF === 'sem_nf' &&  p._recebido) return false
        if (search) {
          const q = search.toLowerCase()
          if (![(p.fornecedor || ''), (p.descricao_produto || ''), String(p.numero_pedido || '')].some(v => v.toLowerCase().includes(q)))
            return false
        }
        return true
      })
  }, [pedidos, nfs, search, filtroForn, filtroPrioridade])

  // Totais por situação
  const totais = useMemo(() => ({
    atrasadosEmbarque: rows.filter(r => r._stEmbarque === 'ALERTA').length,
    atrasadosEntrega:  rows.filter(r => r._stEntrega === 'ATRASADO').length,
    emBreve:           rows.filter(r => r._stEntrega === 'EM_BREVE' || r._stEmbarque === 'EM_BREVE').length,
    recebidos:         rows.filter(r => r._recebido).length,
  }), [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs do follow-up */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Embarques a verificar', value: totais.atrasadosEmbarque, color: C.amber,   icon: '🚚' },
          { label: 'Entregas atrasadas',    value: totais.atrasadosEntrega,  color: C.danger,  icon: '🔴' },
          { label: 'Vencem em breve',       value: totais.emBreve,           color: C.warning, icon: '⏰' },
          { label: 'Itens recebidos',        value: totais.recebidos,         color: C.success, icon: '✅' },
        ].map((k, i) => (
          <div key={i} style={{
            background: C.surface, borderRadius: 10, padding: '16px 18px',
            border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{k.label}</span>
              <span style={{ fontSize: 18 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: C.brand }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Follow-up de pedidos</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{rows.length} itens em acompanhamento</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
            <Select value={filtroPrioridade} onChange={setFiltroPrioridade} options={[
              { value: '', label: 'Todas as prioridades' },
              { value: '1', label: '🟠 Embarque atrasado' },
              { value: '2', label: '🔴 Entrega atrasada' },
              { value: '3', label: '🟡 Embarca em breve' },
              { value: '4', label: '🟡 Entrega em breve' },
              { value: '5', label: '🟢 No prazo' },
            ]} />
            <Select value={filtroComp} onChange={setFiltroComp} options={[
              { value: '', label: 'Todos compradores' },
              ...compradores.map(c => ({ value: c, label: c.split(' ')[0] }))
            ]} />
            <Select value={filtroNF} onChange={setFiltroNF} options={[
              { value: '',       label: 'Todas as NFs' },
              { value: 'com_nf', label: '✅ NF recebida' },
              { value: 'sem_nf', label: '❌ Aguardando NF' },
            ]} />
            <Select value={filtroForn} onChange={setFiltroForn} options={[
              { value: '', label: 'Todos os fornecedores' },
              ...fornecedores.map(f => ({ value: f, label: f.length > 30 ? f.slice(0, 30) + '…' : f }))
            ]} />
          </div>
        </div>

        <DataTable
          columns={[
            {
              label: 'Prioridade',
              render: r => {
                const cfg = PRIORIDADE_LABEL[r.prioridade] || PRIORIDADE_LABEL[5]
                return (
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                )
              }
            },
            { label: 'Pedido', key: 'numero_pedido', tdStyle: { fontWeight: 700, color: C.accent } },
            { label: 'Fornecedor', render: r => <Ellipsis maxWidth={170}>{r.fornecedor}</Ellipsis> },
            { label: 'Produto', render: r => <Ellipsis maxWidth={200} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
            { label: 'Qtd pedida', render: r => <span style={{ color: C.muted }}>{fmtInt(r.quantidade_pedida)}</span> },
            { label: 'Pendente', render: r => <span style={{ fontWeight: 600, color: parseFloat(r.quantidade_pendente) > 0 ? C.warning : C.success }}>{fmtInt(r.quantidade_pendente)}</span> },
            {
              label: 'Data embarque',
              render: r => (
                <div>
                  <div style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(r.data_embarque)}</div>
                  <Badge cfg={STATUS_EMBARQUE[r._stEmbarque]} />
                </div>
              )
            },
            {
              label: 'Prev. entrega',
              render: r => (
                <div>
                  <div style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(r.data_prevista_entrega)}</div>
                  <Badge cfg={STATUS_ENTREGA[r._stEntrega]} />
                </div>
              )
            },
            {
              label: 'Dias (entrega)',
              render: r => {
                const d = r._diasEntrega
                if (d == null) return <span style={{ color: C.subtle }}>—</span>
                return <span style={{ color: d > 0 ? C.danger : C.success, fontWeight: 600 }}>{d > 0 ? `+${d}` : d}</span>
              }
            },
            {
              label: 'NF recebida',
              render: r => r._nfRecebida
                ? <span style={{ background: C.okDim, color: C.okText, border: `1px solid ${C.success}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>✓ {r._nfRecebida.numero_nf}</span>
                : <span style={{ color: C.muted, fontSize: 11 }}>Aguardando</span>
            },
            { label: 'Data pedido', render: r => <span style={{ color: C.muted, whiteSpace: 'nowrap', fontSize: 11 }}>{fmtDate(r.data_pedido)}</span> },
            { label: 'Projeto', render: r => <Pill>{r.projeto}</Pill> },
            { label: 'Valor', render: r => <span style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtCurrency(r.valor_item)}</span> },
          ]}
          rows={rows}
          emptyMsg="Nenhum pedido encontrado com os filtros selecionados"
        />
      </Card>
    </div>
  )
}
