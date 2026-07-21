import { useState, useMemo } from 'react'
import { Card, SearchInput, Select, DataTable, Badge, Ellipsis, Pill, ModalMulta } from './UI'
import { C, STATUS_EMBARQUE, STATUS_ENTREGA } from '../lib/tokens'
import { fmtDate, fmtCurrency, fmtInt, diasDiferenca, statusEmbarque, statusEntrega } from '../lib/utils'
import { supabase } from '../lib/supabase'

export default function Pedidos({ pedidos, onReload }) {
  const [search, setSearch] = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('')
  const [filtroEmbarque, setFiltroEmbarque] = useState('')
  const [filtroForn, setFiltroForn] = useState('')
  const [modalPedido, setModalPedido] = useState(null)

  const fornecedores = useMemo(() =>
    [...new Set(pedidos.map(p => p.fornecedor).filter(Boolean))].sort(),
    [pedidos]
  )

  const rows = useMemo(() => {
    return pedidos
      .map(p => ({
        ...p,
        _statusEmbarque: statusEmbarque(p.data_embarque, p.quantidade_pendente),
        _statusEntrega:  statusEntrega(p.data_prevista_entrega, p.quantidade_pendente),
        _diasEmbarque:   diasDiferenca(p.data_embarque),
        _diasEntrega:    diasDiferenca(p.data_prevista_entrega),
      }))
      .filter(p => {
        if (filtroEntrega  && p._statusEntrega  !== filtroEntrega)  return false
        if (filtroEmbarque && p._statusEmbarque !== filtroEmbarque) return false
        if (filtroForn     && p.fornecedor      !== filtroForn)     return false
        if (search) {
          const q = search.toLowerCase()
          if (![(p.fornecedor || ''), (p.descricao_produto || ''), String(p.numero_pedido || '')].some(v => v.toLowerCase().includes(q)))
            return false
        }
        return true
      })
  }, [pedidos, search, filtroEntrega, filtroEmbarque, filtroForn])

  const alertas = rows.filter(r => r._statusEmbarque === 'ALERTA').length

  const handleDecide = async (pedido, decisao) => {
    await supabase.from('alertas_multa').upsert({
      numero_pedido:    pedido.numero_pedido,
      fornecedor:       pedido.fornecedor,
      codigo_produto:   pedido.codigo_produto,
      data_embarque:    pedido.data_embarque,
      decisao,
      decidido_em:      new Date().toISOString(),
      observacao:       '',
    })
    setModalPedido(null)
    onReload()
  }

  return (
    <>
      {modalPedido && (
        <div style={{ marginBottom: 16 }}>
          <ModalMulta
            pedido={modalPedido}
            onDecide={handleDecide}
            onClose={() => setModalPedido(null)}
          />
        </div>
      )}

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textStrong }}>Pedidos em aberto</div>
            <div style={{ fontSize: 12, color: C.subtle, marginTop: 2 }}>
              {rows.length} itens pendentes
              {alertas > 0 && <span style={{ color: C.amberText, marginLeft: 8 }}>· {alertas} com alerta de embarque</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar pedido, fornecedor, produto..." />
            <Select value={filtroEntrega} onChange={setFiltroEntrega} options={[
              { value: '', label: 'Status entrega' },
              { value: 'ATRASADO',  label: 'Atrasada' },
              { value: 'EM_BREVE',  label: 'Em breve' },
              { value: 'NO_PRAZO',  label: 'No prazo' },
              { value: 'SEM_DATA',  label: 'Sem data' },
            ]} />
            <Select value={filtroEmbarque} onChange={setFiltroEmbarque} options={[
              { value: '', label: 'Status embarque' },
              { value: 'ALERTA',   label: 'Verificar embarque' },
              { value: 'EM_BREVE', label: 'Embarca em breve' },
              { value: 'NO_PRAZO', label: 'Embarque no prazo' },
              { value: 'SEM_DATA', label: 'Sem data embarque' },
            ]} />
            <Select value={filtroForn} onChange={setFiltroForn} options={[
              { value: '', label: 'Todos os fornecedores' },
              ...fornecedores.map(f => ({ value: f, label: f.length > 32 ? f.slice(0, 32) + '…' : f }))
            ]} />
          </div>
        </div>

        <DataTable
          columns={[
            { label: 'Pedido',         key: 'numero_pedido',        tdStyle: { fontWeight: 700, color: C.accentText, whiteSpace: 'nowrap' } },
            { label: 'Fornecedor',     render: r => <Ellipsis maxWidth={170}>{r.fornecedor}</Ellipsis> },
            { label: 'Produto',        render: r => <Ellipsis maxWidth={220} title={r.descricao_produto}>{r.descricao_produto}</Ellipsis> },
            { label: 'Qtd pedida',     render: r => <span style={{ color: C.muted }}>{fmtInt(r.quantidade_pedida)}</span> },
            { label: 'Pendente',       render: r => <span style={{ fontWeight: 600, color: parseFloat(r.quantidade_pendente) > 0 ? C.warnText : C.okText }}>{fmtInt(r.quantidade_pendente)}</span> },
            { label: 'Data pedido',    render: r => <span style={{ color: C.muted, whiteSpace: 'nowrap' }}>{fmtDate(r.data_pedido)}</span> },
            {
              label: 'Data embarque',
              render: r => (
                <div>
                  <div style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.data_embarque)}</div>
                  {r._statusEmbarque === 'ALERTA' && (
                    <button
                      onClick={() => setModalPedido(r)}
                      style={{
                        marginTop: 4, fontSize: 10, padding: '2px 8px',
                        borderRadius: 5, border: `1px solid ${C.amber}44`,
                        background: C.amberDim, color: C.amberText, cursor: 'pointer',
                      }}
                    >Verificar →</button>
                  )}
                </div>
              ),
            },
            { label: 'Status embarque', render: r => <Badge cfg={STATUS_EMBARQUE[r._statusEmbarque]} /> },
            { label: 'Prev. entrega',   render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.data_prevista_entrega)}</span> },
            { label: 'Status entrega',  render: r => <Badge cfg={STATUS_ENTREGA[r._statusEntrega]} /> },
            {
              label: 'Dias (entrega)',
              render: r => {
                const d = r._diasEntrega
                if (d == null) return <span style={{ color: C.subtle }}>—</span>
                return <span style={{ color: d > 0 ? C.danger : C.subtle, fontWeight: d > 0 ? 700 : 400 }}>{d > 0 ? `+${d}` : d}</span>
              }
            },
            { label: 'Projeto',   render: r => <Pill>{r.projeto}</Pill> },
            { label: 'Valor item', render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtCurrency(r.valor_item)}</span> },
          ]}
          rows={rows}
        />
      </Card>
    </>
  )
}
