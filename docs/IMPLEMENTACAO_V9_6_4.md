# logosoft frontend v9.6.4 — Pessoas, Clientes e Fornecedores

Esta versão substitui os placeholders genéricos de Pessoas, Clientes e Fornecedores por telas específicas integradas aos endpoints reais do contrato v9.8.

## Pessoas

Endpoints consumidos:

- `GET /api/pessoas?empresaId={empresaId}&filialId={filialId}&termo={termo}`
- `POST /api/pessoas`
- `PUT /api/pessoas/{id}`
- `POST /api/pessoas/{id}/inativar`

Campos cobertos:

- empresaId
- filialId nullable
- tipoPessoa numérico
- nomeRazaoSocial
- nomeFantasia
- documento
- inscrição estadual
- inscrição municipal
- observação
- status

O campo documento preserva letras para CNPJ alfanumérico. A validação definitiva continua sendo do backend.

## Clientes

Endpoints consumidos:

- `GET /api/clientes?empresaId={empresaId}&filialId={filialId}&termo={termo}`
- `POST /api/clientes`
- `PUT /api/clientes/{id}`
- `POST /api/clientes/{id}/bloquear-credito`
- `POST /api/clientes/{id}/desbloquear-credito`
- `POST /api/clientes/{id}/inativar`

Campos e ações cobertos:

- vínculo com pessoa
- código
- limite de crédito
- status de crédito
- observação
- bloquear crédito com motivo
- desbloquear crédito com motivo
- inativar com motivo

## Fornecedores

Endpoints consumidos:

- `GET /api/fornecedores?empresaId={empresaId}&filialId={filialId}&termo={termo}`
- `POST /api/fornecedores`
- `PUT /api/fornecedores/{id}`
- `POST /api/fornecedores/{id}/inativar`

Campos cobertos:

- vínculo com pessoa
- código
- observação
- status
- inativação com motivo

## Regras aplicadas no frontend

- Não envia referência técnica vazio, `0` ou `99`.
- Envia `filialId` como `null` quando vazio.
- Envia enums como número.
- Bloqueia edição/inativação de registros não ativos na interface.
- Exige motivo para inativar, bloquear e desbloquear crédito.
- Exibe mensagens via Toast e painéis visuais, sem `console.*`.

## Testes adicionados

- `tests/unit/pessoasClientesFornecedoresPayload.test.ts`

## Limitações restantes

- Endereços e contatos ainda dependem de endpoints específicos, que não constam no contrato v9.8.
- Máscara parcial de documento foi aplicada visualmente na listagem de Pessoas; permissões específicas de LGPD podem ser refinadas quando existirem no backend.
