import { useState, useMemo } from 'react'
import { Card, CardTitle, DataTable, Btn } from './UI'
import { C } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { fmtDate, fmtCurrency } from '../lib/utils'

function calcMulta(valorMaterial, diasAtraso) {
  if (!valorMaterial || !diasAtraso || diasAtraso <= 0) return { pct: 0, valor: 0 }
  const pct = Math.min(diasAtraso * 0.5, 10)
  const valor = (valorMaterial * pct) / 100
  return { pct: parseFloat(pct.toFixed(2)), valor: parseFloat(valor.toFixed(2)) }
}

function calcIDF(programadas, noPrazo, qtdProg, qtdNoPrazo) {
  const cp = programadas > 0 ? (noPrazo / programadas) * 100 : 0
  const cq = qtdProg > 0 ? (qtdNoPrazo / qtdProg) * 100 : 0
  return {
    cp: parseFloat(cp.toFixed(1)),
    cq: parseFloat(cq.toFixed(1)),
    idf: parseFloat(((cp * 0.8) + (cq * 0.2)).toFixed(1)),
  }
}

function conceito(idf) {
  if (idf >= 95) return { label: 'Ótimo',        color: C.okText,     bg: C.okDim,     border: C.success }
  if (idf >= 85) return { label: 'Bom',           color: C.accentText, bg: C.accentDim, border: C.accent  }
  if (idf >= 60) return { label: 'Regular',       color: C.warnText,   bg: C.warnDim,   border: C.warning }
  return              { label: 'Insuficiente',   color: C.dangerText, bg: C.dangerDim, border: C.danger  }
}

// ── GERADOR DE MULTA ────────────────────────────────────────────────────────
export function GeradorMulta({ pedidos, alertasMulta, onReload }) {
  const [form, setForm] = useState({
    numero: '', fornecedor: '', endereco: '', contato: '',
    num_pedido: '', nf: '', valor_material: '', dias_atraso: '',
  })
  const [status, setStatus] = useState(null) // null | 'salvando' | 'ok' | 'erro'

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setStatus(null) }

  const multa = useMemo(() => {
    const val = parseFloat((form.valor_material || '0').replace(',', '.').replace(/\./g, '').replace(',', '.'))
    const dias = parseInt(form.dias_atraso || '0')
    return calcMulta(isNaN(val) ? 0 : val, dias)
  }, [form.valor_material, form.dias_atraso])

  const podeSalvar = form.fornecedor && parseFloat(form.valor_material) > 0 && parseInt(form.dias_atraso) > 0

  const handleSalvar = async () => {
    setStatus('salvando')
    try {
      const { error } = await supabase.from('alertas_multa').insert({
        numero_pedido:  form.num_pedido ? parseFloat(form.num_pedido) : null,
        fornecedor:     form.fornecedor,
        codigo_produto: null,
        data_embarque:  null,
        decisao:        'MULTA',
        observacao:     JSON.stringify({
          numero_doc:    form.numero,
          nf:            form.nf,
          valor_material: parseFloat(form.valor_material),
          dias_atraso:   parseInt(form.dias_atraso),
          pct_multa:     multa.pct,
          valor_multa:   multa.valor,
          endereco:      form.endereco,
          contato:       form.contato,
        }),
        decidido_em: new Date().toISOString(),
      })
      if (error) throw error
      setStatus('ok')
      onReload()
      setForm({ numero: '', fornecedor: '', endereco: '', contato: '', num_pedido: '', nf: '', valor_material: '', dias_atraso: '' })
    } catch (e) {
      console.error(e)
      setStatus('erro')
    }
  }

  const inp = (label, key, placeholder = '', type = 'text', span = 1) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: `span ${span}` }}>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '9px 12px', color: C.text,
          fontSize: 13, outline: 'none', width: '100%',
        }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <Card>
        <CardTitle>Calculadora de multa por atraso</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {inp('Valor do material (R$)', 'valor_material', '55000.00')}
          {inp('Dias de atraso', 'dias_atraso', '10', 'number')}
          <div style={{
            background: multa.pct >= 10 ? C.dangerDim : C.okDim,
            borderRadius: 10, padding: '14px 16px',
            border: `1px solid ${multa.pct >= 10 ? C.danger : C.success}`,
          }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>MULTA CALCULADA</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: multa.pct >= 10 ? C.dangerText : C.okText }}>
              {multa.pct.toFixed(2)}%
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.brand, marginTop: 2 }}>
              R$ {multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            {multa.pct >= 10 && <div style={{ fontSize: 10, color: C.dangerText, marginTop: 4 }}>⚠ Teto máximo atingido (10%)</div>}
          </div>
        </div>
        <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.muted }}>
          Cálculo: 0,5% × {form.dias_atraso || 0} dias = {((parseFloat(form.dias_atraso) || 0) * 0.5).toFixed(1)}% (limitado a 10% máximo) — Item 7 das Condições Gerais de Fornecimento
        </div>
      </Card>

      <Card>
        <CardTitle>Emitir multa não compensatória</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {inp('Número do documento', 'numero', 'Ex: 01/2026')}
          {inp('Pedido de compra nº', 'num_pedido', 'Ex: 12345')}
          {inp('Fornecedor', 'fornecedor', 'Razão social', 'text', 2)}
          {inp('Endereço', 'endereco', 'Endereço completo', 'text', 2)}
          {inp('Contato', 'contato', 'Telefone ou e-mail')}
          {inp('NF referenciada', 'nf', 'Nº da NF ou "A ser referenciada"')}
          {inp('Valor do material (R$)', 'valor_material', '55000.00')}
          {inp('Dias de atraso', 'dias_atraso', '10', 'number')}
        </div>

        {podeSalvar && (
          <div style={{ background: C.okDim, border: `1px solid ${C.success}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.okText, marginBottom: 10 }}>Resumo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { l: 'Valor do material', v: `R$ ${parseFloat(form.valor_material || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                { l: 'Percentual', v: `${multa.pct.toFixed(2)}%` },
                { l: 'Valor da multa', v: `R$ ${multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.brand, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Btn onClick={handleSalvar} disabled={!podeSalvar || status === 'salvando'}>
            {status === 'salvando' ? 'Registrando…' : 'Registrar multa'}
          </Btn>
          {status === 'ok' && <span style={{ color: C.okText, fontSize: 13, fontWeight: 500 }}>✓ Multa registrada com sucesso</span>}
          {status === 'erro' && <span style={{ color: C.dangerText, fontSize: 13 }}>✗ Erro ao registrar. Tente novamente.</span>}
        </div>
      </Card>

      {/* Histórico de multas */}
      {alertasMulta && alertasMulta.length > 0 && (
        <Card>
          <CardTitle>Histórico de multas registradas</CardTitle>
          <DataTable
            columns={[
              { label: 'Data',      render: r => fmtDate(r.decidido_em?.split('T')[0]) },
              { label: 'Pedido',    key: 'numero_pedido', tdStyle: { fontWeight: 600 } },
              { label: 'Fornecedor', render: r => <span style={{ fontSize: 12 }}>{r.fornecedor || '—'}</span> },
              {
                label: 'Decisão',
                render: r => {
                  const cfg = r.decisao === 'MULTA'
                    ? { bg: C.dangerDim, color: C.dangerText, label: 'Multa emitida' }
                    : r.decisao === 'EMBARCADO'
                    ? { bg: C.okDim, color: C.okText, label: 'Embarcado' }
                    : { bg: '#F3F4F6', color: C.muted, label: r.decisao }
                  return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{cfg.label}</span>
                }
              },
              {
                label: 'Detalhes',
                render: r => {
                  try {
                    const obs = typeof r.observacao === 'string' ? JSON.parse(r.observacao) : r.observacao
                    if (obs?.valor_multa) return <span style={{ fontWeight: 600, color: C.dangerText }}>R$ {parseFloat(obs.valor_multa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  } catch { }
                  return '—'
                }
              },
            ]}
            rows={alertasMulta.filter(a => a.decisao === 'MULTA')}
          />
        </Card>
      )}
    </div>
  )
}

// ── IDF FORNECEDORES ────────────────────────────────────────────────────────
export function AvaliacaoIDF({ pedidos, nfs }) {
  const idfData = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = String(p.cod_fornecedor)
      if (!map[key]) map[key] = { cod: p.cod_fornecedor, nome: p.fornecedor, prog: 0, prazo: 0, qtdProg: 0, qtdPrazo: 0 }
      map[key].prog += 1
      map[key].qtdProg += parseFloat(p.quantidade_pedida) || 0
      const nf = nfs.find(n =>
        n.cod_fornecedor == p.cod_fornecedor &&
        n.codigo_produto == p.codigo_produto &&
        Math.abs((parseFloat(n.valor_item) || 0) - (parseFloat(p.valor_item) || 0)) < 0.5
      )
      if (nf && p.data_prevista_entrega) {
        const recebido = new Date(nf.data_recebimento + 'T00:00:00')
        const prevista = new Date(p.data_prevista_entrega + 'T00:00:00')
        if (recebido <= prevista) {
          map[key].prazo += 1
          map[key].qtdPrazo += parseFloat(nf.quantidade_recebida) || 0
        }
      }
    })
    return Object.values(map).map(f => {
      const r = calcIDF(f.prog, f.prazo, f.qtdProg, f.qtdPrazo)
      return { ...f, ...r, conceito: conceito(r.idf) }
    }).sort((a, b) => a.idf - b.idf)
  }, [pedidos, nfs])

  const media = idfData.length
    ? (idfData.reduce((s, f) => s + f.idf, 0) / idfData.length).toFixed(1) : '—'

  const dist = ['Ótimo', 'Bom', 'Regular', 'Insuficiente'].map(l => ({
    label: l, count: idfData.filter(f => f.conceito.label === l).length,
    ...conceito({ Ótimo: 97, Bom: 89, Regular: 72, Insuficiente: 30 }[l]),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${C.brand}` }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>IDF Médio</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.brand, marginTop: 6 }}>{media}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{conceito(parseFloat(media) || 0).label}</div>
        </div>
        {dist.map((d, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${d.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{d.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.color, marginTop: 6 }}>{d.count}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>fornecedores</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Índice de Desempenho do Fornecedor (IDF)</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>IDF = (CP × 80%) + (CQ × 20%) · Metodologia OTIF · Referência: Usiminas</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ r: '95–100', l: 'Ótimo', idf: 97 }, { r: '85–94', l: 'Bom', idf: 89 }, { r: '60–84', l: 'Regular', idf: 72 }, { r: '0–59', l: 'Insuficiente', idf: 30 }].map((c, i) => {
            const cfg = conceito(c.idf)
            return (
              <span key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                <strong>{c.r}</strong> — {c.l}
              </span>
            )
          })}
        </div>
        <DataTable
          columns={[
            { label: 'Fornecedor', render: r => <span style={{ fontWeight: 500 }}>{r.nome || '—'}</span> },
            { label: 'Programadas', render: r => <span style={{ color: C.muted }}>{r.prog}</span> },
            { label: 'No prazo', render: r => <span style={{ color: C.okText, fontWeight: 600 }}>{r.prazo}</span> },
            { label: 'CP (prazo)', render: r => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: C.accent, width: `${r.cp}%` }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.accent, minWidth: 38 }}>{r.cp}%</span>
              </div>
            )},
            { label: 'CQ (qtd)', render: r => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: C.success, width: `${r.cq}%` }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.okText, minWidth: 38 }}>{r.cq}%</span>
              </div>
            )},
            { label: 'IDF', render: r => (
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: r.conceito.bg, color: r.conceito.color, border: `1px solid ${r.conceito.border}` }}>{r.idf}</span>
            )},
            { label: 'Conceito', render: r => (
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: r.conceito.bg, color: r.conceito.color }}>{r.conceito.label}</span>
            )},
          ]}
          rows={idfData}
          emptyMsg="Carregue pedidos e NFs para calcular o IDF"
        />
      </Card>
    </div>
  )
}
