import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, SearchInput, Select, Ellipsis } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'

const TIPOS = {
  VALOR_NF: {
    icon: '✅',
    label: 'Encerrado pelo portal',
    cor: C.success,
    bg: C.okDim,
    descricao: 'A NF recebida cobre o valor do pedido. O portal encerrou automaticamente pois o lançamento no Sankhya pode estar diferente (ex: unidade errada, quantidade como conjunto).',
  },
  SUSPEITO: {
    icon: '⚠️',
    label: 'Vínculo suspeito',
    cor: C.warning,
    bg: C.warnDim,
    descricao: 'A NF vinculada cobre mais de 110% do valor do item. Provável erro de vinculação no Sankhya — verificar TGFVAR.',
  },
}

export default function Recebidos() {
  const [dados, setDados]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroComp, setFiltroComp] = useState('')
  const [filtroMes, setFiltroMes]   = useState('')
  const [expandido, setExpandido]   = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      let all = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('pedidos_encerrados')
          .select('*')
          .order('data_encerramento', { ascending: false })
          .range(from, from + pageSize - 1)
        if (error || !data || data.length === 0) break
        all = [...all, ...data]
        if (data.length < pageSize) break
        from += pageSize
      }
      setDados(all)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const compradores = useMemo(() => [...new Set(dados.map(d => d.comprador).filter(Boolean))].sort(), [dados])
  const meses = useMemo(() => {
    const set = new Set()
    dados.forEach(d => { if (d.data_encerramento) set.add(String(d.data_encerramento).slice(0, 7)) })
    return [...set].sort().reverse()
  }, [dados])
  const fmtMes = m => {
    const [y, mon] = m.split('-')
    return `${'Jan,Fev,Mar,Abr,Mai,Jun,Jul,Ago,Set,Out,Nov,Dez'.split(',')[parseInt(mon) - 1]}/${y}`
  }

  // Detecta suspeitos pelo motivo
  const dadosComTipo = useMemo(() => dados.map(d => ({
    ...d,
    _tipo: d.motivo_encerramento?.includes('SUSPEITO') ? 'SUSPEITO' : d.tipo_encerramento || 'VALOR_NF',
  })), [dados])

  const kpis = useMemo(() => ({
    total:    dadosComTipo.length,
    valor_nf: dadosComTipo.filter(d => d._tipo === 'VALOR_NF').length,
    suspeito: dadosComTipo.filter(d => d._tipo === 'SUSPEITO').length,
    valor_total: dadosComTipo.reduce((s, d) => s + (parseFloat(d.valor_item) || 0), 0),
  }), [dadosComTipo])

  const filtrados = useMemo(() => dadosComTipo.filter(d => {
    if (filtroTipo && d._tipo !== filtroTipo) return false
    if (filtroComp && d.comprador !== filtroComp) return false
    if (filtroMes  && !String(d.data_encerramento || '').startsWith(filtroMes)) return false
    if (search) {
      const q = search.toLowerCase()
      if (![(d.fornecedor||''),(d.descricao_produto||''),String(d.numero_pedido||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [dadosComTipo, filtroTipo, filtroComp, filtroMes, search])

  // Agrupa por pedido
  const porPedido = useMemo(() => {
    const map = {}
    filtrados.forEach(d => {
      const k = String(d.numero_pedido)
      if (!map[k]) map[k] = { numero_pedido: d.numero_pedido, fornecedor: d.fornecedor, comprador: d.comprador, data_encerramento: d.data_encerramento, _tipo: d._tipo, itens: [] }
      map[k].itens.push(d)
      // Pior tipo vence
      if (d._tipo === 'SUSPEITO') map[k]._tipo = 'SUSPEITO'
    })
    return Object.values(map).sort((a, b) => {
      if (a._tipo === 'SUSPEITO' && b._tipo !== 'SUSPEITO') return -1
      if (a._tipo !== 'SUSPEITO' && b._tipo === 'SUSPEITO') return 1
      return new Date(b.data_encerramento) - new Date(a.data_encerramento)
    })
  }, [filtrados])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>📥 Pedidos recebidos / encerrados</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
          Pedidos que saíram da lista de pendentes — com o motivo claro de cada encerramento
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total encerrados',      value: kpis.total,                         color: C.accent  },
          { label: 'Encerrados pelo portal', value: kpis.valor_nf,                     color: C.success },
          { label: 'Vínculo suspeito',       value: kpis.suspeito,                     color: C.warning },
          { label: 'Valor total recebido',   value: fmtCurrency(kpis.valor_total),     color: C.brand, small: true },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: k.small ? 16 : 26, fontWeight: 800, color: C.brand, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Legenda explicativa */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(TIPOS).map(([key, cfg]) => (
          <div key={key} style={{ flex: 1, minWidth: 280, padding: '12px 14px', background: cfg.bg, borderRadius: 8, border: `1px solid ${cfg.cor}33`, borderLeft: `4px solid ${cfg.cor}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: cfg.cor, marginBottom: 4 }}>{cfg.icon} {cfg.label}</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{cfg.descricao}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Pedido, fornecedor, produto..." />
        <Select value={filtroTipo} onChange={setFiltroTipo} options={[
          { value: '',         label: 'Todos os tipos' },
          { value: 'VALOR_NF', label: '✅ Encerrado pelo portal' },
          { value: 'SUSPEITO', label: '⚠️ Vínculo suspeito' },
        ]} />
        <Select value={filtroComp} onChange={setFiltroComp} options={[
          { value: '', label: 'Todos compradores' },
          ...compradores.map(c => ({ value: c, label: c.split(' ')[0] }))
        ]} />
        <Select value={filtroMes} onChange={setFiltroMes} options={[
          { value: '', label: 'Todos os meses' },
          ...meses.map(m => ({ value: m, label: fmtMes(m) }))
        ]} />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Carregando...</div>
      ) : porPedido.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Nenhum pedido encerrado encontrado</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Execute a sync para atualizar os dados</div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>{porPedido.length} pedidos encerrados · {filtrados.length} itens</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {porPedido.map((p, i) => {
              const cfg = TIPOS[p._tipo] || TIPOS.VALOR_NF
              const aberto = expandido === p.numero_pedido
              const valorTotal = p.itens.reduce((s, it) => s + (parseFloat(it.valor_item) || 0), 0)

              return (
                <div key={i} style={{ border: `1px solid ${cfg.cor}22`, borderLeft: `4px solid ${cfg.cor}`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* Linha do pedido */}
                  <div
                    onClick={() => setExpandido(aberto ? null : p.numero_pedido)}
                    style={{
                      display: 'grid', gridTemplateColumns: '110px 1fr 180px 100px 110px 80px',
                      gap: 12, padding: '11px 16px', alignItems: 'center',
                      background: aberto ? '#F0F4FF' : i % 2 === 0 ? C.surface : '#FAFAFA',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: C.muted }}>{aberto ? '▼' : '▶'}</span>
                      <span style={{ fontWeight: 800, color: C.accent, marginLeft: 4 }}>#{p.numero_pedido}</span>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</div>
                    </div>

                    <div>
                      <Ellipsis maxWidth={200}>{p.fornecedor}</Ellipsis>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{p.comprador?.split(' ')[0]}</div>
                    </div>

                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.cor, whiteSpace: 'nowrap' }}>
                      {cfg.icon} {cfg.label}
                    </span>

                    <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                      {fmtDate(p.data_encerramento)}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>
                      {fmtCurrency(valorTotal)}
                    </div>

                    <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>
                      {Math.round(p.itens.reduce((s, it) => s + (it.pct_valor_coberto || 0), 0) / p.itens.length)}% coberto
                    </div>
                  </div>

                  {/* Itens expandidos */}
                  {aberto && (
                    <div style={{ background: '#F8FAFF', borderTop: `1px solid ${C.border}`, padding: '12px 16px 12px 28px' }}>
                      {p.itens.map((it, j) => (
                        <div key={j} style={{ marginBottom: j < p.itens.length - 1 ? 12 : 0, paddingBottom: j < p.itens.length - 1 ? 12 : 0, borderBottom: j < p.itens.length - 1 ? `1px dashed ${C.border}` : 'none' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.brand, marginBottom: 4 }}>{it.descricao_produto}</div>
                          <div style={{ display: 'flex', gap: 20, fontSize: 11, color: C.muted, marginBottom: 6 }}>
                            <span>Cód. {it.codigo_produto}</span>
                            <span>Qtd pedida: <strong>{it.quantidade_pedida}</strong></span>
                            <span>Valor: <strong>{fmtCurrency(it.valor_item)}</strong></span>
                            <span>NF cobriu: <strong style={{ color: cfg.cor }}>{it.pct_valor_coberto}%</strong></span>
                          </div>
                          {/* Motivo em destaque */}
                          <div style={{ padding: '8px 12px', borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.cor}22`, fontSize: 12, color: C.brand, lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 700, color: cfg.cor }}>💬 Motivo: </span>
                            {it.motivo_encerramento}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
