/*
  QUERY A — PEDIDOS EM ABERTO
  Sankhya / Oracle
  Campos: data_embarque (AD_DTEMBARQUE) e data_prevista_entrega (DTPREVENT)

  LOGICA DE ALERTA DE EMBARQUE:
  O campo AD_DTEMBARQUE indica quando o material DEVE sair do fornecedor.
  NAO sabemos se o fornecedor embarcou ou nao. O sistema apenas expoe
  os casos onde a data passou e o material ainda nao chegou, para que
  o comprador verifique e decida se aplica multa.

  PRIORIDADE:
  1 = embarque atrasado (data passou, material nao chegou)
  2 = entrega atrasada
  3 = embarque vence em ate 3 dias
  4 = entrega vence em ate 3 dias
  5 = no prazo / sem data
*/
SELECT
    CAB.NUMNOTA                                         AS NUMERO_PEDIDO,
    CAB.DTNEG                                           AS DATA_PEDIDO,
    CAB.AD_DTEMBARQUE                                   AS DATA_EMBARQUE,
    CAB.DTPREVENT                                       AS DATA_PREVISTA_ENTREGA,
    PAR.CODPARC                                         AS COD_FORNECEDOR,
    PAR.NOMEPARC                                        AS FORNECEDOR,
    ITE.CODPROD                                         AS CODIGO_PRODUTO,
    PRO.DESCRPROD                                       AS DESCRICAO_PRODUTO,
    ITE.QTDNEG                                          AS QUANTIDADE_PEDIDA,
    NVL(ITE.QTDENTREGUE, 0)                            AS QUANTIDADE_ENTREGUE,
    ITE.QTDNEG - NVL(ITE.QTDENTREGUE, 0)              AS QUANTIDADE_PENDENTE,
    ITE.VLRTOT                                          AS VALOR_ITEM,
    CAB.VLRNOTA                                         AS VALOR_TOTAL_PEDIDO,
    PRJ.IDENTIFICACAO                                   AS PROJETO,

    ROUND(SYSDATE - CAB.AD_DTEMBARQUE)                 AS DIAS_ATRASO_EMBARQUE,
    ROUND(SYSDATE - CAB.DTPREVENT)                     AS DIAS_ATRASO_ENTREGA,

    CASE
        WHEN CAB.AD_DTEMBARQUE IS NOT NULL
             AND CAB.AD_DTEMBARQUE < SYSDATE
            THEN 1
        WHEN CAB.DTPREVENT IS NOT NULL
             AND CAB.DTPREVENT < SYSDATE
            THEN 2
        WHEN CAB.AD_DTEMBARQUE IS NOT NULL
             AND CAB.AD_DTEMBARQUE <= SYSDATE + 3
            THEN 3
        WHEN CAB.DTPREVENT IS NOT NULL
             AND CAB.DTPREVENT <= SYSDATE + 3
            THEN 4
        ELSE 5
    END                                                 AS PRIORIDADE

FROM
    TGFCAB CAB
    INNER JOIN TGFITE ITE ON ITE.NUNOTA  = CAB.NUNOTA
    INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
    INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    LEFT  JOIN TCSPRJ PRJ ON PRJ.CODPROJ = CAB.CODPROJ
WHERE
    CAB.TIPMOV      = 'O'
    AND CAB.STATUSNOTA = 'L'
    AND CAB.CODNAT     = 510101
    AND CAB.DTNEG     >= TO_DATE('2026-01-01', 'YYYY-MM-DD')
    AND ITE.CODPROD   NOT IN (2999, 3000)
    AND (ITE.QTDNEG - NVL(ITE.QTDENTREGUE, 0)) > 0
ORDER BY
    PRIORIDADE ASC,
    CAB.AD_DTEMBARQUE ASC
