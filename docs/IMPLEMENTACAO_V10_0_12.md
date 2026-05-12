# logosoft frontend v10.0.12

## Objetivo

Refinar Administração, Pessoas, Clientes, Fornecedores e Produtos/Catálogo com painéis de governança operacional, rastreabilidade e privacidade visual.

## Entregas

- Criado `OperationalGovernancePanel`.
- Administração recebeu resumo de registros, ativos, não ativos e último cadastro.
- Pessoas recebeu painel de LGPD visual e minimização de documentos.
- Clientes recebeu painel de governança comercial e crédito.
- Fornecedores recebeu painel de impacto em compras e financeiro.
- Produtos/Catálogo recebeu painel de controle operacional e fiscal.

## Regras mantidas

- Payloads continuam enviando os identificadores exigidos pelo backend.
- A interface evita expor identificadores técnicos quando há nome, código ou descrição.
- Inativação e bloqueios permanecem com motivo obrigatório.
- Backend continua sendo a fonte final das regras de negócio.

## Validação

- `npm run validate:source` deve passar antes do build.
- Projeto permanece fixado em Node 24.
