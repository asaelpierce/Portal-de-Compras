import { useState, useMemo, useEffect } from 'react'
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
  const [encerrados, setEncerrados] = useState([])
  const [historico, setHistorico]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtroGrupo, setFiltroGrupo]       = useState('')
  const [filtroStatus, setFiltroStatusIDF]  = useState('')

  useEffect(() => {
    Promise.all([
      // Pedidos encerrados com data de entrega
      (async () => {
        let all = []
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from('pedidos_encerrados')
            .select('numero_pedido,fornecedor,data_prevista_entrega,data_encerramento,prazo_sankhya')
            .not('data_prevista_entrega', 'is', null)
            .range(from, from + 999)
          if (error || !data || !data.length) break
          all = [...all, ...data]
          if (data.length < 1000) break
          from += 1000
        }
        return all
      })(),
      // Histórico Forms (qualidade)
      (async () => {
        let all = []
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from('idf_historico')
            .select('fornecedor,grupo_produto,especificacao_ok,condicao_ok,quantidade_ok,nf_conforme_ok,embalagem_ok')
            .range(from, from + 999)
          if (error || !data || !data.length) break
          all = [...all, ...data]
          if (data.length < 1000) break
          from += 1000
        }
        return all
      })(),
    ]).then(([enc, hist]) => {
      setEncerrados(enc)
      setHistorico(hist)
      setLoading(false)
    })
  }, [])

  const grupos = useMemo(() =>
    [...new Set(historico.map(h => h.grupo_produto).filter(Boolean))].sort()
  , [historico])

  // Índice NFs por pedido (primeira entrega)
  const nfsPorPedido = useMemo(() => {
    const map = {}
    nfs.forEach(n => {
      if (!n.numero_pedido_oc || !n.data_recebimento) return
      const k = String(n.numero_pedido_oc)
      if (!map[k] || n.data_recebimento < map[k]) map[k] = n.data_recebimento
    })
    return map
  }, [nfs])

  const idfData = useMemo(() => {
    if (loading) return []

    // Normaliza nome do fornecedor para agrupar variações
    const normForn = (nome) => (nome || '').trim().toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/LTDA.*$/, 'LTDA')
      .replace(/S\.A\..*$/, 'SA')

    // 1. Prazo via Sankhya — usa AD_DTRECEB vs DTPREVENT calculado pelo próprio Sankhya
    // Campo prazo_sankhya: 'DENTRO DO PRAZO' | 'FORA DO PRAZO' | 'SEM DATA'
    const prazoPorForn = {}
    // Deduplica por numero_pedido (pega um item por pedido)
    const pedidosVistos = new Set()
    encerrados.forEach(e => {
      if (!e.prazo_sankhya || e.prazo_sankhya === 'SEM DATA') return
      if (pedidosVistos.has(e.numero_pedido)) return
      pedidosVistos.add(e.numero_pedido)
      const nomeNorm = normForn(e.fornecedor)
      if (!prazoPorForn[nomeNorm]) prazoPorForn[nomeNorm] = { nome_orig: e.fornecedor, total: 0, atrasados: 0 }
      prazoPorForn[nomeNorm].total += 1
      if (e.prazo_sankhya === 'FORA DO PRAZO') prazoPorForn[nomeNorm].atrasados += 1
    })

    // 2. Qualidade via Forms — por recebimento
    const filtrado = filtroGrupo
      ? historico.filter(h => h.grupo_produto === filtroGrupo)
      : historico
    const qualPorForn = {}
    filtrado.forEach(h => {
      const nomeNorm = normForn(h.fornecedor)
      if (!qualPorForn[nomeNorm]) qualPorForn[nomeNorm] = { nome_orig: h.fornecedor, total: 0, esp_nok: 0, cond_nok: 0, qtd_nok: 0, nf_nok: 0, emb_nok: 0 }
      qualPorForn[nomeNorm].total += 1
      if (h.especificacao_ok === false) qualPorForn[nomeNorm].esp_nok++
      if (h.condicao_ok      === false) qualPorForn[nomeNorm].cond_nok++
      if (h.quantidade_ok    === false) qualPorForn[nomeNorm].qtd_nok++
      if (h.nf_conforme_ok   === false) qualPorForn[nomeNorm].nf_nok++
      if (h.embalagem_ok     === false) qualPorForn[nomeNorm].emb_nok++
    })

    // 3. Combina: IDF Prazo (Sankhya) + IDF Qualidade (Forms)
    const todos = new Set([...Object.keys(prazoPorForn), ...Object.keys(qualPorForn)])
    const result = []
    for (const nomeNorm of todos) {
      const pz  = prazoPorForn[nomeNorm]
      const ql  = qualPorForn[nomeNorm]
      const nome = pz?.nome_orig || ql?.nome_orig || nomeNorm

      // IDF Prazo: % pedidos no prazo (Sankhya) — peso 25%
      const pct_prazo = pz && pz.total > 0 ? (pz.total - pz.atrasados) / pz.total * 100 : null
      const idf_prazo = pct_prazo !== null ? pct_prazo : null

      // IDF Qualidade: nota média (Forms) — peso 75%
      const idf_qual = ql && ql.total > 0 ? (
        100
        - (ql.esp_nok  / ql.total * 35)
        - (ql.cond_nok / ql.total * 5)
        - (ql.qtd_nok  / ql.total * 15)
        - (ql.nf_nok   / ql.total * 10)
        - (ql.emb_nok  / ql.total * 10)
      ) : null

      // IDF Final — combina os dois se disponíveis
      let idf
      if (idf_prazo !== null && idf_qual !== null) {
        idf = parseFloat((idf_qual * 0.75 + idf_prazo * 0.25).toFixed(1))
      } else if (idf_prazo !== null) {
        idf = parseFloat(idf_prazo.toFixed(1))
      } else if (idf_qual !== null) {
        idf = parseFloat(idf_qual.toFixed(1))
      } else continue

      const c = conceito(idf)
      if (filtroStatus && (
        (filtroStatus === 'aprovado'  && idf < 71) ||
        (filtroStatus === 'ressalva'  && (idf < 60 || idf >= 71)) ||
        (filtroStatus === 'reprovado' && idf >= 60)
      )) continue

      result.push({
        nome,
        // Dados prazo Sankhya
        total_pedidos:   pz?.total || 0,
        atrasados_sk:    pz?.atrasados || 0,
        pct_prazo:       pct_prazo !== null ? parseFloat(pct_prazo.toFixed(1)) : null,
        tem_sankhya:     pz !== undefined,
        // Dados qualidade Forms
        total_forms:     ql?.total || 0,
        esp_nok:         ql?.esp_nok || 0,
        qtd_nok:         ql?.qtd_nok || 0,
        nf_nok:          ql?.nf_nok || 0,
        emb_nok:         ql?.emb_nok || 0,
        idf_prazo:       idf_prazo !== null ? parseFloat(idf_prazo.toFixed(1)) : null,
        idf_qual:        idf_qual  !== null ? parseFloat(idf_qual.toFixed(1))  : null,
        idf,
        conceito: c,
      })
    }
    return result.sort((a, b) => a.idf - b.idf)
  }, [encerrados, historico, nfsPorPedido, loading, filtroGrupo, filtroStatus])

  const media = idfData.length ? (idfData.reduce((s, f) => s + f.idf, 0) / idfData.length).toFixed(1) : '—'
  const dist = ['Ótimo','Bom','Regular','Insuficiente'].map(l => ({ label: l, count: idfData.filter(f => f.conceito.label === l).length, ...conceito({Ótimo:97,Bom:89,Regular:72,Insuficiente:30}[l]) }))


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: 10, padding: '12px 14px', gridColumn: 'span 1' }}>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fornecedores avaliados</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.brand, marginTop: 4 }}>{idfData.length}</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.brand}`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IDF médio</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.brand, marginTop: 4 }}>{media}</div>
        </div>
        {dist.map((d, i) => (
          <div key={i} style={{ background: d.bg, border: `1px solid ${d.border}`, borderTop: `3px solid ${d.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: d.color }}>{d.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: d.color, marginTop: 4 }}>{d.count}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>Índice de Desempenho do Fornecedor (IDF) — PROC 047</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Prazo via Sankhya (por pedido único) · Qualidade via Forms · IDF = Qualidade×75% + Prazo×25%
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontSize: 12, color: C.text, outline: 'none' }}>
              <option value=''>Todos os grupos</option>
              {grupos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatusIDF(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontSize: 12, color: C.text, outline: 'none' }}>
              <option value=''>Todos</option>
              <option value='aprovado'>🟢 Aprovado (≥71%)</option>
              <option value='ressalva'>🟡 Ressalva (60-70%)</option>
              <option value='reprovado'>🔴 Reprovado (&lt;60%)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{r:'100',l:'Perfeito',i:100},{r:'71–99',l:'Aprovado',i:85},{r:'60–70',l:'Ressalva',i:65},{r:'0–59',l:'Reprovado',i:30}].map((c,i) => {
            const cfg = conceito(c.i)
            return <span key={i} style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}><strong>{c.r}</strong> — {c.l}</span>
          })}
        </div>

        <DataTable
          columns={[
            { label: 'Fornecedor', render: r => <div><div style={{fontWeight:600,color:C.brand}}>{r.nome}</div>{r.tem_sankhya&&<div style={{fontSize:9,color:C.success}}>✓ Prazo via Sankhya</div>}</div> },
            { label: 'Pedidos (SKY)', render: r => <span style={{color:C.muted}}>{r.total_pedidos||'—'}</span> },
            { label: 'Atrasados (SKY)', render: r => <span style={{color:r.atrasados_sk>0?C.danger:C.okText,fontWeight:700}}>{r.tem_sankhya?r.atrasados_sk:'—'}</span> },
            { label: 'Prazo %', render: r => r.pct_prazo!==null
              ? <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{flex:1,height:6,background:C.border,borderRadius:3}}><div style={{height:'100%',borderRadius:3,background:r.pct_prazo>=80?C.success:r.pct_prazo>=60?C.warning:C.danger,width:`${r.pct_prazo}%`}}/></div><span style={{fontSize:11,fontWeight:600,minWidth:38,color:r.pct_prazo>=80?C.okText:r.pct_prazo>=60?C.warning:C.danger}}>{r.pct_prazo}%</span></div>
              : <span style={{color:C.subtle}}>—</span>
            },
            { label: 'Receb. (Forms)', render: r => <span style={{color:C.muted}}>{r.total_forms||'—'}</span> },
            { label: 'Qtd errada', render: r => <span style={{color:r.qtd_nok>0?C.warning:C.okText,fontWeight:600}}>{r.total_forms?r.qtd_nok:'—'}</span> },
            { label: 'Embalagem', render: r => <span style={{color:r.emb_nok>0?C.warning:C.okText,fontWeight:600}}>{r.total_forms?r.emb_nok:'—'}</span> },
            { label: 'IDF Prazo', render: r => r.idf_prazo!==null
              ? <span style={{fontSize:12,fontWeight:700,color:r.idf_prazo>=80?C.success:r.idf_prazo>=60?C.warning:C.danger}}>{r.idf_prazo}</span>
              : <span style={{color:C.subtle}}>—</span>
            },
            { label: 'IDF Final', render: r => <span style={{display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:800,background:r.conceito.bg,color:r.conceito.color,border:`1px solid ${r.conceito.border}`}}>{r.idf}</span> },
            { label: 'Status', render: r => <span style={{display:'inline-block',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:r.conceito.bg,color:r.conceito.color}}>{r.conceito.label}</span> },
          ]}
          rows={idfData}
          emptyMsg={loading ? 'Carregando dados...' : 'Nenhum fornecedor encontrado'}
        />
      </Card>
    </div>
  )
}
