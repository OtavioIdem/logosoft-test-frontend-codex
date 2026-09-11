# Skill — arquiteto-frontend

## Missão

Transformar escopo já decidido no **plano de uma versão**: `bNN` funcional ou `.cN` corretiva,
com arquivo alvo por passo, contratos, permissões, estados de tela, testes e gates.

Ele não decide desenho de sistema. Isso é da rodada de projeto (`skills/projeto/`). Se o plano
esbarrar em ambiguidade de arquitetura, **para e escala**.

## Entrada obrigatória

```text
Demanda em uma frase.
Estado da versão anterior: aprovada, bloqueada ou em análise.
Decisão travada (Dn), quando a demanda passou por rodada de projeto.
Módulo e telas alvo.
```

## Procedimento

**1. Fixar a base.**

```bash
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
ls -1 docs/IMPLEMENTACAO_*.md | tail -3
```

Versão anterior bloqueada ⇒ o plano é corretivo `.cN`. Não existe `bNN+1` com `bNN` bloqueada.

**2. Ler o recorte, nesta ordem.**

```bash
ls features/<modulo> "app/(main)/<modulo>"
sed -n '1,120p' features/<modulo>/api/<modulo>Api.ts
grep -n "QueryKey = \|useQuery\|useMutation" features/<modulo>/hooks/*.ts
grep -n "<modulo>" lib/security/routePermissions.ts
```

**3. Confirmar o contrato.** Endpoint que o plano vai consumir precisa existir em
`docs/CONTRATO_*.md`, em `docs/contracts/` ou em `scripts/backend-contract-map.allowlist.json`.
Não encontrou: o plano registra a ambiguidade e propõe a alternativa mínima segura. **Nunca
inventa endpoint, campo ou enum.**

**4. Responder o diagnóstico obrigatório.** Fluxo de ERP, módulo e telas, endpoints com método e
rota, permissões e onde são registradas, os sete estados de tela, campos de vínculo, impacto
fiscal/financeiro/estoque/segurança/LGPD, e testes e gates que protegem.

**5. Sequenciar por arquivo.** Cada passo nomeia o arquivo alvo. Passo sem arquivo é intenção.
Ordem que este projeto exige:

```text
types → schemas → api → hooks → components → rota → permissão → menu → teste
```

**6. Escolher os gates.** Comandos exatos, não categorias. Mínimo por entrega:

```bash
npm run validate:source
npm run typecheck
npm run lint
npx vitest run tests/unit/<modulo>*.test.ts
npm run build
```

Some conforme o impacto: `validate:guid-references` para vínculo de entidade,
`validate:backend-contract-map` para endpoint novo, `validate:backend-permissions` para permissão
nova, `validate:fiscal:production` e `test:contract:fiscal` para fiscal.

**7. Declarar o escopo preservado.** O que não será alterado, nominalmente.

## Saída

O formato de nove seções do prompt do agente, terminando em "o que NÃO será alterado". Prefira o
menor passo funcional entregável.

## Erros que já custaram versão

```text
Planejar sobre versão bloqueada.
Passo sem arquivo alvo.
Endpoint suposto a partir do nome da tela.
Gate citado por categoria em vez de comando.
Plano que resolve arquitetura no meio do caminho, em vez de escalar.
Escopo preservado deixado implícito.
```

## Quando escalar

A demanda exige decisão de desenho não travada, padrão de tela novo, ou muda contrato. Abra
rodada de projeto antes de planejar a versão.
