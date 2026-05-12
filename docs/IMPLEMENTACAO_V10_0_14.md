# Implementação v10.0.14 — E2E completo com Playwright

## Objetivo

Evoluir a suíte E2E do frontend logosoft para cobrir os fluxos críticos planejados antes da revisão final de segurança, permissões, LGPD e documentação.

## Escopo implementado

- Autenticação:
  - bloqueio de rota interna sem sessão;
  - login pela tela;
  - logout;
  - acesso direto com sessão persistida.
- Permissões:
  - perfil somente consulta;
  - botão de criação desabilitado sem permissão de gerenciamento;
  - tela de segurança protegida quando a permissão necessária não existe.
- Cadastros:
  - empresa com CNPJ alfanumérico preservado;
  - pessoa jurídica com CNPJ alfanumérico;
  - formulário de produto com campos amigáveis e seleção por entidade, sem exigir GUID cru do usuário.
- Fluxos críticos:
  - navegação por Dashboard, Administração, Pessoas, Clientes, Fornecedores, Produtos, Estoque, Vendas, Financeiro, Compras e Auditoria;
  - rotas `/vendas/pedidos/novo` e `/compras/pedidos/novo`;
  - local de estoque e consulta de saldos;
  - cancelamento financeiro com motivo obrigatório;
  - auditoria com filtros e resumos.

## Arquivos criados ou alterados

- `tests/e2e/fixtures/logosoft.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/permissions.spec.ts`
- `tests/e2e/cadastros.spec.ts`
- `tests/e2e/logosoft-critical-flows.spec.ts`
- `tests/e2e/financeiro-estoque.spec.ts`
- `tests/e2e/auditoria.spec.ts`
- `playwright.config.ts`
- `scripts/validate-source.mjs`
- `package.json`
- `config/app.ts`
- `README.md`
- `CHANGELOG.md`

## Estratégia de mocks

Os testes E2E usam mocks controlados no Playwright por `page.route('**/api/**')`.

Isso evita dependência de:

- backend local rodando;
- banco populado manualmente;
- dados de usuário criados manualmente;
- ordem de execução dos testes;
- endpoints ainda não finalizados.

A aplicação continua usando API real por padrão. Os mocks são ativados apenas no ambiente E2E pelo `playwright.config.ts`:

```ts
NEXT_PUBLIC_USE_MOCK_AUTH: 'true'
NEXT_PUBLIC_USE_MOCK_API: 'true'
NEXT_PUBLIC_APP_ENV: 'test'
```

## Scripts adicionados

```bash
npm run test:e2e
npm run test:e2e:critical
npm run test:e2e:ui
```

## Validação executada

Executado neste ambiente:

```bash
npm run validate:source
```

Não executado neste ambiente:

```bash
npm install
npm run build
npm run test:e2e
docker build
```

## Observações

- O objetivo desta versão é aumentar a proteção contra regressões de interface e fluxos críticos.
- A validação final em Node 24, Docker e Playwright real deve ser feita no ambiente de desenvolvimento com dependências instaladas.
- Caso surjam erros de build/testes, as correções devem seguir como `v10.0.14.X`, mantendo a linha da versão 14 até estabilizar.
