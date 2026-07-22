import { useMemo, useState } from 'react'
import { Card, CardTitle, DataTable, Ellipsis, Btn } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, statusEmbarque, statusEntrega, diasDiferenca } from '../lib/utils'
import { supabase } from '../lib/supabase'

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }

const TIPOS = {
  ALTO_VALOR_ATRASO:  { icon: '💰', cor: '#DC2626', titulo: 'Alto valor em atraso (>R$50k)',        acao: 'Prioridade máxima',       prio: 0 },
  EMBARQUE_VENCIDO:   { icon: '🚚', cor: '#D97706', titulo: 'Data de embarque vencida',             acao: 'Verificar com fornecedor', prio: 1 },
  ENTREGA_ATRASADA:   { icon: '🔴', cor: '#DC2626', titulo: 'Entrega atrasada',                     acao: 'Acionar comprador',        prio: 2 },
  VENCE_3_DIAS:       { icon: '⏰', cor: '#D97706', titulo: 'Entrega vence em até 3 dias',          acao: 'Confirmar status',         prio: 3 },
  SEM_DATA_PEDIDO:    { icon: '📋', cor: '#6B7280', titulo: 'Pedido >7 dias sem datas cadastradas', acao: 'Atualizar no Sankhya',     prio: 4 },
}

export default function Alertas({ pedidos, onReload }) {
  const [resolvendo, setResolvendo] = useState(null)
  const [obs, setObs] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const alertas = useMemo(() => {
    const list = []
    const hoje = new Date()

    pedidos.forEach(p => {
      const stEmb    = statusEmbarque(p.data_embarque, p.quantidade_pendente)
      const stEnt    = statusEntrega(p.data_prevista_entrega, p.quantidade_pendente)
      const diasAtrEnt = diasDiferenca(p.data_prevista_entrega)
      const diasAtrEmb = diasDiferenca(p.data_embarque)
      const valor    = parseFloat(p.valor_total_pedido) || 0
      const diasPedido = p.data_pedido ? Math.floor((hoje - new Date(p.data_pedido)) / (1000*60*60*24)) : 0

      // Alto valor atrasado (embarque ou entrega)
      if (valor > 50000 && (stEmb === 'ALERTA' || stEnt === 'ATRASADO')) {
        list.push({ ...TIPOS.ALTO_VALOR_ATRASO, tipo: 'ALTO_VALOR_ATRASO', pedido: p, diasAtraso: Math.max(diasAtrEnt || 0, diasAtrEmb || 0), valor })
        return
      }

      // Embarque vencido (não conta se já tem entrega atrasada — evita duplicata)
      if (stEmb === 'ALERTA' && stEnt !== 'ATRASADO') {
        list.push({ ...TIPOS.EMBARQUE_VENCIDO, tipo: 'EMBARQUE_VENCIDO', pedido: p, diasAtraso: diasAtrEmb, valor })
        return
      }

      // Entrega atrasada
      if (stEnt === 'ATRASADO') {
        list.push({ ...TIPOS.ENTREGA_ATRASADA, tipo: 'ENTREGA_ATRASADA', pedido: p, diasAtraso: diasAtrEnt, valor })
        return
      }

      // Vence em breve
      if (stEnt === 'EM_BREVE' || stEmb === 'EM_BREVE') {
        list.push({ ...TIPOS.VENCE_3_DIAS, tipo: 'VENCE_3_DIAS', pedido: p, diasAtraso: diasAtrEnt, valor })
        return
      }

      // Sem datas — só alerta se o pedido tem mais de 7 dias (evita ruído de pedidos novos)
      if (!p.data_embarque && !p.data_prevista_entrega && diasPedido > 7 && parseFloat(p.quantidade_pendente) > 0) {
        list.push({ ...TIPOS.SEM_DATA_PEDIDO, tipo: 'SEM_DATA_PEDIDO', pedido: p, diasAtraso: diasPedido, valor })
      }
    })

    return list
      .sort((a, b) => a.prio !== b.prio ? a.prio - b.prio : b.valor - a.valor)
      // Deduplica — um pedido pode gerar só 1 alerta
      .filter((a, i, arr) => arr.findIndex(x => x.pedido.numero_pedido === a.pedido.numero_pedido && x.pedido.codigo_produto === a.pedido.codigo_produto) === i)
  }, [pedidos])

  const filtrados = useMemo(() =>
    filtroTipo ? alertas.filter(a => a.tipo === filtroTipo) : alertas,
    [alertas, filtroTipo]
  )

  const resumo = useMemo(() => {
    const r = {}
    Object.keys(TIPOS).forEach(t => r[t] = 0)
    alertas.forEach(a => r[a.tipo] = (r[a.tipo] || 0) + 1)
    return r
  }, [alertas])

  const handleResolver = async () => {
    if (!resolvendo) return
    await supabase.from('alertas_multa').insert({
      numero_pedido: resolvendo.pedido.numero_pedido,
      fornecedor:    resolvendo.pedido.fornecedor,
      codigo_produto: resolvendo.pedido.codigo_produto,
      decisao:       'EMBARCADO',
      observacao:    JSON.stringify({ tipo_alerta: resolvendo.tipo, obs }),
      decidido_em:   new Date().toISOString(),
    })
    setResolvendo(null)
    setObs('')
    onReload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Modal */}
      {resolvendo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, marginBottom: 4 }}>{resolvendo.icon} Registrar ação</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Pedido #{resolvendo.pedido.numero_pedido} · {resolvendo.pedido.fornecedor}</div>
            <div style={{ background: resolvendo.cor + '10', border: `1px solid ${resolvendo.cor}33`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: C.brand }}>
              <strong style={{ color: resolvendo.cor }}>{resolvendo.titulo}</strong>
              {resolvendo.diasAtraso > 0 && <span style={{ marginLeft: 8, color: resolvendo.cor }}>· {resolvendo.diasAtraso} dias</span>}
            </div>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Observação / Ação tomada</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
              placeholder="Ex: Fornecedor confirmou embarque para 25/07. Material em trânsito."
              style={{ width: '100%', marginTop: 6, marginBottom: 14, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: C.text, background: C.bg }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={handleResolver}>✓ Registrar ação</Btn>
              <Btn variant="outline" onClick={() => { setResolvendo(null); setObs('') }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {Object.entries(TIPOS).map(([tipo, cfg]) => (
          <div key={tipo} onClick={() => setFiltroTipo(t => t === tipo ? '' : tipo)} style={{
            background: filtroTipo === tipo ? cfg.cor + '10' : C.surface,
            border: `1px solid ${filtroTipo === tipo ? cfg.cor : C.border}`,
            borderTop: `3px solid ${cfg.cor}`,
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{cfg.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: resumo[tipo] > 0 ? cfg.cor : C.muted }}>{resumo[tipo]}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{cfg.titulo}</div>
          </div>
        ))}
      </div>

      {filtroTipo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: C.accentDim, borderRadius: 8, border: `1px solid ${C.accent}` }}>
          <span style={{ fontSize: 12, color: C.accentText }}>Filtrando: <strong>{TIPOS[filtroTipo]?.titulo}</strong></span>
          <button onClick={() => setFiltroTipo('')} style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕ Limpar</button>
        </div>
      )}

      {/* Lista */}
      <Card>
        <CardTitle>{filtrados.length} {filtroTipo ? TIPOS[filtroTipo]?.titulo : 'alertas ativos'}</CardTitle>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.brand }}>Nenhum alerta ativo</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Todas as entregas estão sob controle</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtrados.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 16px', borderRadius: 10,
                background: a.cor + '06', border: `1px solid ${a.cor}18`,
                borderLeft: `4px solid ${a.cor}`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = a.cor + '0E'}
              onMouseLeave={e => e.currentTarget.style.background = a.cor + '06'}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{a.icon}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.cor }}>{a.titulo}</span>
                    {a.diasAtraso > 0 && (
                      <span style={{ fontSize: 10, background: a.cor + '18', color: a.cor, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                        {a.diasAtraso}d
                      </span>
                    )}
                    {a.valor > 50000 && (
                      <span style={{ fontSize: 10, background: '#FEF2F2', color: C.danger, padding: '1px 7px', borderRadius: 10, fontWeight: 700, border: `1px solid ${C.danger}22` }}>
                        Alto valor
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, color: C.brand, fontWeight: 500, marginBottom: 2 }}>
                    Pedido <strong style={{ color: C.accent }}>#{a.pedido.numero_pedido}</strong>
                    {a.pedido.comprador && !a.pedido.comprador.includes('identificado') && (
                      <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: (CORES_COMP[a.pedido.comprador] || C.muted) + '18', color: CORES_COMP[a.pedido.comprador] || C.muted }}>
                        {a.pedido.comprador.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: C.muted }}>
                    <span style={{ fontWeight: 500, color: C.brand }}>{a.pedido.fornecedor}</span>
                    {' · '}
                    <span style={{ maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{a.pedido.descricao_produto}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>{fmtCurrency(a.valor)}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(a.pedido.data_prevista_entrega)}</span>
                  <button onClick={() => setResolvendo(a)} style={{
                    fontSize: 11, padding: '4px 12px', borderRadius: 6,
                    border: `1px solid ${a.cor}`, background: 'white',
                    color: a.cor, cursor: 'pointer', fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = a.cor; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = a.cor }}
                  >{a.acao}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
        💡 <strong>Sobre "Sem datas cadastradas":</strong> 87% dos pedidos não têm data de embarque/entrega preenchida no Sankhya. Este alerta só aparece para pedidos com mais de 7 dias. Recomenda-se padronizar o preenchimento dos campos <strong>AD_DTEMBARQUE</strong> e <strong>DTPREVENT</strong> no momento da emissão da OC.
      </div>
    </div>
  )
}
