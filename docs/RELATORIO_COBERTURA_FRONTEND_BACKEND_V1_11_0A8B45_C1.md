# Relatório de cobertura frontend/backend — v1.11.0a8b45.c1

Data: 2026-08-12

Fonte canônica: `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`

Base técnica: `398298d`, preservada como histórico da Onda 0.

## Resultado executivo

O gate anterior informava 275 endpoints em modo documental e podia terminar verde sem comparar o backend atual. Após as correções funcionais `.c1`, o relatório AST atual registra:

| Medida | Resultado |
| --- | ---: |
| Rotas catalogadas no backend | 576 |
| Ocorrências HTTP no frontend | 481 |
| Rotas frontend únicas | 456 |
| Rotas compatíveis | 456 |
| Incompatibilidades | 0 |
| Caminhos ausentes | 0 |
| Métodos incompatíveis | 0 |
| Rotas indiretas incompatíveis | 0 |
| Expressões dinâmicas classificadas | 0 |

Conclusão: as chamadas produtivas observadas estão compatíveis com o contrato atual. A allowlist foi zerada após a comprovação das correções e permanece auditável e regressiva.

## Estado pós-implementação

- Estoque: inventário simples separado do avançado; bloqueios simples redirecionados para o fluxo avançado; catálogo não materializa GETs para operações que expõem somente POST.
- Financeiro: recebimentos, pagamentos e estornos usam os DTOs oficiais; fluxo de caixa e detalhes seguem o módulo avançado.
- Bancos: GETs não suportados foram retirados do uso produtivo; ações dependentes de dados selecionáveis permanecem bloqueadas quando a API não fornece a fonte.
- RH e Relatórios: rotas corrigidas; relatórios exigem `empresaId` antes da consulta.

## Histórico da Onda 0

As tabelas de incompatibilidades abaixo documentam o diagnóstico original da Onda 0. Elas não representam o estado produtivo corrente; o resultado corrente é o quadro executivo acima.

### Bancos — 4 métodos incompatíveis

| Frontend | Contrato backend |
| --- | --- |
| `GET /api/bancos` | somente `POST` |
| `GET /api/bancos/contas-bancarias` | somente `POST` |
| `GET /api/bancos/convenios` | somente `POST` |
| `GET /api/bancos/carteiras` | somente `POST` |

### Estoque — 9 incompatibilidades

| Frontend | Contrato backend |
| --- | --- |
| `POST /api/estoque/bloqueios` | `POST /api/estoque/avancado/bloqueios` |
| `POST /api/estoque/bloqueios/{id}/liberar` | prefixo `/api/estoque/avancado` |
| `POST /api/estoque/bloqueios/{id}/cancelar` | prefixo `/api/estoque/avancado` |
| `GET /api/estoque/inventarios/{id}` | `GET /api/estoque/avancado/inventarios/{id}` |
| `POST /api/estoque/inventarios/{id}/iniciar-contagem` | prefixo `/api/estoque/avancado` |
| `POST /api/estoque/inventarios/{id}/concluir` | prefixo `/api/estoque/avancado` |
| `GET /api/estoque/entradas` | somente `POST`; chamada indireta do catálogo genérico |
| `GET /api/estoque/saidas` | somente `POST`; chamada indireta do catálogo genérico |
| `GET /api/estoque/ajustes` | somente `POST`; chamada indireta do catálogo genérico |

As três últimas rotas não apareciam na varredura inicial de 23 incompatibilidades. Elas foram reveladas quando o gate passou a materializar o `resourceClient` a partir de `features/shared/config/erpFeatureCatalog.ts`.

### Financeiro — 6 caminhos ausentes

| Frontend | Contrato backend |
| --- | --- |
| `POST /api/financeiro/contas-receber/{id}/baixar` | `/receber` no contrato simples |
| `POST /api/financeiro/contas-receber/{id}/estornar` | `/estornar-recebimento` no contrato simples |
| `POST /api/financeiro/contas-pagar/{id}/baixar` | `/pagar` no contrato simples |
| `POST /api/financeiro/contas-pagar/{id}/estornar` | `/estornar-pagamento` no contrato simples |
| `GET /api/financeiro/contas/{id}` | `/api/financeiro/avancado/contas/{id}` |
| `GET /api/financeiro/fluxo-caixa` | `/api/financeiro/avancado/fluxo-caixa` |

### RH — 6 caminhos ausentes

| Frontend | Contrato backend |
| --- | --- |
| `GET /api/rh/ausencias/ferias` | `GET /api/rh/ferias` |
| `POST /api/rh/ausencias/ferias` | `POST /api/rh/ferias` |
| `POST /api/rh/ausencias/ferias/{id}/{acao}` | ações sob `/api/rh/ferias/{id}`; expressão dinâmica classificada |
| `GET /api/rh/ausencias/afastamentos` | `GET /api/rh/afastamentos` |
| `POST /api/rh/ausencias/afastamentos` | `POST /api/rh/afastamentos` |
| `POST /api/rh/ausencias/afastamentos/{id}/encerrar` | base `/api/rh/afastamentos` |

### Relatórios — 1 caminho ausente

| Frontend | Contrato backend |
| --- | --- |
| `GET /api/relatorios/operacionais` | `GET /api/relatorios/operacional/geral` |

## Rotas dinâmicas

O gate encontrou uma expressão não determinável como caminho único:

```text
POST /api/rh/ausencias/ferias/{id}/{acao}
features/rh/api/rhApi.ts:111
```

Esta foi a fotografia histórica da Onda 0: a expressão foi classificada na allowlist enquanto a rota ainda era divergente. A implementação `.c1` substituiu o uso produtivo por chamadas determináveis do contrato atual; portanto, não há rota dinâmica incompatível no estado corrente.

## Permissões

Foi criado `scripts/backend-permissions.snapshot.json` com os 177 códigos da seção 12. O snapshot é apenas inventário da Onda 0; o runtime ainda não foi alterado.

Comparação inicial registrada no plano:

- 45 códigos do backend ausentes no tipo frontend;
- 3 códigos frontend obsoletos: `ATIVIDADES_GERENCIAR`, `RELATORIOS_CONSULTAR` e `PORTARIA_PRE_AUTORIZAR`;
- `MASTER_GOD` e `*` ainda precisam ser incorporados à política de sessão/autorização.

## Enums

O inventário inicial encontrou 153 enums no backend e 123 no frontend:

- 36 enums do backend ainda não declarados no frontend;
- 37 enums compartilhados com divergência de nome ou valor;
- principais áreas afetadas: RH, Bancos, Frota, Portaria, Produção, Qualidade, Alimentar, CRM, Estoque e Fiscal.

A reconciliação dos enums permanece na Onda 3. Nenhum valor foi alterado nesta entrega para evitar mudança de regra sem revisar cada fluxo consumidor.

## Critério para desbloqueio

1. Manter zero incompatibilidades observadas no mapa corrente; as 26 divergências são apenas fotografia histórica da Onda 0, já resolvida ou retirada de uso.
2. Manter zero rota dinâmica não classificada no código produtivo corrente.
3. Manter zero entrada duplicada, expirada ou supressora na allowlist corrente.
4. Reexecutar o teste unitário do parser e o gate estrito; o `validate` deve terminar com sucesso e voltar a falhar se uma regressão introduzir qualquer incompatibilidade.
5. Submeter a corretiva ao QA revisor antes de qualquer commit ou nova versão funcional.

## Comandos

```bash
npm run report:backend-contract-map
npm run validate:backend-contract-map
npx vitest run tests/unit/backendContractMap.test.ts
```

O modo `report` apoia o diagnóstico. No estado corrente, o comando `validate` é o gate oficial e deve terminar com sucesso; ele deve voltar a falhar automaticamente se surgir qualquer incompatibilidade, rota dinâmica ou divergência não autorizada.
