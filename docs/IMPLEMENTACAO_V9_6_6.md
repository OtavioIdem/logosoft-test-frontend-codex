# Implementação v9.6.6 — Estoque + dropdown Empresa/Filial

## Escopo

Implementa o módulo de Estoque usando os endpoints reais do contrato backend v9.8 e adiciona melhoria transversal para campos `empresaId` e `filialId`: seleção por dropdown pesquisável alimentado pela API de Administração.

## Endpoints usados

- `GET/POST/PUT/POST /api/estoque/locais`
- `GET /api/estoque/saldos`
- `GET /api/estoque/movimentos`
- `POST /api/estoque/entradas`
- `POST /api/estoque/saidas`
- `POST /api/estoque/ajustes`
- `GET/POST/POST /api/estoque/reservas`
- `GET/POST/POST /api/estoque/inventarios`
- `GET /api/administracao/empresas` para dropdown de empresa
- `GET /api/administracao/filiais?empresaId={empresaId}` para dropdown de filial

## Telas implementadas

- Locais de estoque
- Saldos
- Movimentos
- Entradas
- Saídas
- Ajustes
- Reservas
- Inventários

## Regras de UI aplicadas

- Empresa e filial são selecionadas por nome/descrição via dropdown.
- Payload envia apenas referência técnica.
- `filialId` é opcional e enviado como `null`/omitido quando vazio.
- Inativação, cancelamento, baixa e fechamento exigem motivo.
- Movimentos operacionais exigem produto, local, quantidade e motivo.
- Inventário aberto aceita itens, fechamento e cancelamento; fechado/cancelado bloqueia ações.

## Permissões usadas

- `ESTOQUE_CONSULTAR`
- `ESTOQUE_MOVIMENTAR`
- `ESTOQUE_RESERVAR`
- `ESTOQUE_INVENTARIO_GERENCIAR`
- `LOCAIS_ESTOQUE_GERENCIAR`

## Observação

A tela de login ainda não usa dropdown de empresa/filial porque os endpoints de empresa/filial são protegidos e o usuário ainda não possui token antes do login. Para login de usuário comum, o backend segue exigindo registro válido quando aplicável.
