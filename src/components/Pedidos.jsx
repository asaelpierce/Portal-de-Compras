import { useState, useMemo } from 'react'
import { Card, SearchInput, Select, DataTable, Badge, Ellipsis, Pill, ModalMulta } from './UI'
import { C, STATUS_EMBARQUE, STATUS_ENTREGA } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, diasDiferenca, statusEmbarque, statusEntrega } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

function CompradorChip({ nome }) {
  if (!nome || nome.includes('identificado') || nome.includes('N/I')) return <span style={{ color: C.subtle, fontSize: 11 }}>—</span>
  const cor = CORES_COMP[nome] || C.accent
  const ini = nome.split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: cor + '20', border: `1.5px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: cor, flexShrink: 0 }}>{ini}</div>
      <span style={{ fontSize: 12, color: C.brand, fontWeight: 500, whiteSpace: 'nowrap' }}>{nome.split(' ')[0]}</span>
    </div>
  )
}

export default function Pedidos({ pedidos, onReload }) {
  const [search, setSearch] = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('')
  const [filtroEmbarque, setFiltroEmbarque] = useState('')
  const [filtroForn, setFiltroForn] = useState('')
  const [filtroComp, setFiltroComp] = useState('')
  const [modalPedido, setModalPedido] = useState(null)
  const [sortCol, setSortCol] = useState('prioridade')
  const [sortDir, setSortDir] = useState('asc')

  const fornecedores = useMemo(() => [...new Set(pedidos.map(p => p.fornecedor).filter(Boolean))].sort(), [pedidos])
  const compradores  = useMemo(() => [...new Set(pedidos.map(p => p.comprador).filter(Boolean))].sort(), [pedidos])

  const rows = useMemo(() => {
    let r = pedidos.map(p => ({
      ...p,
      _stEmbarque:  statusEmbarque(p.data_embarque, p.quantidade_pendente),
      _stEntrega:   statusEntrega(p.data_prevista_entrega, p.quantidade_pendente),
      _diasEntrega: diasDiferenca(p.data_prevista_entrega),
    })).filter(p => {
      if (filtroEntrega  && p._stEntrega  !== filtroEntrega)  return false
      if (filtroEmbarque && p._stEmbarque !== filtroEmbarque) return false
      if (filtroForn     && p.fornecedor  !== filtroForn)     return false
      if (filtroComp     && p.comprador   !== filtroComp)     return false
      if (search) {
        const q = search.toLowerCase()
        if (![(p.fornecedor||''),(p.descricao_produto||''),(p.comprador||''),String(p.numero_pedido||'')].some(v => v.toLowerCase().includes(q))) return false
      }
      return true
    })
    r.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') va = va.toLowerCase(), vb = (vb||'').toLowerCase()
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return r
  }, [pedidos, search, filtroEntrega, filtroEmbarque, filtroForn, filtroComp, sortCol, sortDir])

  const handleSort = (col) => { setSortDir(s => sortCol === col ? (s === 'asc' ? 'desc' : 'asc') : 'asc'); setSortCol(col) }
  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const alertas = rows.filter(r => r._stEmbarque === 'ALERTA').length
  const atrasados = rows.filter(r => r._stEntrega === 'ATRASADO').length

  const handleDecide = async (pedido, decisao) => {
    await supabase.from('alertas_multa').insert({
      numero_pedido: pedido.numero_pedido, fornecedor: pedido.fornecedor,
      codigo_produto: pedido.codigo_produto, data_embarque: pedido.data_embarque,
      decisao, decidido_em: new Date().toISOString(),
    })
    setModalPedido(null)
    onReload()
  }

  return (
    <>
      {modalPedido && <ModalMulta pedido={modalPedido} onDecide={handleDecide} onClose={() => setModalPedido(null)} />}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>Pedidos em aberto</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', gap: 12 }}>
              <span>{rows.length} itens</span>
              {atrasados > 0 && <span style={{ color: C.danger, fontWeight: 600 }}>⚠ {atrasados} atrasados</span>}
              {alertas > 0  && <span style={{ color: C.warning, fontWeight: 600 }}>🚚 {alertas} verificar embarque</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, comprador..." />
            <Select value={filtroEntrega} onChange={setFiltroEntrega} options={[
              { value: '', label: 'Status entrega' },
              { value: 'ATRASADO',  label: '🔴 Atrasado' },
              { value: 'EM_BREVE',  label: '🟡 Vence em breve' },
              { value: 'NO_PRAZO',  label: '🟢 No prazo' },
              { value: 'SEM_DATA',  label: '⚪ Sem data' },
            ]} />
            <Select value={filtroEmbarque} onChange={setFiltroEmbarque} options={[
              { value: '', label: 'Status embarque' },
              { value: 'ALERTA',   label: '🟠 Verificar' },
              { value: 'EM_BREVE', label: '🟡 Em breve' },
              { value: 'NO_PRAZO', label: '🟢 No prazo' },
              { value: 'SEM_DATA', label: '⚪ Sem data' },
            ]} />
            <Select value={filtroComp} onChange={setFiltroComp} options={[
              { value: '', label: 'Todos compradores' },
              ...compradores.map(c => ({ value: c, label: c }))
            ]} />
            <Select value={filtroForn} onChange={setFiltroForn} options={[
              { value: '', label: 'Todos fornecedores' },
              ...fornecedores.map(f => ({ value: f, label: f.length > 30 ? f.slice(0, 30) + '…' : f }))
            ]} />
          </div>
        </div>

        <DataTable
          columns={[
            { label: `Pedido${sortIcon('numero_pedido')}`,          key: 'numero_pedido', tdStyle: { fontWeight: 700, color: C.accent, cursor: 'pointer' }, onHeaderClick: () => handleSort('numero_pedido') },
            { label: 'Comprador',   render: r => <CompradorChip nome={r.comprador} /> },
            { label: 'Fornecedor',  render: r => <Ellipsis maxWidth={160}>{r.fornecedor}</Ellipsis> },
            { label: 'Produto',     render: r => <Ellipsis maxWidth={200} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
            { label: 'Qtd pedida',  render: r => <span style={{ color: C.muted }}>{fmtInt(r.quantidade_pedida)}</span> },
            { label: 'Pendente',    render: r => <span style={{ fontWeight: 600, color: parseFloat(r.quantidade_pendente) > 0 ? C.warning : C.success }}>{fmtInt(r.quantidade_pendente)}</span> },
            { label: 'Embarque',    render: r => (
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{fmtDate(r.data_embarque)}</div>
                <Badge cfg={STATUS_EMBARQUE[r._stEmbarque]} />
                {r._stEmbarque === 'ALERTA' && (
                  <button onClick={() => setModalPedido(r)} style={{ display: 'block', marginTop: 3, fontSize: 10, padding: '2px 7px', borderRadius: 4, border: `1px solid ${C.warning}`, background: C.warnDim, color: C.warnText, cursor: 'pointer' }}>Verificar →</button>
                )}
              </div>
            )},
            { label: 'Prev. entrega', render: r => (
              <div>
                <div style={{ fontSize: 11, marginBottom: 2, color: r._diasEntrega > 0 ? C.danger : C.text }}>{fmtDate(r.data_prevista_entrega)}</div>
                <Badge cfg={STATUS_ENTREGA[r._stEntrega]} />
              </div>
            )},
            { label: `Atraso${sortIcon('dias_atraso_entrega')}`, render: r => {
              const d = r._diasEntrega
              if (!d && d !== 0) return <span style={{ color: C.subtle }}>—</span>
              return <span style={{ color: d > 0 ? C.danger : C.success, fontWeight: 700, fontSize: 13 }}>{d > 0 ? `+${d}d` : `${d}d`}</span>
            }, onHeaderClick: () => handleSort('dias_atraso_entrega') },
            { label: 'Data pedido', render: r => <span style={{ color: C.muted, fontSize: 11 }}>{fmtDate(r.data_pedido)}</span> },
            { label: 'Projeto',     render: r => <Pill>{r.projeto}</Pill> },
            { label: 'Valor',       render: r => <span style={{ fontWeight: 600, fontSize: 12 }}>{fmtCurrency(r.valor_item)}</span> },
          ]}
          rows={rows}
          emptyMsg="Nenhum pedido encontrado"
        />
      </Card>
    </>
  )
}
