# Skills operacionais — LogoSoft ERP Frontend

## Versão

```text
v1.11.0a8b28 — Skills operacionais para desenvolvimento e review
```

## Objetivo

Criar uma camada de documentação operacional reutilizável por ChatGPT e Codex, separando procedimentos de desenvolvimento e procedimentos de review.

## Estrutura criada

```text
skills/
├── README.md
├── desenvolvimento/
└── review/
```

## Desenvolvimento

A trilha `skills/desenvolvimento` orienta como implementar versões, correções e módulos especializados. Ela consolida normas de versionamento, escopo, ERP real, fiscal frontend, integração sem mocks, testes/gates e entrega de pacote.

## Review

A trilha `skills/review` orienta como o Codex deve revisar o pacote, comparar diff, rodar gates, validar comportamento, decidir commit ou bloquear com relatório técnico.

## Gate criado

Foi criado o script:

```bash
npm run validate:skills
```

Ele verifica a presença dos markdowns obrigatórios, frases críticas e integração com `validate:source`.

## Uso nas próximas versões

Antes de desenvolver:

```text
Ler skills/desenvolvimento/README.md e seguir a ordem indicada.
```

Antes de revisar:

```text
Ler skills/review/README.md e seguir a ordem indicada.
```
