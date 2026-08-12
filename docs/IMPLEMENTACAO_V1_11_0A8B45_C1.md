# Implementação v1.11.0a8b45.c1 — correções do contrato backend atual

## Objetivo

Eliminar o falso positivo do gate B38, corrigir as divergências encontradas na Onda 0 e registrar o estado corrente do frontend contra o backend atual.

## Base técnica preservada

- Branch: `codex/v1.11.0a5-sidebar-search`.
- Corte auditado: `398298d`.
- O corte contém funcionalidades posteriores à documentação B45 e é preservado apenas para evitar descarte silencioso de trabalho.
- O bloqueio visual registrado no corte B45 pertence ao histórico; esta entrega é corretiva `.c1`, não B46.

## Histórico da Onda 0

- Tornar `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` a fonte canônica.
- Manter B38 e os contratos operacionais como históricos/específicos, sem precedência normativa.
- Comparar chamadas HTTP produtivas por método e caminho contra a seção 9 do contrato atual.
- Resolver rotas literais, constantes, templates e concatenações estaticamente determináveis.
- Expor chamadas dinâmicas não resolvidas em vez de omiti-las.
- Manter divergências reais bloqueando o gate estrito.
- Inventariar permissões do backend sem alterar ainda o runtime de autorização.

## Implementação funcional `.c1`

- Estoque: contratos simples de inventário corrigidos para listar/abrir/adicionar item/fechar/cancelar; bloqueios simples despublicados e encaminhados ao avançado; definições indiretas POST-only removidas do catálogo.
- Financeiro: payloads de recebimento/pagamento/estorno alinhados aos DTOs reais, com seleção de parcela e forma de pagamento; detalhe e fluxo de caixa simples encaminhados ao módulo avançado.
- Bancos: chamadas GET sem contrato foram removidas, preservando somente criações e operações suportadas.
- RH e Relatórios: rotas corrigidas e `empresaId` obrigatório para consultas de relatório.

## Fora de escopo

- Reconciliar permissões e enums ainda não consumidos pelo runtime.
- Criar B46 ou declarar a base aprovada.

## Arquivos de governança

```text
package.json
config/app.ts
README.md
CHANGELOG.md
docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md
docs/BACKEND_OPERATIONAL_CONTRACTS.md
docs/CONTRATO_FRONTEND_BACKEND_B38.md
docs/PLANO-ADEQUACAO-FRONTEND-AO-BACKEND-ATUAL.md
docs/IMPLEMENTACAO_V1_11_0A8B45_C1.md
docs/RELATORIO_COBERTURA_FRONTEND_BACKEND_V1_11_0A8B45_C1.md
scripts/backend-permissions.snapshot.json
```

## Arquivos técnicos

```text
scripts/validate-backend-contract-map.mjs
scripts/lib/backend-contract-map.mjs
scripts/backend-contract-map.allowlist.json
tests/unit/backendContractMap.test.ts
```

## Comportamento esperado do gate

`validate:backend-contract-map` é estrito e deve falhar enquanto houver rota ausente, método divergente, expressão dinâmica não classificada ou allowlist inválida. `report:backend-contract-map` apoia o diagnóstico local, mas não substitui o gate oficial.

As incompatibilidades produtivas não serão suprimidas por allowlist apenas para obter resultado verde.

## Riscos

- O corte técnico possui funcionalidades pós-B45 ainda sem versão própria.
- O catálogo Markdown precisa permanecer parseável e versionado junto ao frontend.
- O gate corrente está verde (456/456/0); qualquer nova divergência deve reativar a falha regressiva do gate.
- Nenhuma compatibilidade fiscal, financeira, de estoque ou segurança é presumida a partir da existência de uma tela.

## Validação proporcional

```bash
npm run test:unit -- tests/unit/backendContractMap.test.ts
npm run validate:backend-contract-map
git diff --check
```

Não executar build nesta etapa sem solicitação explícita.

## Estado da entrega

Infraestrutura da Onda 0 preservada como histórico. Após a implementação `.c1`, o parser registra 576 rotas backend, 481 ocorrências HTTP, 456 rotas frontend únicas, 456 compatíveis e 0 incompatibilidades observadas. A revisão técnica foi concluída com 10 arquivos e 51 testes direcionados, além de `typecheck`, `lint`, mapa de contratos, mocks, validação de GUID e `git diff --check`, todos verdes; a correção documental final foi incorporada. Estado: APROVADO para encerramento técnico da `.c1`. Build, E2E, commit, push e deploy não foram executados nem autorizados.
