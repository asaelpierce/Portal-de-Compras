import { useState } from 'react'
import { useSupplyData } from './hooks/useSupplyData'
import Dashboard from './components/Dashboard'
import Pedidos from './components/Pedidos'
import FollowUp from './components/FollowUp'
import { NFsView, CruzamentoView } from './components/NFs'
import { GeradorMulta, AvaliacaoIDF } from './components/MultaIDF'
import SavingDash from './components/SavingDash'
import Alertas from './components/Alertas'
import EntregaParcial from './components/EntregaParcial'
import XMLAnalise from './components/XMLAnalise'
import Recebimentos from './components/Recebimentos'
import Divergencias from './components/Divergencias'
import Governanca from './components/Governanca'
import Lembretes from './components/Lembretes'
import { DateInput } from './components/UI'
import { C } from './lib/tokens'

const PAGES = [
  { id: 'dashboard',   label: 'Dashboard',         icon: '📊', group: 'Visão Geral' },
  { id: 'alertas',     label: 'Alertas',            icon: '🔔', group: 'Visão Geral', badge: true },
  { id: 'lembretes',   label: 'Lembretes',          icon: '🔔', group: 'Visão Geral' },
  { id: 'pedidos',     label: 'Pedidos',            icon: '📦', group: 'Compras' },
  { id: 'importacao',  label: 'Importação',         icon: '✈️', group: 'Compras' },
  { id: 'parcial',     label: 'Entrega parcial',    icon: '📊', group: 'Compras' },
  { id: 'nfs',         label: 'NFs recebidas',      icon: '🧾', group: 'Compras' },
  { id: 'divergencias', label: 'Divergências NF', icon: '🔎', group: 'Análise' },
  { id: 'cruzamento',  label: 'OC × NF',            icon: '🔗', group: 'Compras' },
  { id: 'recebimentos',label: 'Recebimentos',       icon: '📋', group: 'Compras' },
  { id: 'saving',      label: 'Compradores',        icon: '👥', group: 'Análise' },
  { id: 'governanca',  label: 'Governança',         icon: '🔍', group: 'Análise' },
  { id: 'idf',         label: 'IDF Fornecedores',   icon: '📈', group: 'Análise' },
  { id: 'multa',       label: 'Multa',              icon: '⚠️', group: 'Análise' },
  { id: 'xml',         label: 'Analisador XML',     icon: '🤖', group: 'Análise' },
]

const GROUPS = ['Visão Geral', 'Compras', 'Análise']
const hoje = new Date().toISOString().split('T')[0]

export default function App() {
  const [page, setPage]             = useState('dashboard')
  const [dataInicio, setDataInicio] = useState('2026-01-01')
  const [dataFim, setDataFim]       = useState(hoje)
  const [sideOpen, setSideOpen]     = useState(true)

  const { pedidos, nfs, alertasMulta, loading, error, lastSync, reload } =
    useSupplyData({ dataInicio, dataFim })

  const pedidosNacionais   = pedidos.filter(p => p.tipo_pedido !== 'importacao')
  const pedidosImportacao  = pedidos.filter(p => p.tipo_pedido === 'importacao')
  const pedidosParciais    = pedidos.filter(p =>
    parseFloat(p.quantidade_entregue) > 0 && parseFloat(p.quantidade_pendente) > 0
  )

  const alertasAtivos = pedidos.filter(p => p.prioridade <= 2).length
  const parciais      = pedidosParciais.length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>

      {/* SIDEBAR */}
      <aside style={{
        width: sideOpen ? 224 : 64, flexShrink: 0,
        background: C.brand, display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: sideOpen ? '20px 18px 16px' : '20px 14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: 72, display: 'flex', alignItems: 'center' }}>
          {sideOpen
            ? <img src="/logo-branca.png" alt="Kalenborn" style={{ height: 28, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
            : <div style={{ width: 36, height: 36, background: '#F5E500', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#1A1A1A' }}>K</div>
          }
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {GROUPS.map(group => {
            const groupPages = PAGES.filter(p => p.group === group)
            return (
              <div key={group}>
                {sideOpen && (
                  <div style={{ padding: '12px 18px 4px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {group}
                  </div>
                )}
                {groupPages.map(p => {
                  const active = page === p.id
                  const badgeCount = p.badge ? alertasAtivos : p.id === 'parcial' ? parciais : 0
                  return (
                    <button key={p.id} onClick={() => setPage(p.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: 10, padding: sideOpen ? '9px 18px' : '10px',
                      justifyContent: sideOpen ? 'flex-start' : 'center',
                      border: 'none', cursor: 'pointer', fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      background: active ? 'rgba(245,229,0,0.12)' : 'transparent',
                      color: active ? '#F5E500' : 'rgba(255,255,255,0.65)',
                      borderLeft: active ? '3px solid #F5E500' : '3px solid transparent',
                      transition: 'all 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.9)' }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.65)' }}}
                    >
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{p.icon}</span>
                      {sideOpen && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>}
                      {badgeCount > 0 && (
                        <span style={{ minWidth: 18, height: 18, background: p.badge ? C.danger : C.warning, borderRadius: 9, fontSize: 10, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {sideOpen && lastSync && (
          <div style={{ padding: '8px 18px', fontSize: 10, color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            Sync {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <button onClick={() => setSideOpen(s => !s)} style={{
          margin: '8px 10px', padding: '7px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', fontSize: 11, transition: 'all 0.15s',
        }}>
          {sideOpen ? '◀ Recolher' : '▶'}
        </button>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 24px', height: 56,
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.brand }}>
              {PAGES.find(p => p.id === page)?.icon} {PAGES.find(p => p.id === page)?.label}
            </div>
            {lastSync && <div style={{ fontSize: 10, color: C.muted }}>Atualizado às {lastSync.toLocaleTimeString('pt-BR')}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <DateInput label="De"  value={dataInicio} onChange={setDataInicio} />
            <DateInput label="Até" value={dataFim}    onChange={setDataFim} />
            <button onClick={reload} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              borderRadius: 8, border: 'none',
              background: loading ? C.border : C.brand,
              color: 'white', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}>
              <span style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none', display: 'inline-block' }}>↻</span>
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5E500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.brand }}>K</div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 44, height: 44, border: `3px solid ${C.border}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.brand }}>Carregando dados do Sankhya…</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Conectando via Edge Functions</div>
              </div>
            </div>
          ) : error ? (
            <div style={{ background: C.dangerDim, border: `1px solid ${C.danger}`, borderRadius: 12, padding: '20px 24px', color: C.dangerText, fontSize: 13 }}>
              <strong>⚠ Erro:</strong> {error}
            </div>
          ) : (
            <>
              {page === 'dashboard'    && <Dashboard      pedidos={pedidos} nfs={nfs} onVerificarEmbarque={() => setPage('alertas')} />}
              {page === 'alertas'      && <Alertas         pedidos={pedidos} onReload={reload} />}
              {page === 'lembretes'    && <Lembretes       pedidos={pedidos} />}
              {page === 'pedidos'      && <Pedidos         pedidos={pedidosNacionais} onReload={reload} />}
              {page === 'importacao'   && <Pedidos         pedidos={pedidosImportacao} onReload={reload} isImportacao />}
              {page === 'parcial'      && <EntregaParcial  pedidos={pedidosParciais} />}
              {page === 'nfs'          && <NFsView         nfs={nfs} />}
              {page === 'cruzamento'   && <CruzamentoView  pedidos={pedidos} nfs={nfs} />}
              {page === 'recebimentos' && <Recebimentos />}
              {page === 'divergencias' && <Divergencias />}
              {page === 'saving'       && <SavingDash      pedidos={pedidos} />}
              {page === 'governanca'   && <Governanca      pedidos={pedidos} />}
              {page === 'idf'          && <AvaliacaoIDF    pedidos={pedidos} nfs={nfs} />}
              {page === 'multa'        && <GeradorMulta    pedidos={pedidos} alertasMulta={alertasMulta} onReload={reload} />}
              {page === 'xml'          && <XMLAnalise />}
            </>
          )}
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: ${C.bg}; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderL}; }
        nav::-webkit-scrollbar { width: 3px; }
        nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        input[type=date]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.5; }
        select { -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239CA3AF'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px !important; }
      `}</style>
    </div>
  )
}
