import { useState, useMemo } from 'react'
import { Card, CardTitle, DataTable, Btn } from './UI'
import { C } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { fmtDate, fmtCurrency, fmt } from '../lib/utils'

// ── CÁLCULO MULTA ──────────────────────────────────────────────────────────
function calcMulta(valorMaterial, diasAtraso) {
  if (!valorMaterial || !diasAtraso || diasAtraso <= 0) return { pct: 0, valor: 0 }
  const pct = Math.min(diasAtraso * 0.5, 10)
  const valor = (valorMaterial * pct) / 100
  return { pct: parseFloat(pct.toFixed(2)), valor: parseFloat(valor.toFixed(2)) }
}

// ── GERAÇÃO DE PDF DA MULTA ────────────────────────────────────────────────
function gerarHTMLMulta(dados, multa) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; }
  .header { background: #1A1A1A; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; }
  .header-right { text-align: right; color: #999; font-size: 9px; line-height: 1.6; }
  .yellow-bar { background: #F5E500; height: 4px; }
  .content { padding: 24px 28px; }
  .title-row { display: flex; justify-content: space-between; align-items: center; background: #F5F5F5; padding: 12px 16px; border-top: 2px solid #1A1A1A; border-bottom: 1px solid #DDD; margin-bottom: 18px; }
  .title { font-size: 14px; font-weight: bold; }
  .date-box { text-align: right; font-size: 10px; }
  .date-box strong { font-size: 13px; display: block; }
  .field-row { display: flex; gap: 4px; margin-bottom: 5px; }
  .field-label { font-weight: bold; min-width: 80px; }
  .divider { border: none; border-top: 1px solid #DDD; margin: 16px 0; }
  .body-text { line-height: 1.6; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1A1A1A; color: white; font-weight: bold; padding: 8px; text-align: center; font-size: 10px; }
  td { padding: 8px; text-align: center; border: 1px solid #DDD; font-size: 11px; }
  tr:nth-child(even) td { background: #F9F9F9; }
  .total-row { display: flex; justify-content: space-between; align-items: center; background: #F5F5F5; padding: 12px 16px; border-top: 3px solid #F5E500; margin-bottom: 16px; }
  .total-value { font-size: 16px; font-weight: bold; }
  .base-calc { font-size: 10px; color: #555; line-height: 1.6; margin-bottom: 20px; }
  .signature { text-align: right; margin-top: 32px; }
  .footer { border-top: 1px solid #DDD; padding: 10px 28px; font-size: 8px; color: #777; text-align: center; margin-top: 20px; }
  .footer-bank { display: flex; justify-content: space-between; font-size: 7.5px; color: #999; padding: 4px 28px; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <div style="color:white;font-size:22px;font-weight:bold;letter-spacing:-0.5px">
    <span style="color:#F5E500">K</span> Kalenborn
    <div style="font-size:10px;font-weight:normal;color:#AAA">Wear Protection Solutions</div>
  </div>
  <div class="header-right">
    Kalenborn do Brasil Ltda<br>
    Estrada Antiga BH-Pedro Leopoldo, 1150 – Vespasiano/MG<br>
    CEP: 33.206-220 | CNPJ: 04.921.141/0001-06<br>
    Phone +55(31)3499-4000 | kalenborn@kalenborn.com.br
  </div>
</div>
<div class="yellow-bar"></div>
<div class="content">
  <div class="title-row">
    <div class="title">MULTA NÃO COMPENSATÓRIA Nº ${dados.numero || '—'}</div>
    <div class="date-box">DATA:<strong>${dados.data}</strong></div>
  </div>
  <div class="field-row"><span class="field-label">Fornecedor:</span><span>${dados.fornecedor}</span></div>
  <div class="field-row"><span class="field-label">Endereço:</span><span>${dados.endereco || '—'}</span></div>
  <div class="field-row"><span class="field-label">Contato:</span><span>${dados.contato || '—'}</span></div>
  ${dados.email ? `<div class="field-row"><span class="field-label">E-mail:</span><span>${dados.email}</span></div>` : ''}
  <hr class="divider">
  <p class="body-text">Valor que lhe debitamos refere-se à multa por descumprimento do prazo de entrega, conforme previsto no <strong>item 7 das Condições Gerais de Fornecimento</strong> do pedido de compra.</p>
  <table>
    <thead>
      <tr>
        <th>Doc. de compra</th>
        <th>NF referenciada</th>
        <th>Valor do material (R$)</th>
        <th>Dias de atraso</th>
        <th>Multa (%)</th>
        <th>Valor da multa (R$)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${dados.num_pedido || '—'}</td>
        <td>${dados.nf || 'A ser referenciada'}</td>
        <td>${parseFloat(dados.valor_material || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td>${dados.dias_atraso}</td>
        <td>${multa.pct.toFixed(2)}%</td>
        <td><strong>${multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="total-row">
    <span>O valor a seguir será descontado na próxima nota fiscal apresentada.</span>
    <span class="total-value">Total: R$ ${multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
  </div>
  <div class="base-calc">
    <strong>Base de cálculo:</strong> A multa diária por atraso é de <strong>0,5% sobre o valor do material entregue</strong>, devidamente reajustado, até a data efetiva da entrega.
    A multa máxima não excede <strong>10% do valor do material</strong>. As multas devidas poderão ser descontadas de quaisquer faturas apresentadas pelo fornecedor.
  </div>
  <div class="signature">
    Atenciosamente,<br><br>
    <strong>Kalenborn do Brasil Ltda</strong>
  </div>
</div>
<div class="footer">
  Kalenborn do Brasil Ltda &nbsp;|&nbsp; Phone +55(31)3499-4000 · Fax +55(31)3499-4010 &nbsp;|&nbsp; www.kalenborn.com &nbsp;|&nbsp; kalenborn@kalenborn.com.br
</div>
<div class="footer-bank">
  <span>Beneficiary Bank: Banco Santander (Brasil) S.A &nbsp;|&nbsp; Swift: BSCHBRSP &nbsp;|&nbsp; Account: 3544034644001</span>
  <span>Ag: 4546 &nbsp;|&nbsp; CC: 13000331-0 &nbsp;|&nbsp; CNPJ: 04.921.141/0001-06</span>
</div>
</body>
</html>`
}

// ── GERADOR DE MULTA ────────────────────────────────────────────────────────
export function GeradorMulta({ pedidos, alertasMulta, onReload }) {
  const [form, setForm] = useState({
    numero: '', fornecedor: '', endereco: '', contato: '', email: '',
    num_pedido: '', nf: '', valor_material: '', dias_atraso: '',
  })
  const [status, setStatus] = useState(null)
  const [preview, setPreview] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setStatus(null) }

  const multa = useMemo(() => {
    const val = parseFloat((form.valor_material || '0').replace(/\./g, '').replace(',', '.'))
    const dias = parseInt(form.dias_atraso || '0')
    return calcMulta(isNaN(val) ? 0 : val, dias)
  }, [form.valor_material, form.dias_atraso])

  const podeSalvar = form.fornecedor && parseFloat(form.valor_material) > 0 && parseInt(form.dias_atraso) > 0

  // Gera e abre o documento para impressão/PDF
  const handleDownload = () => {
    if (!podeSalvar) return
    const dados = { ...form, data: new Date().toLocaleDateString('pt-BR') }
    const html = gerarHTMLMulta(dados, multa)

    // Abre em nova aba e imprime
    const novaAba = window.open('', '_blank')
    if (novaAba) {
      novaAba.document.open()
      novaAba.document.write(html)
      novaAba.document.close()
      setTimeout(() => novaAba.print(), 800)
    } else {
      // Fallback: download direto do arquivo HTML
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `multa-${form.fornecedor || 'fornecedor'}-${new Date().toISOString().slice(0,10)}.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

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
          numero_doc:      form.numero,
          nf:              form.nf,
          valor_material:  parseFloat(form.valor_material) || 0,
          dias_atraso:     parseInt(form.dias_atraso) || 0,
          pct_multa:       multa.pct,
          valor_multa:     multa.valor,
          endereco:        form.endereco,
          contato:         form.contato,
          email:           form.email,
        }),
        decidido_em: new Date().toISOString(),
      })
      if (error) throw error
      setStatus('ok')
      onReload()
      // Limpa form após salvar
      setForm({ numero: '', fornecedor: '', endereco: '', contato: '', email: '', num_pedido: '', nf: '', valor_material: '', dias_atraso: '' })
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
        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', width: '100%' }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Calculadora */}
      <Card>
        <CardTitle>Calculadora de multa</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 14 }}>
          {inp('Valor do material (R$)', 'valor_material', '55000.00')}
          {inp('Dias de atraso', 'dias_atraso', '10', 'number')}
          <div style={{ background: multa.pct >= 10 ? C.dangerDim : C.okDim, borderRadius: 10, padding: '12px 16px', border: `1px solid ${multa.pct >= 10 ? C.danger : C.success}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>MULTA CALCULADA</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: multa.pct >= 10 ? C.dangerText : C.okText }}>{multa.pct.toFixed(2)}%</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>R$ {multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            {multa.pct >= 10 && <div style={{ fontSize: 10, color: C.dangerText, marginTop: 4 }}>⚠ Teto 10% atingido</div>}
          </div>
        </div>
        <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: C.muted }}>
          0,5% × {form.dias_atraso || 0} dias = {((parseFloat(form.dias_atraso) || 0) * 0.5).toFixed(1)}% (máximo 10%) — Item 7 das Condições Gerais
        </div>
      </Card>

      {/* Formulário */}
      <Card>
        <CardTitle>Emitir multa não compensatória</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {inp('Número do documento', 'numero', 'Ex: 01/2026')}
          {inp('Pedido de compra nº', 'num_pedido', 'Ex: 12345')}
          {inp('Fornecedor', 'fornecedor', 'Razão social', 'text', 2)}
          {inp('Endereço', 'endereco', 'Endereço completo', 'text', 2)}
          {inp('Contato', 'contato', 'Telefone')}
          {inp('E-mail do fornecedor', 'email', 'email@fornecedor.com.br', 'email')}
          {inp('NF referenciada', 'nf', 'Nº da NF ou "A ser referenciada"')}
          {inp('Valor do material (R$)', 'valor_material', '55000.00')}
          {inp('Dias de atraso', 'dias_atraso', '10', 'number')}
        </div>

        {/* Preview resumo */}
        {podeSalvar && (
          <div style={{ background: C.okDim, border: `1px solid ${C.success}`, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.okText, marginBottom: 8 }}>Resumo da multa</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { l: 'Fornecedor',        v: form.fornecedor },
                { l: 'Valor material',    v: `R$ ${parseFloat(form.valor_material || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                { l: 'Percentual',        v: `${multa.pct.toFixed(2)}%` },
                { l: 'Valor da multa',    v: `R$ ${multa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.brand, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={handleSalvar} disabled={!podeSalvar || status === 'salvando'}>
            {status === 'salvando' ? '⏳ Registrando…' : '💾 Registrar multa'}
          </Btn>
          <Btn variant="outline" onClick={handleDownload} disabled={!podeSalvar}>
            📄 Gerar documento (PDF)
          </Btn>
          {form.email && podeSalvar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: C.accentDim, borderRadius: 8, border: `1px solid ${C.accent}`, fontSize: 12, color: C.accentText }}>
              ✉ Será enviado para: {form.email}
              <span style={{ fontSize: 10, color: C.muted }}>(após configuração de email)</span>
            </div>
          )}
          {status === 'ok'   && <span style={{ color: C.okText,     fontSize: 13, fontWeight: 500 }}>✓ Multa registrada com sucesso</span>}
          {status === 'erro' && <span style={{ color: C.dangerText, fontSize: 13 }}>✗ Erro ao registrar. Tente novamente.</span>}
        </div>

        <div style={{ marginTop: 12, background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: C.subtle }}>
          💡 O botão "Gerar documento" abre uma janela para impressão/salvamento como PDF no seu navegador.
        </div>
      </Card>

      {/* Histórico */}
      {alertasMulta && alertasMulta.filter(a => a.decisao === 'MULTA').length > 0 && (
        <Card>
          <CardTitle>Histórico de multas registradas</CardTitle>
          <DataTable
            columns={[
              { label: 'Data',       render: r => fmtDate(r.decidido_em?.split('T')[0]) },
              { label: 'Pedido',     key: 'numero_pedido', tdStyle: { fontWeight: 600 } },
              { label: 'Fornecedor', render: r => <span style={{ fontSize: 12 }}>{r.fornecedor || '—'}</span> },
              { label: 'Valor multa', render: r => {
                try {
                  const obs = typeof r.observacao === 'string' ? JSON.parse(r.observacao) : r.observacao
                  if (obs?.valor_multa) return <span style={{ fontWeight: 700, color: C.dangerText }}>R$ {parseFloat(obs.valor_multa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                } catch {}
                return '—'
              }},
              { label: 'E-mail', render: r => {
                try {
                  const obs = typeof r.observacao === 'string' ? JSON.parse(r.observacao) : r.observacao
                  return obs?.email || <span style={{ color: C.muted }}>Não cadastrado</span>
                } catch {}
                return '—'
              }},
              { label: 'Ação', render: r => {
                const handleRe = () => {
                  try {
                    const obs = typeof r.observacao === 'string' ? JSON.parse(r.observacao) : r.observacao
                    const dados = { numero: obs.numero_doc, fornecedor: r.fornecedor, endereco: obs.endereco, contato: obs.contato, email: obs.email, num_pedido: String(r.numero_pedido || ''), nf: obs.nf, valor_material: String(obs.valor_material || ''), dias_atraso: String(obs.dias_atraso || '') }
                    const m = calcMulta(obs.valor_material, obs.dias_atraso)
                    const html = gerarHTMLMulta({ ...dados, data: fmtDate(r.decidido_em?.split('T')[0]) }, m)
                    const novaAba = window.open('', '_blank')
                    if (novaAba) {
                      novaAba.document.open()
                      novaAba.document.write(html)
                      novaAba.document.close()
                      setTimeout(() => novaAba.print(), 800)
                    } else {
                      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `multa-${r.fornecedor}-reimprimir.html`
                      a.click()
                    }
                  } catch(e) { console.error(e) }
                }
                return <button onClick={handleRe} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.accent, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>📄 Reimprimir</button>
              }},
            ]}
            rows={alertasMulta.filter(a => a.decisao === 'MULTA')}
          />
        </Card>
      )}
    </div>
  )
}

// ── IDF FORNECEDORES ────────────────────────────────────────────────────────
function calcIDF(prog, prazo, qtdProg, qtdPrazo) {
  const cp = prog > 0 ? (prazo / prog) * 100 : 0
  const cq = qtdProg > 0 ? (qtdPrazo / qtdProg) * 100 : 0
  return { cp: parseFloat(cp.toFixed(1)), cq: parseFloat(cq.toFixed(1)), idf: parseFloat(((cp * 0.8) + (cq * 0.2)).toFixed(1)) }
}

function conceito(idf) {
  if (idf >= 95) return { label: 'Ótimo',        color: C.okText,     bg: C.okDim,     border: C.success }
  if (idf >= 85) return { label: 'Bom',           color: C.accentText, bg: C.accentDim, border: C.accent  }
  if (idf >= 60) return { label: 'Regular',       color: C.warnText,   bg: C.warnDim,   border: C.warning }
  return              { label: 'Insuficiente',   color: C.dangerText, bg: C.dangerDim, border: C.danger  }
}

export function AvaliacaoIDF({ pedidos, nfs }) {
  const idfData = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      const key = String(p.cod_fornecedor)
      if (!map[key]) map[key] = { cod: p.cod_fornecedor, nome: p.fornecedor, prog: 0, prazo: 0, qtdProg: 0, qtdPrazo: 0 }
      map[key].prog += 1
      map[key].qtdProg += parseFloat(p.quantidade_pedida) || 0
      const nf = nfs.find(n => n.cod_fornecedor == p.cod_fornecedor && n.codigo_produto == p.codigo_produto && Math.abs((parseFloat(n.valor_item) || 0) - (parseFloat(p.valor_item) || 0)) < 0.5)
      if (nf && p.data_prevista_entrega) {
        const rec = new Date(String(nf.data_recebimento).match(/(\d{4})-(\d{2})-(\d{2})/)?.[0] + 'T12:00:00')
        const prev = new Date(String(p.data_prevista_entrega).match(/(\d{4})-(\d{2})-(\d{2})/)?.[0] + 'T12:00:00')
        if (rec <= prev) { map[key].prazo += 1; map[key].qtdPrazo += parseFloat(nf.quantidade_recebida) || 0 }
      }
    })
    return Object.values(map).map(f => { const r = calcIDF(f.prog, f.prazo, f.qtdProg, f.qtdPrazo); return { ...f, ...r, conceito: conceito(r.idf) } }).sort((a, b) => a.idf - b.idf)
  }, [pedidos, nfs])

  const media = idfData.length ? (idfData.reduce((s, f) => s + f.idf, 0) / idfData.length).toFixed(1) : '—'
  const dist = ['Ótimo','Bom','Regular','Insuficiente'].map(l => ({ label: l, count: idfData.filter(f => f.conceito.label === l).length, ...conceito({Ótimo:97,Bom:89,Regular:72,Insuficiente:30}[l]) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${C.brand}` }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>IDF Médio</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.brand, marginTop: 6 }}>{media}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{conceito(parseFloat(media) || 0).label}</div>
        </div>
        {dist.map((d, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${d.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{d.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.color, marginTop: 6 }}>{d.count}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>fornecedores</div>
          </div>
        ))}
      </div>
      <Card>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Índice de Desempenho do Fornecedor (IDF)</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>IDF = (CP × 80%) + (CQ × 20%) · Metodologia OTIF</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{r:'95–100',l:'Ótimo',i:97},{r:'85–94',l:'Bom',i:89},{r:'60–84',l:'Regular',i:72},{r:'0–59',l:'Insuficiente',i:30}].map((c,i) => { const cfg=conceito(c.i); return <span key={i} style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}><strong>{c.r}</strong> — {c.l}</span> })}
        </div>
        <DataTable
          columns={[
            {label:'Fornecedor',render:r=><span style={{fontWeight:500}}>{r.nome||'—'}</span>},
            {label:'Programadas',render:r=><span style={{color:C.muted}}>{r.prog}</span>},
            {label:'No prazo',render:r=><span style={{color:C.okText,fontWeight:600}}>{r.prazo}</span>},
            {label:'CP (prazo)',render:r=>(<div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:6,background:C.border,borderRadius:3}}><div style={{height:'100%',borderRadius:3,background:C.accent,width:`${r.cp}%`}}/></div><span style={{fontSize:12,fontWeight:600,color:C.accent,minWidth:38}}>{r.cp}%</span></div>)},
            {label:'CQ (qtd)',render:r=>(<div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:6,background:C.border,borderRadius:3}}><div style={{height:'100%',borderRadius:3,background:C.success,width:`${r.cq}%`}}/></div><span style={{fontSize:12,fontWeight:600,color:C.okText,minWidth:38}}>{r.cq}%</span></div>)},
            {label:'IDF',render:r=><span style={{display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:700,background:r.conceito.bg,color:r.conceito.color,border:`1px solid ${r.conceito.border}`}}>{r.idf}</span>},
            {label:'Conceito',render:r=><span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,background:r.conceito.bg,color:r.conceito.color}}>{r.conceito.label}</span>},
          ]}
          rows={idfData}
          emptyMsg="Carregue pedidos e NFs para calcular o IDF"
        />
      </Card>
    </div>
  )
}
