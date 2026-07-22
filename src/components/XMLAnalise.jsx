import { useState, useMemo } from 'react'
import { Card, CardTitle, DataTable, Ellipsis, Btn } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CONFIANCA = {
  ALTA:           { cor: C.success,  bg: C.okDim,     label: 'Alta confiança',    icon: '✅' },
  MEDIA:          { cor: C.warning,  bg: C.warnDim,   label: 'Média confiança',   icon: '🟡' },
  BAIXA:          { cor: C.danger,   bg: C.dangerDim, label: 'Baixa confiança',   icon: '🔴' },
  NAO_ENCONTRADO: { cor: C.subtle,   bg: '#F3F4F6',   label: 'Não encontrado',    icon: '❓' },
}

const TIPO_MATCH = {
  CHAVE:          { label: 'Chave NFe',      icon: '🔑' },
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

export default function XMLAnalise() {
  const [analises, setAnalises]     = useState([])
  const [xmlNotas, setXmlNotas]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [tab, setTab]               = useState('analises')
  const [detalhe, setDetalhe]       = useState(null)
  const [obsModal, setObsModal]     = useState('')

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

  const disparar = async () => {
    setAnalisando(true)
    try {
      const r = await fetch(
        'https://tocyzucfgwhvpfihakvj.supabase.co/functions/v1/supply-xml-analise',
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      )
      const d = await r.json()
      if (d.ok) await carregar()
      else alert('Erro: ' + d.erro)
    } catch (e) { alert('Erro: ' + e.message) }
    setAnalisando(false)
  }

  const decidir = async (id, decisao) => {
    await supabase.from('xml_analises').update({ decisao_usuario: decisao, observacao: obsModal }).eq('id', id)
    setDetalhe(null)
    setObsModal('')
    carregar()
  }

  const kpis = useMemo(() => ({
    total:      xmlNotas.length,
    alta:       analises.filter(a => a.confianca === 'ALTA').length,
    media:      analises.filter(a => a.confianca === 'MEDIA').length,
    semMatch:   analises.filter(a => a.confianca === 'NAO_ENCONTRADO').length,
    pendentes:  analises.filter(a => a.decisao_usuario === 'PENDENTE').length,
    confirmados:analises.filter(a => a.decisao_usuario === 'CONFIRMADO').length,
  }), [analises, xmlNotas])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Modal de decisão */}
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
                ['Confiança',        `${CONFIANCA[detalhe.confianca]?.icon} ${CONFIANCA[detalhe.confianca]?.label}`],
                ['Tipo de match',    `${TIPO_MATCH[detalhe.tipo_match]?.icon} ${TIPO_MATCH[detalhe.tipo_match]?.label}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ color: C.brand, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '8px 10px', background: C.accentDim, borderRadius: 8, fontSize: 12, color: C.accentText, lineHeight: 1.5 }}>
                <strong>🤖 Análise GPT:</strong> {detalhe.motivo}
              </div>
            </div>

            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Observação</label>
            <textarea value={obsModal} onChange={e => setObsModal(e.target.value)} rows={2}
              placeholder="Opcional: justifique sua decisão..."
              style={{ width: '100%', marginTop: 6, marginBottom: 14, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', color: C.text, background: C.bg }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => decidir(detalhe.id, 'CONFIRMADO')}>✓ Confirmar vinculação</Btn>
              <Btn variant="danger" onClick={() => decidir(detalhe.id, 'REJEITADO')}>✗ Rejeitar</Btn>
              <Btn variant="outline" onClick={() => { setDetalhe(null); setObsModal('') }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>🤖 Analisador inteligente de XML</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Vinculação automática por janela de data + fornecedor + valor via GPT-4o</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outline" onClick={carregar} disabled={loading}>{loading ? 'Carregando…' : '↻ Atualizar'}</Btn>
          <Btn onClick={disparar} disabled={analisando}>
            {analisando ? '🤖 Analisando…' : '🤖 Executar análise GPT'}
          </Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'XMLs importados', value: kpis.total,       color: C.accent  },
          { label: 'Alta confiança',  value: kpis.alta,        color: C.success },
          { label: 'Média confiança', value: kpis.media,       color: C.warning },
          { label: 'Sem match',       value: kpis.semMatch,    color: C.danger  },
          { label: 'Pendentes',       value: kpis.pendentes,   color: C.warning },
          { label: 'Confirmados',     value: kpis.confirmados, color: C.success },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.brand, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}` }}>
        {[['analises', '🤖 Análises GPT'], ['xmls', '📄 Todos os XMLs']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13,
            background: 'transparent', fontWeight: tab === id ? 600 : 400,
            color: tab === id ? C.accent : C.muted,
            borderBottom: tab === id ? `2px solid ${C.accent}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'analises' && (
        <Card>
          <CardTitle>Sugestões de vinculação — revisão humana necessária</CardTitle>
          {analises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Nenhuma análise ainda</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Clique em "Executar análise GPT" para iniciar</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analises.map((a, i) => {
                const conf = CONFIANCA[a.confianca] || CONFIANCA.NAO_ENCONTRADO
                const tipo = TIPO_MATCH[a.tipo_match]  || TIPO_MATCH.NAO_ENCONTRADO
                const dec  = DECISAO[a.decisao_usuario] || DECISAO.PENDENTE
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    background: conf.bg + '80', border: `1px solid ${conf.cor}22`,
                    borderLeft: `4px solid ${conf.cor}`,
                  }}>
                    <span style={{ fontSize: 22 }}>{conf.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: conf.cor }}>{conf.label}</span>
                        <span style={{ fontSize: 10, background: '#F3F4F6', color: C.muted, padding: '1px 7px', borderRadius: 10 }}>{tipo.icon} {tipo.label}</span>
                        <span style={{ fontSize: 10, background: dec.bg, color: dec.cor, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{dec.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.brand, fontWeight: 500 }}>
                        XML #{a.nu_arquivo} · <span style={{ color: C.muted }}>{a.fornecedor_xml}</span>
                        {a.pedido_sugerido && <span style={{ color: C.accent, marginLeft: 8 }}>→ Pedido #{a.pedido_sugerido}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {fmtDate(a.data_emissao?.split('T')[0])} · {fmtCurrency(a.vlr_nota)} · {a.motivo}
                      </div>
                    </div>
                    {a.decisao_usuario === 'PENDENTE' && a.confianca !== 'NAO_ENCONTRADO' && (
                      <button onClick={() => { setDetalhe(a); setObsModal('') }} style={{
                        padding: '6px 14px', borderRadius: 7, border: `1px solid ${conf.cor}`,
                        background: 'white', color: conf.cor, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                        whiteSpace: 'nowrap', flexShrink: 0,
                        transition: 'all 0.15s',
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
          <CardTitle>{xmlNotas.length} XMLs importados sem vinculação automática</CardTitle>
          <DataTable
            columns={[
              { label: 'Nº Arquivo',  key: 'nu_arquivo',    tdStyle: { fontWeight: 700, color: C.accent } },
              { label: 'Nº Nota XML', key: 'num_nota_xml' },
              { label: 'Fornecedor',  render: r => <Ellipsis maxWidth={200}>{r.fornecedor_xml}</Ellipsis> },
              { label: 'Data emissão',render: r => fmtDate(r.data_emissao?.split('T')[0]) },
              { label: 'Valor nota',  render: r => <span style={{ fontWeight: 600 }}>{fmtCurrency(r.vlr_nota)}</span> },
            ]}
            rows={xmlNotas}
            emptyMsg="Nenhum XML carregado. Execute a análise GPT."
          />
        </Card>
      )}

      <div style={{ padding: '10px 14px', background: '#F0F9FF', borderRadius: 8, border: `1px solid #BAE6FD`, fontSize: 11, color: '#0369A1' }}>
        💡 <strong>Como funciona:</strong> O GPT-4o analisa cada XML sem chave vinculada e busca o pedido de compra correspondente usando: (1) janela de ±20 dias da data de embarque, (2) similaridade de nome do fornecedor, (3) valor da nota igual ou combinação parcial de itens. O usuário revisa e confirma cada sugestão.
        <br/><strong>Configuração:</strong> Adicione <code>OPENAI_API_KEY</code> nos Secrets do Supabase (Project Settings → Edge Functions → Secrets).
      </div>
    </div>
  )
}
