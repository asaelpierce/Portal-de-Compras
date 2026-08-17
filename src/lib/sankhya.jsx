// ── Link direto para abrir nota/pedido no Sankhya ────────────────────────────
const SERVIDOR = 'http://kalenborn.snk.ativy.com:40167'

const CLASSE_POR_TIPMOV = {
  'O': 'br.com.sankhya.com.mov.CentralNotas_COMPRA',
  'C': 'br.com.sankhya.com.mov.CentralNotas_COMPRA',
  'V': 'br.com.sankhya.com.mov.CentralNotas_VENDA',
}

function b64(texto) {
  return btoa(unescape(encodeURIComponent(texto)))
}

export function linkSankhya({ nunota, tipmov = 'O', codtipoper = 0 }) {
  if (!nunota) return null
  const classe = CLASSE_POR_TIPMOV[tipmov] || CLASSE_POR_TIPMOV['O']
  const agora  = Date.now()
  const params = {
    NUNOTA:       Number(nunota),
    TIPMOV:       tipmov,
    ehPedidoW:    false,
    CODTIPOPER:   Number(codtipoper) || 0,
    TIPOPORTAL:   'PC',
    forceNewHash: agora,
  }
  const blocoA = b64(classe)
  const blocoB = b64(JSON.stringify(params))
  return `${SERVIDOR}/mge/system.jsp#app/${blocoA}/${blocoB}&pk-refresh=${agora}`
}

export function BtnSankhya({ nunota, tipmov = 'O', codtipoper = 0, label, style = {} }) {
  if (!nunota) return null
  const url = linkSankhya({ nunota, tipmov, codtipoper })
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Abrir nota ${nunota} no Sankhya`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 6,
        border: '1px solid #1A3A5C44', background: '#EEF2FF',
        color: '#1A3A5C', fontSize: 11, fontWeight: 600,
        textDecoration: 'none', cursor: 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background='#1A3A5C'; e.currentTarget.style.color='white' }}
      onMouseLeave={e => { e.currentTarget.style.background='#EEF2FF'; e.currentTarget.style.color='#1A3A5C' }}
    >
      🔗 {label || `#${nunota}`}
    </a>
  )
}
