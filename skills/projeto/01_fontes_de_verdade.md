# Skill — Fontes de verdade do projeto

## Hierarquia

Quando duas fontes discordarem, vale a de cima:

```text
1. Backend em execução (resposta real de endpoint)
2. Código do backend em ../New project 3/src
3. docs/CONTRATO_*.md e docs/contracts/
4. Código do frontend em features/ e lib/
5. docs/IMPLEMENTACAO_*.md da versão correspondente
6. Documento de plano (PLANO-*.md, LEVANTAMENTO_*.md)
```

Divergência entre níveis **não é detalhe**: é achado, e vira item no documento de posição.

## Onde olhar, por pergunta

| Pergunta | Onde |
| --- | --- |
| O que a tela faz hoje | `features/<modulo>/`, `app/(main)/<modulo>/` |
| Qual endpoint ela chama | `features/<modulo>/api/`, `lib/http/httpClient` |
| Qual o formato do payload | `features/<modulo>/schemas/` (Zod) e `types/` |
| O que o backend realmente entrega | `../New project 3/src/**` (leitura), `docs/contracts/` |
| Quais permissões existem | `lib/security/routePermissions.ts`, `features/seguranca/permissoesCatalogo.ts`, `types/erp.ts` |
| O que o gate já congela | `scripts/*.mjs`, `package.json` (`ci:gates`) |
| Qual padrão visual vigora | `components/common/`, `styles/layout/`, `docs/DIRETRIZES_UX_REFERENCIAS.md` |
| Qual foi a última decisão | `docs/arquitetura/DECISOES.md`, `docs/IMPLEMENTACAO_*.md` mais recente |
| Qual a versão base | `package.json` (`version`, `logosoftVersion`), `config/app.ts` |

## O que nunca é fonte

```text
Memória de conversa anterior.
Mock em tests/mocks/ ou fixture Playwright.
Tela antiga que ninguém confirmou que ainda reflete o backend.
"O ERP normalmente faz assim".
Regra fiscal, tributária ou contábil deduzida sem documento.
```

## Citação obrigatória

Toda afirmação de fato num documento de posição carrega **arquivo e trecho**. Sem citação, é
opinião — e opinião deve ser rotulada como tal, na própria frase.

```text
Correto:  "features/financeiro/schemas/contaPagar.ts:34 declara valorPago obrigatório; o
           backend em ../New project 3/src/.../ContaPagarResponse.cs não emite o campo."
Correto:  "Isto é intuição, não medição: acho que a lista de produtos vai passar de 10 mil linhas."
Errado:   "O backend provavelmente já retorna esse campo."
```

## Quando a fonte é omissa

Fonte omissa **não vira suposição**. Vira uma destas três saídas, e o documento diz qual:

1. **Pergunta ao backend** — o campo/endpoint existe? Registrar como pendência de contrato.
2. **Pergunta ao cliente** — a regra de operação é qual? Registrar como pendência funcional.
3. **Decisão travada com premissa declarada** — segue-se assumindo X, e o documento escreve
   o que quebra se X for falso.

Pendência externa custa zero token e destrava a rodada. Suposição não declarada custa uma
versão bloqueada.
