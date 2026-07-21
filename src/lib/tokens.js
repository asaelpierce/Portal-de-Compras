export const C = {
  bg:         '#0B0E17',
  surface:    '#111520',
  card:       '#161B2E',
  cardHover:  '#1C2340',
  border:     '#1E2540',
  borderL:    '#2A3358',
  accent:     '#2563EB',
  accentDim:  '#1E3A8A',
  accentText: '#60A5FA',
  danger:     '#EF4444',
  dangerDim:  '#450A0A',
  dangerText: '#FCA5A5',
  warning:    '#F59E0B',
  warnDim:    '#451A03',
  warnText:   '#FCD34D',
  success:    '#10B981',
  okDim:      '#022C22',
  okText:     '#6EE7B7',
  muted:      '#94A3B8',
  subtle:     '#475569',
  text:       '#E2E8F0',
  textStrong: '#F8FAFC',
  amber:      '#F59E0B',
  amberDim:   '#451A03',
  amberText:  '#FCD34D',
}

export const STATUS_EMBARQUE = {
  ALERTA:    { color: C.amberText,  bg: C.amberDim,  border: C.amber,   dot: C.amber,   label: 'Verificar embarque' },
  EM_BREVE:  { color: C.warnText,   bg: C.warnDim,   border: C.warning,  dot: C.warning,  label: 'Embarca em breve' },
  NO_PRAZO:  { color: C.okText,     bg: C.okDim,     border: C.success,  dot: C.success,  label: 'No prazo' },
  SEM_DATA:  { color: C.muted,      bg: C.surface,   border: C.borderL,  dot: C.subtle,   label: 'Sem data embarque' },
  ENTREGUE:  { color: C.okText,     bg: C.okDim,     border: C.success,  dot: C.success,  label: 'Entregue' },
}

export const STATUS_ENTREGA = {
  ATRASADO:  { color: C.dangerText, bg: C.dangerDim, border: C.danger,   dot: C.danger,   label: 'Entrega atrasada' },
  EM_BREVE:  { color: C.warnText,   bg: C.warnDim,   border: C.warning,  dot: C.warning,  label: 'Entrega em breve' },
  NO_PRAZO:  { color: C.okText,     bg: C.okDim,     border: C.success,  dot: C.success,  label: 'No prazo' },
  SEM_DATA:  { color: C.muted,      bg: C.surface,   border: C.borderL,  dot: C.subtle,   label: 'Sem data prevista' },
  ENTREGUE:  { color: C.okText,     bg: C.okDim,     border: C.success,  dot: C.success,  label: 'Entregue' },
}

export const SITUACAO_ENTREGA = {
  NO_PRAZO:   { color: C.okText,     bg: C.okDim,     label: 'Recebido no prazo' },
  ATRASO:     { color: C.warnText,   bg: C.warnDim,   label: 'Recebido com atraso' },
  AGUARDANDO: { color: C.muted,      bg: C.surface,   label: 'Aguardando' },
}
