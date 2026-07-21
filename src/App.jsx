import { useState } from 'react'
import { useSupplyData } from './hooks/useSupplyData'
import Dashboard from './components/Dashboard'
import Pedidos from './components/Pedidos'
import { NFsView, CruzamentoView } from './components/NFs'
import { GeradorMulta, AvaliacaoIDF } from './components/MultaIDF'
import { C } from './lib/tokens'

const PAGES = [
  { id: 'dashboard',   label: 'Dashboard'         },
  { id: 'pedidos',     label: 'Pedidos em aberto' },
  { id: 'nfs',         label: 'NFs recebidas'     },
  { id: 'cruzamento',  label: 'OC × NF'           },
  { id: 'multa',       label: 'Multa'             },
  { id: 'idf',         label: 'IDF Fornecedores'  },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const { pedidos, nfs, loading, error, lastSync, reload } = useSupplyData()

  const handleVerificarEmbarque = () => setPage('pedidos')

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 24px',
        height: 54, background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: C.accentDim, border: `1px solid ${C.accentText}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: C.accentText, fontWeight: 700,
          }}>SC</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.textStrong }}>Supply Chain</span>
          <span style={{
            fontSize: 10, color: C.subtle, background: C.card,
            padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.border}`,
          }}>Kalenborn</span>
        </div>

        <nav style={{ display: 'flex', gap: 2 }}>
          {PAGES.map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
              background: page === p.id ? C.accentDim : 'transparent',
              color: page === p.id ? C.accentText : C.muted,
              fontWeight: page === p.id ? 600 : 400,
            }}>{p.label}</button>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastSync && (
            <span style={{ fontSize: 11, color: C.subtle }}>
              Atualizado {lastSync.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <button onClick={reload} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${C.borderL}`,
            background: 'transparent', color: C.muted,
            fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            <span style={{ display: 'inline-block', animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
            {loading ? 'Carregando…' : 'Sincronizar'}
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: C.accentDim, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: C.accentText, fontWeight: 600,
          }}>SC</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '22px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, gap: 14 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: C.subtle, fontSize: 13 }}>Carregando dados do Supabase…</span>
          </div>
        ) : error ? (
          <div style={{ background: C.dangerDim, border: `1px solid ${C.danger}44`, borderRadius: 12, padding: 24, color: C.dangerText, fontSize: 13 }}>
            Erro ao carregar dados: {error}
          </div>
        ) : (
          <>
            {page === 'dashboard'  && <Dashboard pedidos={pedidos} nfs={nfs} onVerificarEmbarque={handleVerificarEmbarque} />}
            {page === 'pedidos'    && <Pedidos pedidos={pedidos} onReload={reload} />}
            {page === 'nfs'        && <NFsView nfs={nfs} />}
            {page === 'cruzamento' && <CruzamentoView pedidos={pedidos} nfs={nfs} />}
            {page === 'multa'      && <GeradorMulta pedidos={pedidos} />}
            {page === 'idf'        && <AvaliacaoIDF pedidos={pedidos} nfs={nfs} />}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
