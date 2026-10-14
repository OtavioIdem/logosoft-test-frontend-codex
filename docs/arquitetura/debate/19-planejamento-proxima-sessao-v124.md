# Planejamento da próxima sessão — v1.24 fiscal

## Objetivo

Concluir fatias de frontend já liberadas e manter o frontend aderente ao contrato fiscal registrado pelo backend, sem reproduzir regras de domínio no cliente.

## Base de verdade

- Plano frontend: `C:\Users\Otavio Idem\Documents\New project 3\docs\frontend\PLANO-FRONTEND-v1.24-p1-validacoes-fiscais.md`.
- Contrato de ambiente: `TipoAmbienteFiscal`, em `Erp.Domain/Fiscal/EnumsFiscal.cs` do backend. O JSON retorna o enum de domínio: `1 = Homologação` e `2 = Produção`; esses valores não são os códigos de fio `tpAmb`.
- Ações já entregues nesta frente: AJ-12, AJ-16, AJ-17 e AJ-19. Nenhuma delas deve ser reaberta sem mudança de contrato registrada.

## Sequência proposta

**Status desta sessão:** AJ-05 e AJ-08 concluídas no frontend, pendentes apenas dos gates gerais abaixo. A próxima fatia de desenvolvimento é AJ-06, precedida pelo inventário K3.

| Ordem | Fatia | Pré-condição | Escopo | Prova de encerramento |
| --- | --- | --- | --- | --- |
| 1 | AJ-05 — ambiente por rótulo | já liberada | Centralizar o rótulo do enum e eliminar a exibição numérica no status operacional e na observabilidade. | Concluída: teste de componente e gates estáticos. |
| 2 | AJ-08 — CST monofásico | contrato K4 conferido | Mapear somente o novo código de erro de cadastro/regra fiscal para uma orientação acionável. | Concluída: testes dos mapeadores e do atalho de cadastro. |
| 3 | AJ-06 — enums e coerência de CRT | inventário K3 | Atualizar tipos, rótulos e selects; valores desconhecidos recebem “não mapeado”. A mensagem de coerência volta ao campo de regime, sem cálculo local. | Inventário de telas/DTOs, testes dos rótulos e dos formulários atingidos. |
| 4 | AJ-07 — limites de leiaute | inventário K5 por cadastro | Apertar schemas de produto, cadastro fiscal e série estritamente nos limites publicados pelo backend. | Testes Zod por campo e por valor-limite. |
| 5 | AJ-09 — CNPJ alfanumérico | inventário K6 de máscara/validador | Substituir a validação numérica em pessoa, empresa, filial e destinatário por uma única regra compartilhada. | Vetores válidos/inválidos e regressão das telas. |

## Itens deliberadamente fora desta sessão

- AJ-01 a AJ-04, AJ-10, AJ-11 e AJ-15 dependem dos artefatos de regras/leiaute R1 e não devem ser inferidos no frontend.
- AJ-13 depende da definição D5 de cobrança/pagamento na nota.
- Eventos, inutilização e consultas não entram em AJ-19: seus indicadores de schema ainda têm comportamento próprio no contrato registrado.
- Não haverá cálculo de imposto, valor fiscal, `tpAmb` ou regra de CRT no cliente; a tela somente exibe e valida formato/contrato.

## Riscos e contenção

1. **Confundir enum de domínio com `tpAmb`**: usar rótulo, nunca cast ou número de fio.
2. **Backend visível defasado da fatia registrada**: preservar a divergência documentada e não desfazer o ajuste de UI até nova atualização de contrato.
3. **Abranger telas sem o mesmo contrato**: cada próxima fatia começa com inventário de tipo, endpoint, schema e consumidores.

## Arquivos da primeira fatia

- `features/fiscal/components/fiscalLabels.ts`
- `features/fiscal/components/FiscalOperationalPanels.tsx`
- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`
- `tests/components/FiscalOperationalPanels.test.tsx`

## Como validar

1. Renderizar o status SEFAZ com os valores 1 e 2 e conferir Homologação e Produção.
2. Executar o teste focal, typecheck, lint, validação de fonte e `git diff --check`.
3. Não executar transmissão SEFAZ, build, deploy ou alteração de backend nesta sessão.
