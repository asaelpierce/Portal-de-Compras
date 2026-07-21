# Portal Supply Chain — Kalenborn do Brasil

Portal de compras e supply chain integrado ao Sankhya e Supabase.

## Stack

- **Frontend:** React 18 + Vite
- **Banco:** Supabase (PostgreSQL)
- **Dados:** Sankhya (Oracle) via Edge Functions automáticas
- **Deploy:** Vercel / Netlify ou qualquer static host

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis (já preenchidas para o projeto Kalenborn)
# Edite .env se necessário

# 3. Rode em desenvolvimento
npm run dev
# Abre em http://localhost:3000

# 4. Build para produção
npm run build
# Gera a pasta dist/ para deploy
```

## Estrutura

```
src/
  App.jsx                  → Layout e navegação
  main.jsx                 → Entry point
  components/
    UI.jsx                 → Badge, KpiCard, DataTable, Modal, AlertaBanner
    Dashboard.jsx          → Dashboard executivo
    Pedidos.jsx            → Pedidos em aberto + alertas de embarque
    NFs.jsx                → NFs recebidas + cruzamento OC × NF
    MultaIDF.jsx           → Gerador de multa + IDF fornecedores
  hooks/
    useSupplyData.js       → Busca de dados no Supabase
  lib/
    supabase.js            → Cliente Supabase
    tokens.js              → Design tokens (cores, status)
    utils.js               → Formatação e lógica de negócio
sql/
  query_a_pedidos_abertos.sql   → Query Sankhya — pedidos pendentes
  query_b_nfs_entrada.sql       → Query Sankhya — NFs de entrada
supabase/
  migrations/
    001_supply_chain.sql        → Schema do banco
```

## Sincronização automática com Sankhya

As Edge Functions estão deployadas e rodam automaticamente:

| Horário         | Função                  | O que faz                            |
|-----------------|-------------------------|--------------------------------------|
| 06:00 seg–sex   | supply-pedidos-sync     | Puxa pedidos em aberto do Sankhya    |
| 06:30 seg–sex   | supply-nfs-sync         | Puxa NFs de entrada do Sankhya       |
| 10:00 seg–sex   | supply-pedidos-sync     | Atualiza pedidos                     |
| 10:30 seg–sex   | supply-nfs-sync         | Atualiza NFs                         |
| 14:00 seg–sex   | supply-pedidos-sync     | Atualiza pedidos                     |
| 14:30 seg–sex   | supply-nfs-sync         | Atualiza NFs                         |
| 18:00 seg–sex   | supply-pedidos-sync     | Atualiza pedidos                     |
| 18:30 seg–sex   | supply-nfs-sync         | Atualiza NFs                         |

Para forçar uma sincronização manual, clique em **Sincronizar** no portal.

## Módulos

1. **Dashboard** — KPIs, donut de status, ranking de atrasos, últimas NFs
2. **Pedidos em aberto** — Filtros por status, embarque e fornecedor; alerta de embarque com modal de decisão
3. **NFs recebidas** — Todas as NFs de entrada do período
4. **OC × NF** — Cruzamento inteligente por fornecedor + produto + valor
5. **Multa** — Calculadora 0,5%/dia (teto 10%) + registro no banco
6. **IDF Fornecedores** — Índice de desempenho OTIF: CP × 80% + CQ × 20%

## Lógica de embarque

`AD_DTEMBARQUE` = data que o material deve sair do fornecedor.
O portal não sabe se o fornecedor embarcou ou não.
Quando a data passa com quantidade pendente, o sistema exibe um **alerta amarelo**.
O comprador verifica com o fornecedor e registra a decisão (embarcado ou multa).

## Critério de multa

- **0,5% ao dia** sobre o valor do material entregue
- **Teto: 10%** do valor do material
- Pode ser descontado de qualquer NF futura do fornecedor
- Referência: Item 7 das Condições Gerais de Fornecimento
