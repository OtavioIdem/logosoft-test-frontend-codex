# Implementação v10.0.13.3 — Dashboard, Auditoria e validações anti-regressão

A v10.0.13.3 mantém a linha corretiva da v10.0.13, sem avançar para v10.0.14.

## Objetivo

Refinar Dashboard e Auditoria, reduzir risco de regressão nas rotas operacionais criadas na v10.0.13.2 e manter validações preventivas para Docker/npm.

## Arquivos alterados

- `package.json`
- `config/app.ts`
- `README.md`
- `CHANGELOG.md`
- `features/dashboard/components/DashboardPage.tsx`
- `features/dashboard/api/dashboardApi.ts`
- `features/auditoria/components/AuditoriaEventosPage.tsx`
- `scripts/validate-source.mjs`

## Arquivos adicionados

- `features/auditoria/utils/auditoriaDisplay.ts`
- `tests/unit/auditoriaDisplay.test.ts`
- `docs/IMPLEMENTACAO_V10_0_13_3.md`

## Dashboard

- Incluídos atalhos operacionais protegidos por permissão:
  - Novo pedido de venda: `VENDAS_GERENCIAR`.
  - Novo pedido de compra: `COMPRAS_GERENCIAR`.
  - Entrada de estoque: `ESTOQUE_MOVIMENTAR`.
  - Receber conta: `FINANCEIRO_RECEBER`.
- Auditoria recente passou a usar rótulos e severidades centralizados.
- Data de atualização do dashboard passou a ter fallback seguro para data inválida.
- Corrigida colisão de status numéricos entre enums de Venda, Compra e Financeiro nos fluxos críticos.

## Auditoria

- Criado utilitário `auditoriaDisplay` para:
  - rótulo de ação;
  - severidade visual;
  - formatação segura de data;
  - referência amigável sem expor GUID cru.
- Tela de eventos ganhou cartões-resumo:
  - eventos carregados;
  - módulos afetados;
  - ações críticas;
  - evento mais recente.
- Adicionado filtro por ação.
- Busca textual agora também considera a referência amigável.

## Validação preventiva

`validate:source` passou a bloquear:

- uso de `timeout=` no `.npmrc`, que gera warning no npm 11;
- Dockerfile que não copia `.npmrc` antes do `npm install`;
- ausência das rotas:
  - `/vendas/pedidos/novo`;
  - `/vendas/pedidos/[id]`;
  - `/compras/pedidos/novo`;
  - `/compras/pedidos/[id]`.

## Teste adicionado

- `tests/unit/auditoriaDisplay.test.ts` cobre rótulos, severidades, datas inválidas e referência amigável.

## Validação executada

```bash
npm run validate:source
```

Resultado: validação concluída sem regressões conhecidas.

## Não executado neste ambiente

- `npm install`
- `npm run build`
- `docker build`

Esses comandos devem ser executados no ambiente Node 24/npm 11 usado no Docker/local de desenvolvimento.
