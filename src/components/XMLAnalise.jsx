import { useState, useMemo, useEffect } from 'react'
import { Card, CardTitle, DataTable, Ellipsis, Btn } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://tocyzucfgwhvpfihakvj.supabase.co'

const CONFIANCA = {
  ALTA:           { cor: C.success,  bg: C.okDim,     label: 'Alta confiança',  icon: '✅' },
  MEDIA:          { cor: C.warning,  bg: C.warnDim,   label: 'Média confiança', icon: '🟡' },
  BAIXA:          { cor: C.danger,   bg: C.dangerDim, label: 'Baixa confiança', icon: '🔴' },
  NAO_ENCONTRADO: { cor: C.subtle,   bg: '#F3F4F6',   label: 'Sem match',       icon: '❓' },
}

const TIPO_MATCH = {
  JANELA_DATA:    { label: 'Janela de data', icon: '📅' },
  VALOR:          { label: 'Valor exato',    icon: '💰' },
  PARCIAL:        { label: 'Valor parcial',  icon: '📦' },
  NAO_ENCONTRADO: { label: 'Sem match',      icon: '❌' },
}

const DECISAO = {
  PENDENTE:   { cor: C.warning, bg: C.warnDim,   label: 'Pendente'   },
  CONFIRMADO: { cor: C.success, bg: C.okDim,     label: 'Confirmado' },
  REJEITADO:  { cor: C.danger,  bg: C.dangerDim, label: 'Rejeitado'  },
}

async function chamarFuncao(slug) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  })
  return r.json()
}

export default function XMLAnalise() {
  const [analises, setAnalises]       = useState([])
  const [xmlNotas, setXmlNotas]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [syncando, setSyncando]       = useState(false)
  const [analisando, setAnalisando]   = useState(false)
  const [tab, setTab]                 = useState('analises')
  const [detalhe, setDetalhe]         = useState(null)
  const [obsModal, setObsModal]       = useState('')
  const [msg, setMsg]                 = useState(null)
  const [searchXml, setSearchXml]     = useState('')
  const [filtroConf, setFiltroConf]   = useState('')

  const carregar = async () => {
    setLoading(true)
    const [{ data: a }, { data: x }] = await Promise.all([
      supabase.from('xml_analises').select('*').order('criado_em', { ascending: false }),
      supabase.from('xml_notas').select('*').order('data_emissao', { ascending: false }),
    ])
    setAnalises(a || [])
    setXmlNotas(x || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const handleSync = async () => {
    setSyncando(true)
    setMsg(null)
    const d = await chamarFuncao('supply-xml-sync')
    if (d.ok) { setMsg({ tipo: 'ok', texto: `✓ ${d.importados} XMLs importados do Sankhya` }); await carregar() }
    else setMsg({ tipo: 'erro', texto: '✗ Erro: ' + d.erro })
    setSyncando(false)
  }

  const handleAnalisar = async () => {
    setAnalisando(true)
    setMsg(null)
    const d = await chamarFuncao('supply-xml-analise')
    if (d.ok) { setMsg({ tipo: 'ok', texto: `🤖 ${d.analisados} XMLs analisados pelo GPT` }); await carregar() }
    else setMsg({ tipo: 'erro', texto: '✗ Erro: ' + d.erro })
    setAnalisando(false)
  }

  const decidir = async (id, decisao) => {
    await supabase.from('xml_analises').update({ decisao_usuario: decisao, observacao: obsModal }).eq('id', id)
    setDetalhe(null); setObsModal(''); carregar()
  }

  const kpis = useMemo(() => ({
    total:       xmlNotas.length,
    alta:        analises.filter(a => a.confianca === 'ALTA').length,
    media:       analises.filter(a => a.confianca === 'MEDIA').length,
    semMatch:    analises.filter(a => a.confianca === 'NAO_ENCONTRADO').length,
    pendentes:   analises.filter(a => a.decisao_usuario === 'PENDENTE' && a.confianca !== 'NAO_ENCONTRADO').length,
    confirmados: analises.filter(a => a.decisao_usuario === 'CONFIRMADO').length,
  }), [analises, xmlNotas])

  const analisesFiltradas = useMemo(() => analises.filter(a => {
    if (filtroConf && a.confianca !== filtroConf) return false
    if (searchXml) {
      const q = searchXml.toLowerCase()
      if (![(a.fornecedor_xml||''), String(a.nu_arquivo||''), String(a.pedido_sugerido||'')].some(v => v.toLowerCase().includes(q))) return false
    }
    return true
  }), [analises, filtroConf, searchXml])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Modal decisão */}
      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, marginBottom: 4 }}>Decisão de vinculação</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>XML #{detalhe.nu_arquivo} · {detalhe.fornecedor_xml}</div>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              {[
                ['Fornecedor XML',   detalhe.fornecedor_xml],
                ['Data emissão',     fmtDate(detalhe.data_emissao?.split('T')[0])],
                ['Valor nota',       fmtCurrency(detalhe.vlr_nota)],
                ['Pedido sugerido',  detalhe.pedido_sugerido ? `#${detalhe.pedido_sugerido}` : '—'],
                ['Confiança GPT',    `${CONFIANCA[detalhe.confianca]?.icon} ${CONFIANCA[detalhe.confianca]?.label}`],
                ['Tipo de match',    `${TIPO_MATCH[detalhe.tipo_match]?.icon || '❓'} ${TIPO_MATCH[detalhe.tipo_match]?.label || '—'}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ color: C.brand, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '10px 12px', background: C.accentDim, borderRadius: 8, fontSize: 12, color: C.accentText, lineHeight: 1.6 }}>
                <strong>🤖 Análise GPT-4o:</strong> {detalhe.motivo}
              </div>
            </div>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Observação</label>
            <textarea value={obsModal} onChange={e => setObsModal(e.target.value)} rows={2}
              placeholder="Opcional: justifique sua decisão..."
              style={{ width: '100%', marginTop: 6, marginBottom: 14, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', color: C.text, background: C.bg }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => decidir(detalhe.id, 'CONFIRMADO')}>✓ Confirmar</Btn>
              <Btn variant="danger" onClick={() => decidir(detalhe.id, 'REJEITADO')}>✗ Rejeitar</Btn>
              <Btn variant="outline" onClick={() => { setDetalhe(null); setObsModal('') }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>🤖 Analisador inteligente de XML</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Vinculação automática por janela de data + fornecedor + valor · GPT-4o-mini</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn variant="outline" onClick={carregar} disabled={loading}>{loading ? '↻ Carregando…' : '↻ Atualizar'}</Btn>
          <Btn variant="outline" onClick={handleSync} disabled={syncando}>
            {syncando ? '⏳ Importando…' : '📥 Importar XMLs do Sankhya'}
          </Btn>
          <Btn onClick={handleAnalisar} disabled={analisando || xmlNotas.length === 0}>
            {analisando ? '🤖 Analisando…' : '🤖 Analisar com GPT'}
          </Btn>
        </div>
      </div>

      {/* Mensagem de feedback */}
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: msg.tipo === 'ok' ? C.okDim : C.dangerDim, color: msg.tipo === 'ok' ? C.okText : C.dangerText, border: `1px solid ${msg.tipo === 'ok' ? C.success : C.danger}44` }}>
          {msg.texto}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'XMLs importados', value: kpis.total,       color: C.accent  },
          { label: 'Alta confiança',  value: kpis.alta,        color: C.success },
          { label: 'Média confiança', value: kpis.media,       color: C.warning },
          { label: 'Sem match',       value: kpis.semMatch,    color: C.danger  },
          { label: 'Aguard. revisão', value: kpis.pendentes,   color: C.warning },
          { label: 'Confirmados',     value: kpis.confirmados, color: C.success },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.brand, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}` }}>
        {[['analises', `🤖 Análises GPT (${analises.length})`], ['xmls', `📄 XMLs importados (${xmlNotas.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13,
            background: 'transparent', fontWeight: tab === id ? 600 : 400,
            color: tab === id ? C.accent : C.muted,
            borderBottom: tab === id ? `2px solid ${C.accent}` : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={searchXml} onChange={e => setSearchXml(e.target.value)} placeholder="Buscar fornecedor, XML, pedido..."
          style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none', flex: 1, color: C.text }} />
        {tab === 'analises' && (
          <select value={filtroConf} onChange={e => setFiltroConf(e.target.value)}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 12, outline: 'none', color: C.text }}>
            <option value="">Todas as confiançs</option>
            <option value="ALTA">✅ Alta</option>
            <option value="MEDIA">🟡 Média</option>
            <option value="BAIXA">🔴 Baixa</option>
            <option value="NAO_ENCONTRADO">❓ Sem match</option>
          </select>
        )}
      </div>

      {tab === 'analises' && (
        <Card>
          <CardTitle>{analisesFiltradas.length} análises · revisão humana necessária</CardTitle>
          {analisesFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>
                {xmlNotas.length === 0 ? 'Importe os XMLs primeiro' : 'Nenhuma análise ainda'}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {xmlNotas.length > 0 ? `${xmlNotas.length} XMLs prontos — clique em "Analisar com GPT"` : 'Clique em "Importar XMLs do Sankhya"'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analisesFiltradas.map((a, i) => {
                const conf = CONFIANCA[a.confianca] || CONFIANCA.NAO_ENCONTRADO
                const tipo = TIPO_MATCH[a.tipo_match]  || TIPO_MATCH.NAO_ENCONTRADO
                const dec  = DECISAO[a.decisao_usuario] || DECISAO.PENDENTE
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    background: conf.bg, border: `1px solid ${conf.cor}22`,
                    borderLeft: `4px solid ${conf.cor}`,
                    transition: 'opacity 0.15s',
                    opacity: a.decisao_usuario !== 'PENDENTE' ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: 22 }}>{conf.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: conf.cor }}>{conf.label}</span>
                        <span style={{ fontSize: 10, background: '#F3F4F6', color: C.muted, padding: '1px 7px', borderRadius: 10 }}>{tipo.icon} {tipo.label}</span>
                        <span style={{ fontSize: 10, background: dec.bg, color: dec.cor, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{dec.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.brand, fontWeight: 500 }}>
                        XML #{a.nu_arquivo} ·{' '}
                        <span style={{ color: C.muted, fontWeight: 400 }}>{a.fornecedor_xml}</span>
                        {a.pedido_sugerido && <span style={{ color: C.accent, marginLeft: 8, fontWeight: 600 }}>→ Pedido #{a.pedido_sugerido}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {fmtDate(a.data_emissao?.split('T')[0])} · {fmtCurrency(a.vlr_nota)}
                        {a.motivo && <span style={{ marginLeft: 8 }}>· {a.motivo}</span>}
                      </div>
                    </div>
                    {a.decisao_usuario === 'PENDENTE' && a.confianca !== 'NAO_ENCONTRADO' && (
                      <button onClick={() => { setDetalhe(a); setObsModal('') }} style={{
                        padding: '6px 14px', borderRadius: 7, border: `1px solid ${conf.cor}`,
                        background: 'white', color: conf.cor, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                        whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = conf.cor; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = conf.cor }}
                      >Revisar →</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {tab === 'xmls' && (
        <Card>
          <CardTitle>{xmlNotas.length} XMLs sem vinculação automática no Sankhya</CardTitle>
          <DataTable
            columns={[
              { label: 'Nº Arquivo',   key: 'nu_arquivo',    tdStyle: { fontWeight: 700, color: C.accent } },
              { label: 'Nº Nota XML',  key: 'num_nota_xml' },
              { label: 'Fornecedor',   render: r => <Ellipsis maxWidth={220}>{r.fornecedor_xml}</Ellipsis> },
              { label: 'Data emissão', render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.data_emissao?.split('T')[0])}</span> },
              { label: 'Valor nota',   render: r => <span style={{ fontWeight: 600 }}>{fmtCurrency(r.vlr_nota)}</span> },
            ]}
            rows={xmlNotas.filter(x => !searchXml || (x.fornecedor_xml||'').toLowerCase().includes(searchXml.toLowerCase()) || String(x.nu_arquivo||'').includes(searchXml))}
            emptyMsg="Nenhum XML importado. Clique em 'Importar XMLs do Sankhya'."
          />
        </Card>
      )}

      <div style={{ padding: '10px 14px', background: '#F0F9FF', borderRadius: 8, border: `1px solid #BAE6FD`, fontSize: 11, color: '#0369A1', lineHeight: 1.6 }}>
        💡 <strong>Fluxo:</strong> (1) <strong>Importar XMLs</strong> — puxa os XMLs com STATUS=0 do Sankhya · (2) <strong>Analisar com GPT</strong> — o GPT-4o-mini cruza cada XML com os pedidos por janela de data, fornecedor e valor · (3) <strong>Revisar</strong> — o comprador confirma ou rejeita cada sugestão.
        {' '}<strong>Secret necessário:</strong> <code>OPENAI_API_KEY</code> em Project Settings → Edge Functions → Secrets.
      </div>
    </div>
  )
}
