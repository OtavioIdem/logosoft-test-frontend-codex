# logosoft-frontend v9.6.3 — Administração

Esta versão implementa o módulo de Administração usando o contrato real do backend v9.8.

## Rotas implementadas

- `/administracao/empresas`
- `/administracao/filiais`
- `/administracao/setores`
- `/administracao/cargos`
- `/administracao/centros-custo`

## Endpoints utilizados

- `GET /api/administracao/empresas`
- `POST /api/administracao/empresas`
- `PUT /api/administracao/empresas/{id}`
- `POST /api/administracao/empresas/{id}/inativar`
- `GET /api/administracao/filiais?empresaId={empresaId}`
- `POST /api/administracao/filiais`
- `PUT /api/administracao/filiais/{id}`
- `POST /api/administracao/filiais/{id}/inativar`
- `GET /api/administracao/setores?empresaId={empresaId}&filialId={filialId}`
- `POST /api/administracao/setores`
- `PUT /api/administracao/setores/{id}`
- `POST /api/administracao/setores/{id}/inativar`
- `GET /api/administracao/cargos?empresaId={empresaId}&filialId={filialId}`
- `POST /api/administracao/cargos`
- `PUT /api/administracao/cargos/{id}`
- `POST /api/administracao/cargos/{id}/inativar`
- `GET /api/administracao/centros-custo?empresaId={empresaId}&filialId={filialId}`
- `POST /api/administracao/centros-custo`
- `PUT /api/administracao/centros-custo/{id}`
- `POST /api/administracao/centros-custo/{id}/inativar`

## Regras aplicadas no frontend

- Não há exclusão física.
- Inativação sempre exige motivo.
- Registros não ativos não podem ser editados nem inativados pela interface.
- `Guid` vazio, `0`, `99` ou inválido não é enviado.
- Campos opcionais vazios são enviados como `null` ou omitidos pelo sanitizador.
- CNPJ/documento preserva letras; a validação final fica no backend.
- Enums de status numérico são exibidos como tags visuais.
- Permissões aplicadas:
  - `ADMINISTRACAO_CONSULTAR` para visualizar.
  - `ADMINISTRACAO_GERENCIAR` para criar, editar e inativar.

## Testes adicionados

- `tests/unit/administracaoPayload.test.ts`
- `tests/components/AdministracaoFormDialog.test.tsx`

## Próxima versão

A próxima entrega planejada é `v9.6.4`, com Pessoas, Clientes e Fornecedores usando os endpoints reais do contrato.
