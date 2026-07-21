-- PEDIDOS EM ABERTO
CREATE TABLE IF NOT EXISTS pedidos_abertos (
  id                      BIGSERIAL PRIMARY KEY,
  numero_pedido           NUMERIC NOT NULL,
  data_pedido             TIMESTAMPTZ,
  data_embarque           TIMESTAMPTZ,       -- AD_DTEMBARQUE: quando sai do fornecedor
  data_prevista_entrega   TIMESTAMPTZ,       -- DTPREVENT: quando deve chegar na fabrica
  cod_fornecedor          NUMERIC,
  fornecedor              TEXT,
  codigo_produto          NUMERIC,
  descricao_produto       TEXT,
  quantidade_pedida       NUMERIC,
  quantidade_entregue     NUMERIC DEFAULT 0,
  quantidade_pendente     NUMERIC,
  valor_item              NUMERIC,
  valor_total_pedido      NUMERIC,
  projeto                 TEXT,
  dias_atraso_embarque    NUMERIC,
  dias_atraso_entrega     NUMERIC,
  prioridade              INTEGER DEFAULT 5,
  atualizado_em           TIMESTAMPTZ DEFAULT NOW()
);

-- NFS DE ENTRADA
CREATE TABLE IF NOT EXISTS nfs_entrada (
  id                    BIGSERIAL PRIMARY KEY,
  numero_nf             NUMERIC NOT NULL,
  data_emissao          TIMESTAMPTZ,
  data_recebimento      TIMESTAMPTZ,
  cod_fornecedor        NUMERIC,
  fornecedor            TEXT,
  codigo_produto        NUMERIC,
  descricao_produto     TEXT,
  quantidade_recebida   NUMERIC,
  valor_item            NUMERIC,
  valor_total_nf        NUMERIC,
  projeto               TEXT,
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ALERTAS DE MULTA: decisoes do comprador sobre embarques atrasados
CREATE TABLE IF NOT EXISTS alertas_multa (
  id                BIGSERIAL PRIMARY KEY,
  numero_pedido     NUMERIC,
  fornecedor        TEXT,
  codigo_produto    NUMERIC,
  data_embarque     TIMESTAMPTZ,
  decisao           TEXT CHECK (decisao IN ('EMBARCADO', 'MULTA', 'PENDENTE')),
  observacao        TEXT,
  decidido_em       TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_pedidos_forn      ON pedidos_abertos(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_pedidos_prod      ON pedidos_abertos(codigo_produto);
CREATE INDEX IF NOT EXISTS idx_pedidos_prioridade ON pedidos_abertos(prioridade);
CREATE INDEX IF NOT EXISTS idx_pedidos_embarque  ON pedidos_abertos(data_embarque);
CREATE INDEX IF NOT EXISTS idx_pedidos_entrega   ON pedidos_abertos(data_prevista_entrega);
CREATE INDEX IF NOT EXISTS idx_nfs_forn          ON nfs_entrada(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nfs_prod          ON nfs_entrada(codigo_produto);
CREATE INDEX IF NOT EXISTS idx_nfs_receb         ON nfs_entrada(data_recebimento);

-- RLS
ALTER TABLE pedidos_abertos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfs_entrada       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_multa     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_pedidos"  ON pedidos_abertos  FOR ALL USING (true);
CREATE POLICY "allow_all_nfs"      ON nfs_entrada       FOR ALL USING (true);
CREATE POLICY "allow_all_alertas"  ON alertas_multa     FOR ALL USING (true);
