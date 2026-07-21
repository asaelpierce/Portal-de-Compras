// Design tokens — tema claro Kalenborn
export const C = {
  // Base
  bg:         '#F5F5F3',
  surface:    '#FFFFFF',
  card:       '#FFFFFF',
  cardHover:  '#F9F9F7',
  border:     '#E5E5E2',
  borderL:    '#D0D0CC',

  // Marca Kalenborn
  brand:      '#1A1A1A',
  brandDim:   '#2D2D2D',
  yellow:     '#F5E500',
  yellowDim:  '#FFF9C4',

  // Accent (azul corporativo)
  accent:     '#1D4ED8',
  accentDim:  '#EFF6FF',
  accentText: '#1D4ED8',

  // Semânticos
  danger:     '#DC2626',
  dangerDim:  '#FEF2F2',
  dangerText: '#DC2626',
  warning:    '#D97706',
  warnDim:    '#FFFBEB',
  warnText:   '#D97706',
  success:    '#059669',
  okDim:      '#ECFDF5',
  okText:     '#059669',
  amber:      '#D97706',
  amberDim:   '#FFFBEB',
  amberText:  '#92400E',

  // Texto
  text:       '#1A1A1A',
  textStrong: '#000000',
  muted:      '#6B7280',
  subtle:     '#9CA3AF',
}

export const STATUS_EMBARQUE = {
  ALERTA:    { color: C.amberText, bg: C.amberDim,  border: C.amber,   dot: C.amber,   label: 'Verificar embarque' },
  EM_BREVE:  { color: C.warnText,  bg: C.warnDim,   border: C.warning, dot: C.warning, label: 'Embarca em breve'   },
  NO_PRAZO:  { color: C.okText,    bg: C.okDim,     border: C.success, dot: C.success, label: 'No prazo'           },
  SEM_DATA:  { color: C.muted,     bg: '#F9FAFB',   border: C.border,  dot: C.subtle,  label: 'Sem data embarque'  },
  ENTREGUE:  { color: C.okText,    bg: C.okDim,     border: C.success, dot: C.success, label: 'Entregue'           },
}

export const STATUS_ENTREGA = {
  ATRASADO:  { color: C.dangerText, bg: C.dangerDim, border: C.danger,  dot: C.danger,  label: 'Atrasado'          },
  EM_BREVE:  { color: C.warnText,   bg: C.warnDim,   border: C.warning, dot: C.warning, label: 'Vence em breve'    },
  NO_PRAZO:  { color: C.okText,     bg: C.okDim,     border: C.success, dot: C.success, label: 'No prazo'          },
  SEM_DATA:  { color: C.muted,      bg: '#F9FAFB',   border: C.border,  dot: C.subtle,  label: 'Sem data prevista' },
  ENTREGUE:  { color: C.okText,     bg: C.okDim,     border: C.success, dot: C.success, label: 'Entregue'          },
}

export const SITUACAO_ENTREGA = {
  NO_PRAZO:   { color: C.okText,    bg: C.okDim,    label: 'Recebido no prazo'   },
  ATRASO:     { color: C.warnText,  bg: C.warnDim,  label: 'Recebido com atraso' },
  AGUARDANDO: { color: C.muted,     bg: '#F9FAFB',  label: 'Aguardando'          },
}
