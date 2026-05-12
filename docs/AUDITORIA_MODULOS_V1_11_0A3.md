# Auditoria modular v1.11.0a3

Versao anterior aplicada: `v1.11.0a2`.

## Objetivo

Executar uma passada modulo a modulo na cobertura existente, conferir o estado dos procedimentos operacionais e registrar melhorias recomendadas antes de novas implementacoes funcionais.

## Resultado dos testes

| Area | Arquivos | Resultado |
| --- | ---: | --- |
| Auth e Sessao | 6 | 22/22 testes passaram |
| Seguranca e Permissoes | 5 | 11/12 passaram; 1 falhou |
| Administracao | 3 | 7/7 testes passaram |
| Pessoas, Clientes e Fornecedores | 3 | 9/9 testes passaram |
| Produtos e Catalogo | 1 | 5/5 testes passaram |
| Estoque | 2 | 5/8 passaram; 3 falharam |
| Vendas | 2 | 6/6 testes passaram |
| Financeiro | 1 | 2/5 passaram; 3 falharam |
| Compras | 2 | 7/7 testes passaram |
| Auditoria e Dashboard | 1 | 4/4 testes passaram |
| Core HTTP e formatadores | 5 | 15/15 testes passaram |

Total unitario/componentes: **93/100 testes passaram**.

E2E critico: **5/5 bloqueados por ambiente**, todos por Chromium gerenciado ausente em `C:\Users\Otavio Idem\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe`. A aplicacao nao chegou a ser exercitada por essa suite; e necessario instalar os browsers do Playwright ou configurar o projeto para usar o Chrome local.

## Falhas identificadas

1. `tests/components/UsuarioFormDialog.test.tsx`
   - Motivo: o componente usa `EmpresaSelect`/`FilialSelect`, que dependem de TanStack Query, mas o teste renderiza sem `QueryClientProvider`.
   - Exito esperado: teste deve usar um helper `renderWithProviders` ou mockar os selects, e validar os rotulos atuais `Empresa` e `Filial`, nao os rotulos antigos `Empresa ID` e `Filial ID`.

2. `tests/unit/estoquePayload.test.ts`
   - Motivo: os schemas de Estoque transformam campos opcionais vazios em `null`, e `sanitizePayload` preserva `null`; os testes esperam omissao de `filialId`, `origemId` e `observacao`.
   - Exito esperado: alinhar a regra de payload com o contrato. Como a regra permanente diz que GUID vazio, `0`, `99` ou invalido nao deve ser enviado, `filialId` e `origemId` opcionais deveriam ser omitidos quando vazios/invalidos, ou os testes precisam ser atualizados se o backend exigir `null`.

3. `tests/unit/financeiroPayload.test.ts`
   - Motivo: `optionalGuidSchema` em Financeiro aceita `Guid` ou `null`, mas rejeita `''` e `'99'`; isso quebra os cenarios que deveriam limpar GUID invalido antes do envio.
   - Exito esperado: normalizar `filialId` e `origemId` opcionais antes da validacao ou trocar por schema opcional que trate vazio/sentinelas como ausencia, mantendo enums numericos.

4. `npm run test:e2e:critical`
   - Motivo: browsers do Playwright nao estao instalados no perfil local.
   - Exito esperado: `npx playwright install chromium` ou configuracao explicita para `channel: 'chrome'`, seguida da execucao dos fluxos criticos com mocks controlados.

## Estado dos procedimentos por modulo

- Auth e Sessao: login, payload sem filial, refresh, expiracao por tempo maximo e inatividade estao cobertos e passaram.
- Seguranca: permissoes e payload de usuario passaram; teste de componente precisa infraestrutura de provider.
- Administracao: payload, UX de referencias e dialog base passaram; inativacao com motivo esta no fluxo, mas merece teste de acao por pagina.
- Pessoas, Clientes e Fornecedores: documentos, LGPD visual e payloads passaram; faltam testes de componente para bloqueio/desbloqueio de credito e inativacoes com motivo.
- Produtos e Catalogo: payloads passaram; falta cobertura de componente para permissao de dados fiscais, complementos e inativacao.
- Estoque: regras de status passaram; payloads mostram divergencia de `null` versus omissao para campos opcionais.
- Vendas: payloads e regras de status passaram; fluxo de enviar/aprovar/cancelar/faturar esta modelado, mas precisa E2E executavel.
- Financeiro: recebimento/pagamento basicos passaram; criacao de contas/formas falha por normalizacao de GUID opcional.
- Compras: payloads e regras de recebimento/status passaram; fluxo de receber acima do pedido segue dependente da flag e de E2E.
- Dashboard e Auditoria: auditoria display passou; Dashboard ainda carece de teste de componente para cards, atalhos protegidos e layout responsivo.
- Core: `apiError`, sanitizacao de query/payload, status rules, display formatter e store mock passaram.

## Melhorias recomendadas

1. Criar `tests/utils/renderWithProviders.tsx` com `QueryClientProvider`, Toast e providers necessarios para componentes que usam TanStack Query.
2. Centralizar schemas/helpers de GUID opcional em `lib/validators` ou `lib/http/requestUtils`, evitando divergencia entre Estoque, Financeiro, Produtos e Compras.
3. Decidir e documentar a politica final de payload opcional: `undefined`/omissao para GUID opcional invalido, e `null` somente quando o backend exigir explicitamente nullable.
4. Corrigir Financeiro para limpar `filialId`, `origemId`, `0` e `99` antes da validacao, mantendo a regra de nao enviar GUID invalido.
5. Revisar Estoque para nao enviar `origemId` vazio e para tratar `filialId` opcional de forma consistente.
6. Instalar browsers do Playwright ou configurar `channel: 'chrome'` para tornar E2E critico executavel em maquinas Windows com Chrome instalado.
7. Adicionar testes de componente para Dashboard, ReasonDialog em acoes criticas e telas de detalhe de Vendas/Compras.
8. Adicionar testes de botao/acao por permissao em Clientes, Produtos, Estoque e Financeiro, alem da protecao de rota/menu ja existente.
9. Revisar labels antigos em testes e documentacao que ainda citam `Empresa ID`/`Filial ID` quando a interface real usa selects amigaveis.

## Comandos executados

```bash
npm run validate:source
vitest run por grupos modulares
npm run test:e2e:critical -- --reporter=line
```
