# Agentes Codex — LogoSoft Frontend

Conversão dos agentes existentes em `.claude/agents/` para o formato nativo de agentes de projeto do Codex.

| Agente Codex | Origem Claude | Papel | Escrita | Modelo | Esforço |
| --- | --- | --- | --- | --- | --- |
| `arquiteto_frontend` | `arquiteto-frontend` | Planejamento de entrega, contratos, permissões, testes e gates | Não | `gpt-5.6-sol` | alto |
| `dev_senior_react` | `dev-senior-react` | Implementação React/Next.js de produção | Sim | `gpt-5.6-luna` | alto |
| `designer_ux_erp` | `designer-ux-erp` | UI/UX PrimeReact/Sakai e validação visual | Sim | `gpt-5.6-terra` | médio |
| `engenheiro_testes` | `engenheiro-testes` | Testes Vitest, Testing Library, Playwright e gates | Sim | `gpt-5.6-terra` | médio |
| `qa_revisor` | `qa-revisor` | Revisão por diff, gates e decisão de aprovação | Não | `gpt-5.6-luna` | médio |
| `devops_frontend` | `devops-frontend` | Execução, build, Docker e CI | Sim | `gpt-5.6-terra` | médio |

## Fluxo de trabalho

1. `arquiteto_frontend` projeta a versão e delimita o escopo.
2. `dev_senior_react` implementa a funcionalidade ou correção.
3. `designer_ux_erp` refina e valida a experiência visual quando aplicável.
4. `engenheiro_testes` cria ou ajusta a proteção de regressão.
5. `qa_revisor` avalia o diff e os gates e decide aprovar ou bloquear.
6. `devops_frontend` atua quando houver autorização para execução, build, Docker ou CI.

Os agentes do Codex usam nomes com `_` para seguir a convenção do campo `name`. Os arquivos originais em `.claude/agents/` permanecem como fonte de comparação.

As referências a ferramentas exclusivas do Claude foram adaptadas para capacidades equivalentes do Codex. Nenhum agente recebe autorização automática para build, publicação ou commit; essas ações continuam dependendo do pedido atual do usuário.
