# Skill — Workflow de implementação

## Etapa 1 — Leitura da base

Antes de codar:

1. Confirmar versão no `package.json`.
2. Confirmar versão no `config/app.ts`.
3. Ler o último `docs/IMPLEMENTACAO_*.md` aplicável.
4. Verificar se existe bloqueio pendente.
5. Identificar arquivos rastreados sensíveis ao escopo.

## Etapa 2 — Diagnóstico funcional

Responder:

```text
Qual fluxo de ERP esta entrega representa?
Qual módulo será afetado?
Quais telas serão afetadas?
Quais endpoints serão consumidos?
Quais permissões são necessárias?
Quais estados de loading, erro, vazio e sucesso devem existir?
Quais testes ou gates devem proteger a alteração?
```

## Etapa 3 — Implementação

1. Implementar primeiro a menor alteração funcional possível.
2. Não criar regra crítica exclusiva no frontend.
3. Validar dados no frontend apenas para UX.
4. Consumir contrato real ou contrato formalmente documentado.
5. Manter tratamento de erro claro para o usuário.
6. Garantir que payload enviado não contenha campo manual indevido.
7. Garantir que dados sensíveis estejam mascarados.

## Etapa 4 — Testes e gates

Rodar no mínimo:

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
git diff --cached --check
```

Quando aplicável:

```bash
npm run validate:guid-references
npm run validate:fiscal:production
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
npm run validate:skills
npm run validate:ci
```

## Etapa 5 — Empacotamento

1. Remover artefatos locais.
2. Garantir que arquivos rastreados não sumiram.
3. Gerar ZIP completo.
4. Gerar markdown de implementação.
5. Listar validações executadas e limitações do ambiente.
