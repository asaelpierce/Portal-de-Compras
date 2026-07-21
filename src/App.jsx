import { useState } from 'react'
import { useSupplyData } from './hooks/useSupplyData'
import Dashboard from './components/Dashboard'
import Pedidos from './components/Pedidos'
import FollowUp from './components/FollowUp'
import { NFsView, CruzamentoView } from './components/NFs'
import { GeradorMulta, AvaliacaoIDF } from './components/MultaIDF'
import { DateInput } from './components/UI'
import { C } from './lib/tokens'

const PAGES = [
  { id: 'dashboard',  label: 'Dashboard',        icon: '📊' },
  { id: 'pedidos',    label: 'Pedidos em aberto', icon: '📦' },
  { id: 'followup',   label: 'Follow-up',         icon: '🔄' },
  { id: 'nfs',        label: 'NFs recebidas',     icon: '🧾' },
  { id: 'cruzamento', label: 'OC × NF',           icon: '🔗' },
  { id: 'multa',      label: 'Multa',             icon: '⚠️' },
  { id: 'idf',        label: 'IDF Fornecedores',  icon: '📈' },
]

const hoje = new Date().toISOString().split('T')[0]
const inicioAno = '2026-01-01'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [dataInicio, setDataInicio] = useState(inicioAno)
  const [dataFim, setDataFim] = useState(hoje)
  const [sideOpen, setSideOpen] = useState(true)

  const { pedidos, nfs, alertasMulta, loading, error, lastSync, reload } =
    useSupplyData({ dataInicio, dataFim })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>

      {/* SIDEBAR */}
      <div style={{
        width: sideOpen ? 220 : 60, flexShrink: 0,
        background: C.brand, display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{
          padding: sideOpen ? '20px 16px 16px' : '20px 10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <img
            src="/logo-branca.png"
            alt="Kalenborn"
            style={{ height: 28, objectFit: 'contain', flexShrink: 0, display: sideOpen ? 'block' : 'none' }}
          />
          {!sideOpen && (
            <div style={{
              width: 36, height: 36, background: '#F5E500', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: C.brand,
            }}>K</div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {PAGES.map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: sideOpen ? '10px 16px' : '10px',
              justifyContent: sideOpen ? 'flex-start' : 'center',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: page === p.id ? 'rgba(245,229,0,0.15)' : 'transparent',
              color: page === p.id ? '#F5E500' : 'rgba(255,255,255,0.7)',
              borderLeft: page === p.id ? '3px solid #F5E500' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (page !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { if (page !== p.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
              {sideOpen && <span>{p.label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle sidebar */}
        <button onClick={() => setSideOpen(s => !s)} style={{
          margin: 12, padding: '8px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: 12,
        }}>{sideOpen ? '← Recolher' : '→'}</button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOPBAR */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 24px', height: 56,
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.brand }}>
            {PAGES.find(p => p.id === page)?.icon} {PAGES.find(p => p.id === page)?.label}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Filtros de data */}
            <DateInput label="De" value={dataInicio} onChange={setDataInicio} />
            <DateInput label="Até" value={dataFim} onChange={setDataFim} />

            {lastSync && (
              <span style={{ fontSize: 11, color: C.muted }}>
                Sync {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={reload} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 7, border: `1px solid ${C.border}`,
              background: loading ? C.bg : C.brand, color: loading ? C.muted : 'white',
              fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
            }}>
              <span style={{ display: 'inline-block', animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: C.muted, fontSize: 13 }}>Carregando dados do Sankhya…</span>
            </div>
          ) : error ? (
            <div style={{ background: C.dangerDim, border: `1px solid ${C.danger}`, borderRadius: 10, padding: 20, color: C.dangerText, fontSize: 13 }}>
              ⚠ Erro: {error}
            </div>
          ) : (
            <>
              {page === 'dashboard'  && <Dashboard pedidos={pedidos} nfs={nfs} onVerificarEmbarque={() => setPage('pedidos')} />}
              {page === 'pedidos'    && <Pedidos pedidos={pedidos} onReload={reload} />}
              {page === 'followup'   && <FollowUp pedidos={pedidos} nfs={nfs} />}
              {page === 'nfs'        && <NFsView nfs={nfs} />}
              {page === 'cruzamento' && <CruzamentoView pedidos={pedidos} nfs={nfs} />}
              {page === 'multa'      && <GeradorMulta pedidos={pedidos} alertasMulta={alertasMulta} onReload={reload} />}
              {page === 'idf'        && <AvaliacaoIDF pedidos={pedidos} nfs={nfs} />}
            </>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
      `}</style>
    </div>
  )
}
