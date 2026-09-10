# Frontend LogoSoft — regras de trabalho

Next.js 13 (app router) + React 18 + TypeScript + PrimeReact/Sakai + React Query
+ Axios + Zod. Consome o backend ERP LogoSoft; `app/api` está vazio de propósito.

## Onde está o contexto

| Preciso de | Leia |
| --- | --- |
| Como uma fatia é executada | [`.claude/graph/README.md`](.claude/graph/README.md) |
| Qual regime e qual nível de modelo | [`.claude/graph/regimes.yaml`](.claude/graph/regimes.yaml) |
| Quem pode escrever o quê | [`.claude/graph/policies.yaml`](.claude/graph/policies.yaml) |
| Quando cada nó entra | [`.claude/graph/execution-graph.yaml`](.claude/graph/execution-graph.yaml) |
| Quanto esforço a fatia merece | [`.claude/graph/risk.yaml`](.claude/graph/risk.yaml) |
| O que cada agente devolve | [`.claude/graph/contratos.md`](.claude/graph/contratos.md) |
| Decisões travadas (Dn) | [`docs/arquitetura/DECISOES.md`](docs/arquitetura/DECISOES.md) |
| O que o backend entrega hoje | `docs/backend-v1.23/` (contrato, gap e fluxos) |
| O plano da onda corrente | [`docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`](docs/backend-v1.23/PLANO-FRONTEND-v1.23.md) |
| Os gates do CI | [`docs/CI_GATES_FRONTEND.md`](docs/CI_GATES_FRONTEND.md) |
| Histórico por versão | [`CHANGELOG.md`](CHANGELOG.md) |

## Como o trabalho é conduzido

**Projetar antes de executar, e executar pelo agente responsável.** A sessão
principal orquestra: escolhe o regime, resolve o grafo, monta o bloco de cada nó,
valida o contrato de saída e arbitra. Não implementa direto.

**Uma versão por entrega.** Funcional é `bNN`, corretiva é `.cN`. O ritual de
versão carimba os arquivos listados em `currentVersionFiles` de
`scripts/validate-ci-gates.mjs` — é o bloqueio mais banal e o que mais reincide.

**O documento vivo é o `CHANGELOG.md`.** Não criar `docs/IMPLEMENTACAO_*` novo:
os 90 e poucos que existem são rastro histórico, e duplicar o changelog neles foi
o que a §7.6 do plano da onda mandou parar.

## Arquitetura de um feature — inegociável

```
features/<modulo>/
├── types/        tipos do contrato do backend
├── schemas/      Zod (strict só em REQUEST, nunca em response)
├── api/          client Axios tipado
├── hooks/        React Query
└── components/   telas e diálogos, + <modulo>Labels.ts
```

Mais a rota em `app/(main)/<modulo>`, a permissão no union `PermissionCode`
(`types/erp.ts`), a regra em `lib/security/routePermissions.ts` e o item em
`layout/AppMenu.tsx`. **Item de menu novo custa três edições**, e o filtro avalia
item pai e item filho de forma independente: mudar a permissão do filho sem
mudar a do pai esconde o grupo inteiro de quem tem direito.

`.strict()` só em request. Rejeitar campo desconhecido em response quebra a tela
a cada campo aditivo do backend, e campo aditivo é a norma aqui.

## Permissões

O union `PermissionCode`, o catálogo, a regra de rota e o menu precisam contar a
mesma história, e três gates conferem isso:

```bash
npm run validate:backend-permissions     # union x snapshot do backend
npm run validate:guard-permission-map    # chamada HTTP x permissão do contrato
npm run validate:backend-contract-map    # rota consumida x rota que existe
```

Os artefatos que eles comparam são **gerados**, e o hook nega escrita à mão neles.
Se o gate reprova, a correção é no código ou na origem do artefato, nunca no
artefato.

**Corrigir guard tira acesso de alguém.** Antes de mexer, classifique em
`accessRisk` (`risk.yaml`): ilusão de clicar, capacidade real, ou auto-bloqueio.
O terceiro exige confirmação do usuário e ordem de concessão escrita no changelog.

## Testes

**Escopo por módulo, nunca a suíte completa** — ela estoura o ambiente desta
máquina e devolve falha que não é falha.

```bash
npx vitest run tests/unit/<modulo>*.test.ts
```

**E2E tem receita obrigatória**, porque o Playwright reusa em silêncio o que
estiver servindo a porta, e dois `next dev` do mesmo diretório corrompem o
`.next` compartilhado, com erro 500 em rota que existe:

```bash
npx next dev -p 3411
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts <spec>
```

Confira **quem** atende a porta antes de crer no resultado, e rode duas vezes.
Resultado inexplicado não vira conclusão: bloqueia até alguém medir.

**Gate estrutural prova que sabe ficar vermelho.** Nenhum gate é aceito por ficar
verde — roda contra árvore antiga com o defeito conhecido, com asserção por item
nominal. Para analisar outra revisão, `git worktree add`, nunca `git checkout` na
árvore principal.

## Entrega

O release gate está em `execution-graph.yaml`. Em resumo: gates do recorte verdes,
ritual de versão carimbado, `CHANGELOG.md` com entrada descritiva, e QA aprovado.
Commit só depois disso; abrir PR quando o bloco de onda fecha.

## Preferências de condução

- Docker só sob pedido explícito. O hook pede aprovação a cada vez.
- Número afirmado precisa dizer **como** foi medido. Estimativa apresentada como
  medição já custou duas rodadas.
- Agente que vê uma instrução aparecer por mudança de arquivo, em vez de vir no
  briefing, devolve `needs_decision` em vez de obedecer.
- Falha de nível barato escala com a saída bruta; nunca tenta diagnosticar sozinha.
