import { useMemo, useState } from 'react'
import { Card, CardTitle, DataTable, Ellipsis, Btn } from './UI'
import { C } from '../lib/tokens'
import { fmtDate, fmtCurrency, statusEmbarque, statusEntrega, diasDiferenca } from '../lib/utils'
import { supabase } from '../lib/supabase'

const TIPOS = {
  EMBARQUE_VENCIDO:  { icon: '🚚', cor: C.amber,   titulo: 'Embarque vencido — sem confirmação',       acao: 'Verificar com fornecedor' },
  ENTREGA_ATRASADA:  { icon: '🔴', cor: C.danger,  titulo: 'Entrega atrasada',                        acao: 'Acionar comprador' },
  VENCE_3_DIAS:      { icon: '⏰', cor: C.warning, titulo: 'Entrega vence em até 3 dias',              acao: 'Confirmar status' },
  SEM_DATA_EMBARQUE: { icon: '📋', cor: C.subtle,  titulo: 'Pedido sem data de embarque cadastrada',   acao: 'Atualizar no Sankhya' },
  ALTO_VALOR_ATRASO: { icon: '💰', cor: C.danger,  titulo: 'Alto valor em atraso',                    acao: 'Prioridade máxima' },
}

export default function Alertas({ pedidos, onReload }) {
  const [resolvendo, setResolvendo] = useState(null)
  const [obs, setObs] = useState('')

  const alertas = useMemo(() => {
    const list = []
    pedidos.forEach(p => {
      const stEmb  = statusEmbarque(p.data_embarque, p.quantidade_pendente)
      const stEnt  = statusEntrega(p.data_prevista_entrega, p.quantidade_pendente)
      const diasAtr = diasDiferenca(p.data_prevista_entrega)
      const valor  = parseFloat(p.valor_total_pedido) || 0

      if (stEmb === 'ALERTA') {
        const tipo = valor > 50000 ? 'ALTO_VALOR_ATRASO' : 'EMBARQUE_VENCIDO'
        list.push({ ...TIPOS[tipo], tipo, pedido: p, diasAtraso: diasDiferenca(p.data_embarque), valor })
      } else if (stEnt === 'ATRASADO') {
        const tipo = valor > 50000 ? 'ALTO_VALOR_ATRASO' : 'ENTREGA_ATRASADA'
        list.push({ ...TIPOS[tipo], tipo, pedido: p, diasAtraso: diasAtr, valor })
      } else if (stEnt === 'EM_BREVE') {
        list.push({ ...TIPOS.VENCE_3_DIAS, tipo: 'VENCE_3_DIAS', pedido: p, diasAtraso: diasAtr, valor })
      } else if (!p.data_embarque && parseFloat(p.quantidade_pendente) > 0) {
        list.push({ ...TIPOS.SEM_DATA_EMBARQUE, tipo: 'SEM_DATA_EMBARQUE', pedido: p, diasAtraso: null, valor })
      }
    })
    return list.sort((a, b) => {
      const prioA = a.tipo === 'ALTO_VALOR_ATRASO' ? 0 : a.tipo === 'EMBARQUE_VENCIDO' ? 1 : a.tipo === 'ENTREGA_ATRASADA' ? 2 : a.tipo === 'VENCE_3_DIAS' ? 3 : 4
      const prioB = b.tipo === 'ALTO_VALOR_ATRASO' ? 0 : b.tipo === 'EMBARQUE_VENCIDO' ? 1 : b.tipo === 'ENTREGA_ATRASADA' ? 2 : b.tipo === 'VENCE_3_DIAS' ? 3 : 4
      return prioA !== prioB ? prioA - prioB : (b.valor - a.valor)
    })
  }, [pedidos])

  const resumo = useMemo(() => {
    const por = {}
    alertas.forEach(a => { por[a.tipo] = (por[a.tipo] || 0) + 1 })
    return por
  }, [alertas])

  const handleResolver = async () => {
    if (!resolvendo) return
    await supabase.from('alertas_multa').insert({
      numero_pedido: resolvendo.pedido.numero_pedido,
      fornecedor:    resolvendo.pedido.fornecedor,
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

      {/* Modal de resolução */}
      {resolvendo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, marginBottom: 4 }}>Registrar resolução</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Pedido {resolvendo.pedido.numero_pedido} · {resolvendo.pedido.fornecedor}</div>
            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: C.muted }}>
              <strong style={{ color: C.brand }}>Alerta:</strong> {resolvendo.titulo}
            </div>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Observação / Ação tomada</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Descreva a ação tomada..." style={{ width: '100%', marginTop: 6, marginBottom: 14, padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={handleResolver}>✓ Registrar</Btn>
              <Btn variant="outline" onClick={() => setResolvendo(null)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {Object.entries(TIPOS).map(([tipo, cfg]) => (
          <div key={tipo} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${cfg.cor}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{cfg.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.brand }}>{resumo[tipo] || 0}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{cfg.titulo}</div>
          </div>
        ))}
      </div>

      {/* Lista de alertas */}
      <Card>
        <CardTitle>{alertas.length} alertas ativos</CardTitle>
        {alertas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 14 }}>Nenhum alerta ativo</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alertas.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: a.cor + '08', border: `1px solid ${a.cor}22`,
                borderLeft: `4px solid ${a.cor}`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = a.cor + '12'}
              onMouseLeave={e => e.currentTarget.style.background = a.cor + '08'}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.cor }}>{a.titulo}</span>
                    {a.diasAtraso > 0 && <span style={{ fontSize: 10, background: a.cor + '20', color: a.cor, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>{a.diasAtraso} dias</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.brand, fontWeight: 500 }}>
                    Pedido <strong style={{ color: C.accent }}>#{a.pedido.numero_pedido}</strong>
                    {a.pedido.comprador && !a.pedido.comprador.includes('identificado') && (
                      <> · <span style={{ color: CORES_COMP?.[a.pedido.comprador] || C.muted }}>{a.pedido.comprador}</span></>
                    )}
                    {' · '}<Ellipsis maxWidth={200} style={{ display: 'inline' }}>{a.pedido.fornecedor}</Ellipsis>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    {a.pedido.descricao_produto} · {fmtCurrency(a.valor)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(a.pedido.data_prevista_entrega)}</span>
                  <button onClick={() => setResolvendo(a)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${a.cor}`, background: 'white', color: a.cor, cursor: 'pointer', fontWeight: 500 }}>{a.acao}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const CORES_COMP = { 'Leonardo Henriques': '#1D4ED8', 'Franciele Dias': '#059669' }
