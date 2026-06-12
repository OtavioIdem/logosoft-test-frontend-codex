# Validação backend controlada do frontend

## Objetivo

Esta skill/documentação operacional define como validar o frontend contra um backend real ou controlado sem reintroduzir mocks produtivos, sem usar produção como laboratório e sem executar fluxos mutáveis por acidente.

A validação controlada não substitui o CI padrão. Ela complementa os gates já existentes quando houver backend preparado, dados de seed conhecidos, usuário com permissões adequadas e ambiente descartável/homologação.

## Princípios obrigatórios

1. Ambiente controlado não deve apontar para produção.
2. Tokens, senhas, certificados, chaves privadas e segredos nunca devem ser versionados.
3. Fluxos read-only podem rodar com opt-in de contrato.
4. Fluxos mutáveis exigem opt-in explícito, dados descartáveis e autorização operacional.
5. Mocks seguem isolados em `tests/**` e não podem substituir erro real da API.
6. Backend continua sendo a fonte de verdade para permissões, workflow, status e regras críticas.
7. Toda falha de contrato deve gerar relatório técnico, não ajuste silencioso no frontend.

## Arquivo de ambiente

Use o template versionado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
```

Preencha apenas o arquivo local. O arquivo `.env.backend-controlled.local` não deve ser commitado.

Variáveis principais:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
PLAYWRIGHT_BACKEND_BASE_URL=http://127.0.0.1:3000
LOGOSOFT_CONTRACT_API_URL=http://localhost:8080
LOGOSOFT_CONTRACT_ACCESS_TOKEN=
LOGOSOFT_CONTRACT_EMPRESA_ID=
LOGOSOFT_E2E_API_URL=http://localhost:8080
LOGOSOFT_E2E_ACCESS_TOKEN=
LOGOSOFT_E2E_EMPRESA_ID=
LOGOSOFT_E2E_PEDIDO_VENDA_ID=
LOGOSOFT_E2E_RUN_BACKEND_FISCAL=false
```

## Contrato fiscal read-only/controlado

O contrato fiscal valida DTOs e endpoints fiscais sem depender da UI.

Comando:

```bash
npm run test:contract:fiscal
```

Requisitos mínimos:

```bash
LOGOSOFT_CONTRACT_API_URL
LOGOSOFT_CONTRACT_ACCESS_TOKEN
LOGOSOFT_CONTRACT_EMPRESA_ID
```

Variáveis opcionais:

```bash
LOGOSOFT_CONTRACT_FILIAL_ID
LOGOSOFT_CONTRACT_NOTA_FISCAL_ID
LOGOSOFT_CONTRACT_UF_AUTORIZADORA
LOGOSOFT_CONTRACT_RUN_STATUS_SERVICO=false
LOGOSOFT_CONTRACT_RUN_EXPORT_CSV=false
LOGOSOFT_CONTRACT_EXPORT_CSV_MOTIVO=Contrato fiscal frontend/backend controlado
```

A exportação CSV fiscal permanece opt-in porque gera auditoria e pode ter custo operacional.

## Contratos operacionais read-only/controlados

A partir da `v1.11.0a8b31`, o frontend possui uma suíte opt-in para validar contratos reais/controlados de Vendas, Estoque, Financeiro e Auditoria sem executar mutações.

Comando:

```bash
npm run test:contract:operational
```

Requisitos mínimos:

```bash
LOGOSOFT_OPERATIONAL_CONTRACT_API_URL
LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN
LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID
```

Variáveis opcionais:

```bash
LOGOSOFT_OPERATIONAL_CONTRACT_FILIAL_ID
LOGOSOFT_OPERATIONAL_CONTRACT_PEDIDO_VENDA_ID
LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_RECEBER_ID
LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_PAGAR_ID
LOGOSOFT_OPERATIONAL_CONTRACT_ORIGEM_ID
```

Essa suíte é read-only. Ela não deve aprovar/faturar pedido, baixar estoque, receber/pagar conta, cancelar ou estornar registros.

Documentação específica: `docs/BACKEND_OPERATIONAL_CONTRACTS.md`.

## E2E fiscal backend mutável/controlado

O E2E fiscal real/controlado cria ou altera estado no backend. Por isso ele só deve rodar quando existir ambiente descartável, pedido de venda preparado e token com permissões controladas.

Comando:

```bash
npm run test:e2e:fiscal:backend
```

Requisitos mínimos:

```bash
LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true
LOGOSOFT_E2E_API_URL
LOGOSOFT_E2E_ACCESS_TOKEN
LOGOSOFT_E2E_EMPRESA_ID
LOGOSOFT_E2E_PEDIDO_VENDA_ID
```

Antes de executar:

```bash
npx playwright install chromium
```

Quando o frontend já estiver rodando localmente, use:

```bash
LOGOSOFT_E2E_USE_EXISTING_FRONTEND=true
PLAYWRIGHT_BACKEND_BASE_URL=http://127.0.0.1:3000
```

## Sequência recomendada em ambiente limpo

```bash
npm install
npm run validate:source
npm run validate:backend-controlled
npm run validate:operational-contracts
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## Dados mínimos esperados no backend controlado

Para fiscal:

1. Empresa ativa.
2. Filial ativa, quando aplicável.
3. Usuário ativo com permissões fiscais, financeiras e de estoque exigidas pelo fluxo.
4. Pedido de venda elegível para faturamento fiscal.
5. Produto com dados mínimos aceitos pelo backend.
6. Cliente vinculado ao pedido.
7. Condição e forma de pagamento quando o fluxo gerar financeiro.
8. Local de estoque quando o fluxo baixar estoque.
9. Ambiente fiscal de homologação/simulação, nunca produção.
10. Auditoria habilitada para eventos fiscais.

## O que não deve ser feito

- Não preencher `LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true` contra produção.
- Não colocar token real em `.env.backend-controlled.example`.
- Não usar mock como fallback quando o backend falhar.
- Não ajustar payload fiscal no frontend para contornar rejeição de regra do backend.
- Não declarar uma suíte opt-in como aprovada se ela ficou skipped por falta de variáveis.
- Não commitar arquivo local com token, senha, certificado ou segredo.

## Critério de aprovação da B30

A B30 prepara a validação real/controlada. Ela é aprovada quando:

1. `validate:backend-controlled` passa.
2. `validate:source` passa executando o novo gate.
3. O template de ambiente não contém segredos.
4. As suítes opt-in continuam seguras e skipped sem variáveis.
5. A documentação deixa claro o que depende de backend real preparado.
6. O levantamento de pendências fica disponível em `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md`.
