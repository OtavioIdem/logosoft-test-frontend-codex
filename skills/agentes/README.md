# Skills por agente — manual de execução

Uma skill por agente. Cada arquivo é o **manual de operação** daquele papel: missão em uma
frase, o que ele exige receber antes de começar, o procedimento passo a passo, os comandos
exatos, o formato da entrega, os erros que já custaram versão neste repositório e quando ele
para e escala.

O prompt do agente em `.claude/agents/` define **quem ele é**. Esta pasta define **como ele
trabalha**. Prompt muda pouco; procedimento muda quando o repositório muda.

## Índice

| Agente | Skill | Frente |
| --- | --- | --- |
| — | `00_padrao_de_execucao.md` | comum a todos |
| `inventariante-contrato-tela` | `inventariante-contrato-tela.md` | projeto |
| `arquiteto-operacao-erp` | `arquiteto-operacao-erp.md` | projeto |
| `arquiteto-plataforma-frontend` | `arquiteto-plataforma-frontend.md` | projeto |
| `arquiteto-escopo-entrega` | `arquiteto-escopo-entrega.md` | projeto |
| `arquiteto-design-system` | `arquiteto-design-system.md` | projeto |
| `arquiteto-frontend` | `arquiteto-frontend.md` | execução |
| `dev-senior-react` | `dev-senior-react.md` | execução |
| `designer-ux-erp` | `designer-ux-erp.md` | execução |
| `engenheiro-testes` | `engenheiro-testes.md` | execução |
| `qa-revisor` | `qa-revisor.md` | execução |
| `devops-frontend` | `devops-frontend.md` | execução |

## Como usar

1. O orquestrador aciona o agente e nomeia, no briefing, a skill dele.
2. O agente lê `00_padrao_de_execucao.md` e a própria skill **antes** de abrir qualquer arquivo
   do repositório.
3. Segue o procedimento na ordem escrita. Passo pulado é declarado na entrega, nunca omitido.
4. Fecha com o formato de saída da própria skill.

Estas skills não substituem `skills/desenvolvimento`, `skills/review` e `skills/projeto`. Elas
dizem **o que fazer e em que ordem**; aquelas dizem **quais regras valem**.
