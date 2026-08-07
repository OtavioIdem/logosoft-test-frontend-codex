# Agentes — LogoSoft Frontend

Agentes especializados para o desenvolvimento do frontend. Cada um carrega as regras de `skills/desenvolvimento` e `skills/review` já calibradas para o stack real (Next 13 App Router, React 18, TS, PrimeReact/Sakai, React Query, Axios, Zod).

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
1. arquiteto-frontend   → projeta a versão (bNN ou .cN) e define quem executa
2. dev-senior-react     → implementação
3. designer-ux-erp      → refino visual/UX da tela
4. engenheiro-testes    → regressões e cobertura do escopo
5. qa-revisor           → gates + decisão de commit
6. devops-frontend      → subir/buildar/validar pipeline quando necessário
```

O passo 1 é sempre executado. Os passos 2–6 são acionados conforme o plano indicar. Para forçar um agente específico, cite-o pelo nome (ex.: "use o `qa-revisor` para validar essa versão").

## Regras que todos herdam

1. Sem mock produtivo e sem fallback silencioso para API real.
2. Sem GUID digitado para vínculo de entidade — select/autocomplete por endpoint real.
3. Regra fiscal/financeira/estoque é do backend; o frontend reflete workflow e bloqueio.
4. Nada sensível (token, senha, certificado, XML completo) em tela, log ou teste.
5. Escopo fechado: não reescrever arquivo fora do escopo nem remover arquivo rastreado sem justificativa.
6. Toda correção de bug nasce com regressão.
7. Resultado de gate é reportado como aconteceu — falha é falha.
