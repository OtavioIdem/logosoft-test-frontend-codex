# Agentes — LogoSoft Frontend

Agentes especializados para o desenvolvimento do frontend. Cada um carrega as regras de `skills/desenvolvimento`, `skills/review` e `skills/projeto`, já calibradas para o stack real (Next 13 App Router, React 18, TS, PrimeReact/Sakai, React Query, Axios, Zod).

Eles se dividem em duas frentes. A **frente de projeto** decide o que construir; a **frente de execução** constrói, testa, revisa e publica.

## Frente de projeto — decidem, não implementam

| Agente | Papel | Edita código? | Modelo | Esforço |
| --- | --- | --- | --- | --- |
| `inventariante-contrato-tela` | Inventário tela x rota x endpoint x campo x permissão, com divergências de contrato | Não | sonnet | alto |
| `arquiteto-operacao-erp` | Advogado do operador: o fluxo real do ERP e o que a tela precisa permitir | Não | sonnet | alto |
| `arquiteto-plataforma-frontend` | Advogado do ano cinco: camada de dados, cache, volume, acoplamento e gates | Não | sonnet | alto |
| `arquiteto-escopo-entrega` | Advogado da entrega: o que **não** se constrói, sequência de versões, trade-offs | Não | sonnet | alto |
| `arquiteto-design-system` | Advogado do template: layout, UI/UX, padrão de tela e dívida visual entre módulos | Não | sonnet | alto |

Os quatro arquitetos têm **incentivos opostos de propósito**. Rodar um só devolve um lado da questão com cara de conclusão. Não achar discordância entre eles é sinal de briefing ruim, não de decisão fácil. O inventariante roda **antes** deles, sempre: arquiteto sem inventário debate o sistema que imagina.

Cada um escreve **um arquivo próprio** em `docs/arquitetura/debate/`, para poderem rodar em paralelo sem colisão. Quem arbitra e trava a decisão é a sessão principal, que registra em `docs/arquitetura/DECISOES.md`. Arquiteto que "decide" saiu do papel.

Mecanismo completo em `skills/projeto/`.

## Frente de execução — implementam a decisão travada

| Agente | Papel | Edita código? | Modelo | Esforço |
| --- | --- | --- | --- | --- |
| `arquiteto-frontend` | Projeta a entrega: módulo, telas, endpoints, permissões, testes e gates | Não | opus | alto |
| `dev-senior-react` | Implementação de produção: features, hooks, clients, schemas, correções | Sim | sonnet | alto |
| `designer-ux-erp` | Camada visual/UX no padrão PrimeReact/Sakai, estados de tela, responsividade | Sim (components/styles) | sonnet | alto |
| `engenheiro-testes` | Vitest/Testing Library, Playwright E2E e contrato, gates estruturais | Sim (tests/scripts) | haiku | médio |
| `qa-revisor` | Review por diff, gates obrigatórios, decisão APROVAR/BLOQUEAR | Não | haiku | médio |
| `devops-frontend` | Dev server, build, Docker, variáveis de ambiente, CI e diagnóstico | Sim (config/CI) | sonnet | médio |

## Fluxo obrigatório por demanda

Toda demanda passa primeiro por projeto e depois é executada pelo agente responsável — nada é implementado direto no fio da conversa.

```text
0. rodada de projeto    → só quando a demanda exige decisão de desenho
   0.1 inventariante-contrato-tela
   0.2 arquiteto-operacao-erp | arquiteto-plataforma-frontend |
       arquiteto-escopo-entrega | arquiteto-design-system   (em paralelo)
   0.3 sessão principal arbitra e registra em docs/arquitetura/DECISOES.md
1. arquiteto-frontend   → projeta a versão (bNN ou .cN) e define quem executa
2. dev-senior-react     → implementação
3. designer-ux-erp      → refino visual/UX da tela
4. engenheiro-testes    → regressões e cobertura do escopo
5. qa-revisor           → gates + decisão de commit
6. devops-frontend      → subir/buildar/validar pipeline quando necessário
```

O passo 1 é sempre executado. Os passos 2–6 são acionados conforme o plano indicar. Para forçar um agente específico, cite-o pelo nome (ex.: "use o `qa-revisor` para validar essa versão").

### Quando o passo 0 é obrigatório

```text
Módulo novo ou onda nova.
Tela que muda o fluxo de trabalho, não só o layout.
Contrato do backend ambíguo, ausente ou divergente do que a UI lê hoje.
Decisão que atravessa módulos (fiscal x financeiro, vendas x estoque).
Padrão de tela, template ou componente compartilhado novo.
Escolha de camada de dados, cache, paginação ou estado global.
Reescrita de algo que já existe e funciona.
```

Correção `.cN` com causa diagnosticada, ajuste de texto, campo a mais em formulário existente e bug de render **não** abrem rodada: vão direto ao agente responsável.

O `arquiteto-design-system` entra na rodada sempre que o assunto for layout, UI, UX ou template — e não apenas quando alguém pede "melhorar a tela". Ele debate o padrão; o `designer-ux-erp` implementa depois da decisão travada.

## Manual de execução por agente

Cada agente tem um arquivo próprio em `skills/agentes/` com o **procedimento**: briefing mínimo que ele exige receber, passos na ordem, comandos exatos, formato da entrega, erros que já custaram versão neste repositório e quando ele para e escala.

```text
skills/agentes/00_padrao_de_execucao.md   comum a todos: briefing, evidência, handoff, anti-padrões
skills/agentes/<nome-do-agente>.md        o manual daquele papel
```

O prompt em `.claude/agents/` define **quem o agente é**; a skill define **como ele trabalha**. Todo agente lê o próprio manual e o padrão comum antes de abrir arquivo do repositório. Passo pulado é declarado na entrega, nunca omitido.

Ao acionar um agente, o briefing nomeia a skill dele e entrega os cinco itens obrigatórios: missão em uma frase, recorte, fronteira, insumo e saída esperada. Briefing incompleto é devolvido — adivinhar custa uma versão.

## Regras que todos herdam

1. Sem mock produtivo e sem fallback silencioso para API real.
2. Sem GUID digitado para vínculo de entidade — select/autocomplete por endpoint real.
3. Regra fiscal/financeira/estoque é do backend; o frontend reflete workflow e bloqueio.
4. Nada sensível (token, senha, certificado, XML completo) em tela, log ou teste.
5. Escopo fechado: não reescrever arquivo fora do escopo nem remover arquivo rastreado sem justificativa.
6. Toda correção de bug nasce com regressão.
7. Resultado de gate é reportado como aconteceu — falha é falha.
8. Quem debate não decide, quem implementa não aprova, quem revisa não corrige.
9. Afirmação de fato carrega arquivo e trecho; intuição vai rotulada como intuição.
10. Comando que não rodou vira "não verificado" na entrega, nunca "aprovado".
11. Teste por escopo de módulo; a suíte completa estoura timeout de ambiente nesta máquina.
