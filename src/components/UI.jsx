import { C } from '../lib/tokens'

export function Badge({ cfg, label }) {
  if (!cfg) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {label || cfg.label}
    </span>
  )
}

export function KpiCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px 22px',
      borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 6,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
    onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 20, opacity: 0.6 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: C.brand, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', ...style,
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>{children}</div>
      {action}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '7px 12px 7px 30px',
          color: C.text, fontSize: 13, outline: 'none', width: 240,
        }}
      />
    </div>
  )
}

export function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '7px 12px', color: C.text,
      fontSize: 12, cursor: 'pointer', outline: 'none',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function DateInput({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label && <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{label}</span>}
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '6px 10px', color: C.text,
          fontSize: 12, outline: 'none', cursor: 'pointer',
        }}
      />
    </div>
  )
}

export function DataTable({ columns, rows, emptyMsg = 'Nenhum dado encontrado' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            {columns.map((c, i) => (
              <th key={i} style={{
                padding: '10px 12px', textAlign: 'left',
                color: C.muted, fontWeight: 600, fontSize: 11,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: C.subtle }}>{emptyMsg}</td></tr>
            : rows.map((row, i) => (
              <tr key={i}
                style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#FAFAFA' : C.surface }}
                onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#FAFAFA' : C.surface}
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
    <span title={title || (typeof children === 'string' ? children : '')} style={{
      display: 'block', maxWidth, overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{children || '—'}</span>
  )
}

export function Pill({ children }) {
  return (
    <span style={{
      background: '#F3F4F6', border: `1px solid ${C.border}`,
      borderRadius: 5, padding: '2px 8px', fontSize: 11, color: C.muted,
    }}>{children || '—'}</span>
  )
}

export function AlertaBanner({ count, onView }) {
  if (!count) return null
  return (
    <div style={{
      background: '#FFFBEB', border: `1px solid #FCD34D`,
      borderLeft: `4px solid #D97706`,
      borderRadius: 8, padding: '12px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
          {count} {count === 1 ? 'pedido requer' : 'pedidos requerem'} verificação de embarque
        </div>
        <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
          Data de embarque passou e o material ainda não chegou. Verifique com o fornecedor.
        </div>
      </div>
      <button onClick={onView} style={{
        padding: '6px 14px', borderRadius: 7,
        border: '1px solid #D97706', background: '#D97706',
        color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 500,
      }}>Ver pedidos</button>
    </div>
  )
}

export function ModalMulta({ pedido, onDecide, onClose }) {
  if (!pedido) return null
  const dias = pedido.dias_atraso_embarque != null ? Math.round(pedido.dias_atraso_embarque) : null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 28, width: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, marginBottom: 4 }}>
          Verificação de embarque
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          Verifique com o fornecedor se o material foi embarcado antes de decidir.
        </div>
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          {[
            ['Pedido', pedido.numero_pedido],
            ['Fornecedor', pedido.fornecedor],
            ['Produto', pedido.descricao_produto],
            ['Data de embarque', pedido.data_embarque],
            ['Dias desde o embarque', dias != null ? `${dias} dias` : '—'],
            ['Qtd pendente', pedido.quantidade_pendente],
            ['Valor do pedido', pedido.valor_total_pedido ? `R$ ${parseFloat(pedido.valor_total_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: `1px solid ${C.border}`, padding: '6px 0' }}>
              <span style={{ color: C.muted }}>{l}</span>
              <span style={{ color: C.brand, fontWeight: 500 }}>{v || '—'}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.brand, marginBottom: 10 }}>O fornecedor embarcou o material?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onDecide(pedido, 'EMBARCADO')} style={{
            flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.success}`,
            background: C.okDim, color: C.okText, fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>✓ Sim — material embarcado</button>
          <button onClick={() => onDecide(pedido, 'MULTA')} style={{
            flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.danger}`,
            background: C.dangerDim, color: C.dangerText, fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>✗ Não — registrar multa</button>
        </div>
        <button onClick={onClose} style={{
          width: '100%', marginTop: 8, padding: '8px',
          borderRadius: 8, border: `1px solid ${C.border}`,
          background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer',
        }}>Decidir depois</button>
      </div>
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', disabled }) {
  const styles = {
    primary: { background: C.brand, color: 'white', border: `1px solid ${C.brand}` },
    outline: { background: 'transparent', color: C.brand, border: `1px solid ${C.borderL}` },
    danger:  { background: C.danger, color: 'white', border: `1px solid ${C.danger}` },
    yellow:  { background: C.yellow, color: C.brand, border: `1px solid ${C.yellow}` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s', ...styles[variant],
    }}>{children}</button>
  )
}
