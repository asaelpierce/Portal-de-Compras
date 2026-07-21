import { useState, useMemo } from 'react'
import { Card, CardTitle, DataTable } from './UI'
import { C } from '../lib/tokens'
import { supabase } from '../lib/supabase'

// ── CALCULADORA DE MULTA ────────────────────────────────────────────────────
// 0.5%/dia sobre valor do material, teto 10%
function calcMulta(valorMaterial, diasAtraso) {
  if (!valorMaterial || !diasAtraso || diasAtraso <= 0) return { pct: 0, valor: 0 }
  const pctBruto = diasAtraso * 0.5
  const pct = Math.min(pctBruto, 10)
  const valor = (valorMaterial * pct) / 100
  return { pct: parseFloat(pct.toFixed(2)), valor }
}

// ── SCORE IDF ───────────────────────────────────────────────────────────────
// IDF = (CP × 80%) + (CQ × 20%)
function calcIDF(entregasProgramadas, entregasNoPrazo, qtdProgramada, qtdEntregueNoPrazo) {
  const cp = entregasProgramadas > 0 ? (entregasNoPrazo / entregasProgramadas) * 100 : 0
  const cq = qtdProgramada > 0 ? (qtdEntregueNoPrazo / qtdProgramada) * 100 : 0
  const idf = (cp * 0.8) + (cq * 0.2)
  return {
    cp: parseFloat(cp.toFixed(1)),
    cq: parseFloat(cq.toFixed(1)),
    idf: parseFloat(idf.toFixed(1)),
  }
}

function conceito(idf) {
  if (idf >= 95) return { label: 'Ótimo',        color: C.okText,     bg: C.okDim     }
  if (idf >= 85) return { label: 'Bom',           color: C.accentText, bg: C.accentDim }
  if (idf >= 60) return { label: 'Regular',       color: C.warnText,   bg: C.warnDim   }
  return              { label: 'Insuficiente',   color: C.dangerText, bg: C.dangerDim }
}

// ── GERADOR DE MULTA ────────────────────────────────────────────────────────
export function GeradorMulta({ pedidos }) {
  const [form, setForm] = useState({
    numero: '', fornecedor: '', endereco: '', contato: '',
    num_pedido: '', nf: '', valor_material: '', dias_atraso: '',
  })
  const [salvo, setSalvo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSalvo(false) }

  const multa = useMemo(() => {
    const val = parseFloat((form.valor_material || '0').replace(',', '.'))
    const dias = parseInt(form.dias_atraso || '0')
    return calcMulta(val, dias)
  }, [form.valor_material, form.dias_atraso])

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await supabase.from('alertas_multa').insert({
        numero_pedido:  form.num_pedido ? parseFloat(form.num_pedido) : null,
        fornecedor:     form.fornecedor,
        decisao:        'MULTA',
        observacao:     JSON.stringify({
          numero_doc:       form.numero,
          nf:               form.nf,
          valor_material:   form.valor_material,
          dias_atraso:      parseInt(form.dias_atraso || '0'),
          pct_multa:        multa.pct,
          valor_multa:      multa.valor,
          endereco:         form.endereco,
          contato:          form.contato,
        }),
        decidido_em: new Date().toISOString(),
      })
      setSalvo(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSalvando(false)
    }
  }

  const podeSalvar = form.fornecedor && form.valor_material && form.dias_atraso && parseFloat(form.valor_material) > 0 && parseInt(form.dias_atraso) > 0

  const inp = (label, key, placeholder = '', type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '8px 12px', color: C.text,
          fontSize: 13, outline: 'none', width: '100%',
        }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Calculadora rápida */}
      <Card>
        <CardTitle>Calculadora de multa</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {inp('Valor do material (R$)', 'valor_material', '55000.00')}
          {inp('Dias de atraso', 'dias_atraso', '10', 'number')}
          <div style={{ background: C.surface, borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Multa calculada</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: multa.pct >= 10 ? C.dangerText : C.warnText }}>
              {multa.pct.toFixed(2)}%
            </div>
            <div style={{ fontSize: 14, color: C.text, marginTop: 2 }}>
              R$ {multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            {multa.pct >= 10 && (
              <div style={{ fontSize: 10, color: C.dangerText, marginTop: 4 }}>Teto máximo atingido (10%)</div>
            )}
          </div>
        </div>
        <div style={{ background: C.surface, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.subtle, border: `1px solid ${C.border}` }}>
          Cálculo: 0,5% × {form.dias_atraso || 0} dias = {((parseFloat(form.dias_atraso) || 0) * 0.5).toFixed(2)}% → máximo 10%
        </div>
      </Card>

      {/* Formulário */}
      <Card>
        <CardTitle>Registrar multa não compensatória</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {inp('Número do documento', 'numero', 'Ex: 01/2026')}
          {inp('Pedido de compra nº', 'num_pedido', 'Ex: 12345')}
          {inp('Fornecedor', 'fornecedor', 'Razão social')}
          {inp('Contato', 'contato', 'Telefone ou e-mail')}
          <div style={{ gridColumn: 'span 2' }}>
            {inp('Endereço do fornecedor', 'endereco', 'Endereço completo')}
          </div>
          {inp('NF referenciada', 'nf', 'Número ou "A ser referenciada"')}
          {inp('Valor do material (R$)', 'valor_material', '55000.00')}
          {inp('Dias de atraso', 'dias_atraso', '10', 'number')}
        </div>

        {/* Preview */}
        {podeSalvar && (
          <div style={{ background: '#1A2A1A', border: `1px solid ${C.success}44`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.okText, fontWeight: 600, marginBottom: 10 }}>Resumo da multa</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { l: 'Valor do material', v: `R$ ${parseFloat((form.valor_material || '0').replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                { l: 'Percentual aplicado', v: `${multa.pct.toFixed(2)}%` },
                { l: 'Valor da multa', v: `R$ ${multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.subtle }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.okText, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSalvar}
          disabled={!podeSalvar || salvando}
          style={{
            width: '100%', padding: 11, borderRadius: 8, border: 'none',
            background: podeSalvar && !salvando ? C.accent : C.border,
            color: 'white', fontSize: 14, fontWeight: 600,
            cursor: podeSalvar && !salvando ? 'pointer' : 'not-allowed',
          }}
        >
          {salvando ? 'Registrando…' : 'Registrar multa'}
        </button>

        {salvo && (
          <div style={{ marginTop: 12, background: C.okDim, border: `1px solid ${C.success}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.okText }}>
            ✓ Multa registrada no Supabase com sucesso.
          </div>
        )}

        <div style={{ marginTop: 12, background: C.surface, borderRadius: 8, padding: '10px 14px', fontSize: 11, color: C.subtle, border: `1px solid ${C.border}` }}>
          Base: 0,5%/dia sobre o valor do material · Teto: 10% · Desconto na próxima NF apresentada (Item 7 das Condições Gerais de Fornecimento)
        </div>
      </Card>
    </div>
  )
}

// ── AVALIAÇÃO IDF ───────────────────────────────────────────────────────────
export function AvaliacaoIDF({ pedidos, nfs }) {

  const idfPorFornecedor = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = String(p.cod_fornecedor)
      if (!map[key]) map[key] = {
        cod: p.cod_fornecedor, nome: p.fornecedor,
        programadas: 0, noPrazo: 0,
        qtdProgramada: 0, qtdNoPrazo: 0,
      }
      map[key].programadas += 1
      map[key].qtdProgramada += parseFloat(p.quantidade_pedida) || 0

      const nf = nfs.find(n =>
        n.cod_fornecedor == p.cod_fornecedor &&
        n.codigo_produto == p.codigo_produto &&
        Math.abs((parseFloat(n.valor_item) || 0) - (parseFloat(p.valor_item) || 0)) < 0.5
      )
      if (nf && p.data_prevista_entrega) {
        const recebido = new Date(nf.data_recebimento)
        const prevista = new Date(p.data_prevista_entrega)
        if (recebido <= prevista) {
          map[key].noPrazo += 1
          map[key].qtdNoPrazo += parseFloat(nf.quantidade_recebida) || 0
        }
      }
    })

    return Object.values(map)
      .map(f => {
        const r = calcIDF(f.programadas, f.noPrazo, f.qtdProgramada, f.qtdNoPrazo)
        return { ...f, ...r, conceito: conceito(r.idf) }
      })
      .sort((a, b) => a.idf - b.idf)
  }, [pedidos, nfs])

  const media = idfPorFornecedor.length
    ? (idfPorFornecedor.reduce((s, f) => s + f.idf, 0) / idfPorFornecedor.length).toFixed(1)
    : '—'

  const dist = [
    { label: 'Ótimo',        idf: 97 },
    { label: 'Bom',          idf: 89 },
    { label: 'Regular',      idf: 72 },
    { label: 'Insuficiente', idf: 30 },
  ].map(c => ({
    ...c,
    count: idfPorFornecedor.filter(f => f.conceito.label === c.label).length,
    ...conceito(c.idf),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>IDF médio</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: conceito(parseFloat(media) || 0).color, marginTop: 6 }}>{media}</div>
          <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{conceito(parseFloat(media) || 0).label}</div>
        </div>
        {dist.map((d, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.color, marginTop: 6 }}>{d.count}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>fornecedores</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <div style={{ marginBottom: 14 }}>
          <CardTitle>Índice de Desempenho do Fornecedor (IDF)</CardTitle>
          <div style={{ fontSize: 12, color: C.subtle, marginTop: -10 }}>
            IDF = (CP × 80%) + (CQ × 20%) · Metodologia OTIF
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { range: '95 – 100', label: 'Ótimo',        ...conceito(97) },
            { range: '85 – 94',  label: 'Bom',          ...conceito(89) },
            { range: '60 – 84',  label: 'Regular',      ...conceito(72) },
            { range: '0 – 59',   label: 'Insuficiente', ...conceito(30) },
          ].map((c, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              background: c.bg, color: c.color, border: `1px solid ${c.color}33`,
            }}>
              <strong>{c.range}</strong> — {c.label}
            </span>
          ))}
        </div>

        <DataTable
          columns={[
            { label: 'Fornecedor', render: r => <span style={{ fontWeight: 500, color: C.text }}>{r.nome || '—'}</span> },
            { label: 'Programadas', render: r => <span style={{ color: C.muted }}>{r.programadas}</span> },
            { label: 'No prazo',   render: r => <span style={{ color: C.okText }}>{r.noPrazo}</span> },
            {
              label: 'CP (prazo %)',
              render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, minWidth: 50 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: C.accentText, width: `${r.cp}%` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.accentText, minWidth: 36 }}>{r.cp}%</span>
                </div>
              ),
            },
            {
              label: 'CQ (qtd %)',
              render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, minWidth: 50 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: C.success, width: `${r.cq}%` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.okText, minWidth: 36 }}>{r.cq}%</span>
                </div>
              ),
            },
            {
              label: 'IDF',
              render: r => (
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                  fontSize: 13, fontWeight: 700,
                  background: r.conceito.bg, color: r.conceito.color,
                  border: `1px solid ${r.conceito.color}33`,
                }}>{r.idf}</span>
              ),
            },
            {
              label: 'Conceito',
              render: r => (
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                  fontSize: 11, fontWeight: 500,
                  background: r.conceito.bg, color: r.conceito.color,
                }}>{r.conceito.label}</span>
              ),
            },
          ]}
          rows={idfPorFornecedor}
          emptyMsg="Carregue pedidos e NFs para calcular o IDF"
        />

        <div style={{ marginTop: 14, background: C.surface, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.subtle, border: `1px solid ${C.border}` }}>
          O IDF é calculado com base no cruzamento pedidos × NFs (fornecedor + produto + valor, tolerância R$ 0,50).
          Fornecedores sem NF vinculada figuram com CP e CQ = 0%.
        </div>
      </Card>
    </div>
  )
}
