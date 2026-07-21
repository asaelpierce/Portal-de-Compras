import { C } from '../lib/tokens'

export function Badge({ cfg, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}33`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {label || cfg.label}
    </span>
  )
}

export function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '20px 24px',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 18, color, opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: C.subtle }}>{sub}</div>}
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '20px', ...style,
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: C.textStrong, marginBottom: 14 }}>{children}</div>
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '7px 12px', color: C.text,
        fontSize: 12, outline: 'none', width: 240,
      }}
    />
  )
}

export function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '7px 12px', color: C.text,
      fontSize: 12, cursor: 'pointer', outline: 'none',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function DataTable({ columns, rows, emptyMsg = 'Nenhum dado encontrado' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{
                padding: '9px 12px', textAlign: 'left',
                color: C.subtle, fontWeight: 500, fontSize: 10,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={columns.length} style={{ padding: 32, textAlign: 'center', color: C.subtle }}>{emptyMsg}</td></tr>
            : rows.map((row, i) => (
              <tr key={i}
                style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map((c, j) => (
                  <td key={j} style={{ padding: '9px 12px', color: C.text, ...c.tdStyle }}>
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

export function Ellipsis({ children, maxWidth = 180, title }) {
  return (
    <span title={title || children} style={{
      display: 'block', maxWidth, overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{children || '—'}</span>
  )
}

export function Pill({ children }) {
  return (
    <span style={{
      background: '#1E293B', border: `1px solid ${C.border}`,
      borderRadius: 5, padding: '2px 8px', fontSize: 10, color: C.muted,
    }}>{children || '—'}</span>
  )
}

export function AlertaBanner({ count, onView }) {
  if (!count) return null
  return (
    <div style={{
      background: '#2D1A00', border: `1px solid ${C.amber}44`,
      borderRadius: 10, padding: '12px 18px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 18 }}>⚠</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.amberText }}>
          {count} {count === 1 ? 'pedido requer' : 'pedidos requerem'} verificação de embarque
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          A data de embarque passou e o material ainda não chegou. O comprador deve verificar com o fornecedor e decidir sobre multa.
        </div>
      </div>
      <button onClick={onView} style={{
        padding: '6px 14px', borderRadius: 7, border: `1px solid ${C.amber}44`,
        background: C.amberDim, color: C.amberText, fontSize: 12,
        cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
      }}>Ver pedidos</button>
    </div>
  )
}

export function ModalMulta({ pedido, onDecide, onClose }) {
  if (!pedido) return null
  const dias = pedido.dias_atraso_embarque != null ? Math.round(pedido.dias_atraso_embarque) : null

  return (
    <div style={{
      minHeight: 400, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.borderL}`,
        borderRadius: 16, padding: 28, width: 480, maxWidth: '95%',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.textStrong, marginBottom: 6 }}>
          Verificação de embarque
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
          A data de embarque passou. Verifique com o fornecedor se o material foi embarcado antes de tomar uma decisão.
        </div>

        <div style={{ background: C.surface, borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Pedido', pedido.numero_pedido],
            ['Fornecedor', pedido.fornecedor],
            ['Produto', pedido.descricao_produto],
            ['Data de embarque', pedido.data_embarque ? new Date(pedido.data_embarque).toLocaleDateString('pt-BR') : '—'],
            ['Dias desde o embarque', dias != null ? `${dias} dias` : '—'],
            ['Qtd pendente', pedido.quantidade_pendente],
            ['Valor do pedido', `R$ ${parseFloat(pedido.valor_total_pedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              <span style={{ color: C.muted }}>{l}</span>
              <span style={{ color: C.text, fontWeight: 500, maxWidth: 260, textAlign: 'right' }}>{v || '—'}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          O fornecedor embarcou o material?
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onDecide(pedido, 'EMBARCADO')} style={{
            flex: 1, padding: '10px', borderRadius: 8,
            border: `1px solid ${C.success}44`, background: C.okDim,
            color: C.okText, fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>Sim — material embarcado</button>
          <button onClick={() => onDecide(pedido, 'MULTA')} style={{
            flex: 1, padding: '10px', borderRadius: 8,
            border: `1px solid ${C.danger}44`, background: C.dangerDim,
            color: C.dangerText, fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>Não — registrar multa</button>
        </div>
        <button onClick={onClose} style={{
          width: '100%', marginTop: 10, padding: '8px',
          borderRadius: 8, border: `1px solid ${C.border}`,
          background: 'transparent', color: C.muted,
          fontSize: 12, cursor: 'pointer',
        }}>Decidir depois</button>
      </div>
    </div>
  )
}
