# Contrato da API do backend — referência completa (v1.23.2+)

> **Arquivo gerado.** Não edite à mão. Regenere com `scripts/gerar-contrato-frontend.mjs` **do repositório do backend**
> (ver `docs/frontend/README.md` do backend). Gerado em 2026-09-08 a partir do `swagger.json` do backend
> **em execução** (`v1.23.2`, já contendo as fatias v1.23.1/G2, v1.23.2/G3 e v1.23.6/G3),
> cruzado com os controllers (permissões), as interfaces de serviço (tipo de response) e as
> chamadas reais do frontend em `../New project`.

## Como ler

| Campo | De onde vem | Confiabilidade |
| --- | --- | --- |
| **Rota e verbo** | `swagger.json` do backend em execução | **exata** |
| **Permissão** | `[RequiredPermission]` no controller | **exata** |
| **Request** | schema OpenAPI (462 schemas declarados) | **exata** |
| **Response DTO** | nome do tipo, ligando ação → `I*Service` → `Result<T>` | derivado — 436 de 580 ações |
| **Response (corpo)** | definição do `record` em `Erp.Application` | derivado do C#, **não** do spec |
| **Frontend** | `scanFrontendRoutes` do próprio frontend (AST TypeScript), casando **método + rota** | **exata** |

## ⚠️ A limitação que atravessa este documento inteiro

**Nenhuma das 579 operações declara schema de response.** `[ProducesResponseType]` é usado
**zero** vezes nos 96 controllers, e todas as ações retornam `IActionResult`. Consequências:

1. O OpenAPI descreve **request** com precisão total e **response** com precisão nenhuma.
2. **Nenhum tipo de response do frontend pode ser gerado** — todos são escritos à mão, e
   nada verifica se continuam corretos. É exatamente por isso que campo novo em response
   (como o `Alertas` de `TransmissaoSefazResponse`, v1.23.2/G6) chega à tela como
   `undefined` em silêncio, em vez de quebrar o build.
3. As seções **Response** abaixo vêm do `record` C#, não do contrato publicado. Elas são a
   melhor fonte disponível hoje, e ficam desatualizadas sem aviso.

Fechar isso é a alavanca de maior retorno do lado do backend, e está proposta como
**Onda F0** no [plano do frontend](PLANO-FRONTEND-v1.23.md).

## Números

| Medida | Valor |
| --- | --- |
| Operações HTTP | **579** (478 rotas distintas, 96 controllers) |
| Módulos (tags) | **95** |
| Consumidas pelo frontend | **457 (79%)** |
| **Não** consumidas | **122** |
| Permissões no backend | **178** (mais `MASTER_GOD` e `*`) |
| Operações **sem** `[RequiredPermission]` | **9** — 3 de `health`, 6 de `auth`. Todo o resto é explicitamente protegido |

---

## Anexos — 4/5 consumidos pelo frontend

### `GET /api/anexos`

| | |
|---|---|
| Permissão | `ANEXOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `modulo?` `entidade?` `entidadeId?` `categoria?` `incluirInativos?` |


### `POST /api/anexos`

| | |
|---|---|
| Permissão | `ANEXOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `DocumentoAnexoResponse` |

**Request**
```ts
{
  Arquivo?: binary
  EmpresaId?: uuid
  FilialId?: uuid
  ModuloOrigem?: string
  EntidadeVinculada?: string
  EntidadeVinculadaId?: uuid
  Categoria?: Erp.Domain.Anexos.CategoriaAnexo
  Descricao?: string
}
```

**Response** (C#, `DocumentoAnexoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string ModuloOrigem
  string EntidadeVinculada
  Guid EntidadeVinculadaId
  CategoriaAnexo Categoria
  string NomeArquivo
  string ContentType
  long TamanhoBytes
  string HashSha256
  string? Descricao
  bool Ativo
  string? MotivoInativacao
  DateTimeOffset CriadoEm
}
```


### `GET /api/anexos/{id}`

| | |
|---|---|
| Permissão | `ANEXOS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `UsuarioResponse` |

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `GET /api/anexos/{id}/download`

| | |
|---|---|
| Permissão | `ANEXOS_BAIXAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaFinanceiraResponse` |

**Response** (C#, `ContaFinanceiraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoContaFinanceira Tipo
  Guid ParticipanteId
  string Descricao
  string? Documento
  decimal ValorOriginal
  decimal Saldo
  DateOnly DataEmissao
  DateOnly DataVencimento
  StatusContaFinanceira Status
  string? OrigemModulo
  Guid? OrigemId
  IReadOnlyList<BaixaFinanceiraResponse> Baixas
}
```


### `POST /api/anexos/{id}/inativar`

| | |
|---|---|
| Permissão | `ANEXOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## Atividades — 8/8 consumidos pelo frontend

### `GET /api/atividades`

| | |
|---|---|
| Permissão | `ATIVIDADES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `responsavelUsuarioId?` `status?` `prioridade?` `prazoInicial?` `prazoFinal?` `entidadeOrigem?` `entidadeOrigemId?` `termo?` `page?` `pageSize?` |


### `POST /api/atividades`

| | |
|---|---|
| Permissão | `ATIVIDADES_CRIAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  titulo?: string | null
  descricao?: string | null
  prioridade?: Erp.Domain.Workflow.PrioridadeAtividade
  responsavelUsuarioId?: uuid | null
  prazoEm?: date-time | null
  entidadeOrigem?: string | null
  entidadeOrigemId?: uuid | null
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `GET /api/atividades/{id}`

| | |
|---|---|
| Permissão | `ATIVIDADES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `PUT /api/atividades/{id}`

| | |
|---|---|
| Permissão | `ATIVIDADES_ATUALIZAR` |
| Frontend | ✅ consome |
| Response DTO | `CargoAcessoResponse` |

**Request**
```ts
{
  titulo?: string | null
  descricao?: string | null
  prioridade?: Erp.Domain.Workflow.PrioridadeAtividade
  prazoEm?: date-time | null
}
```

**Response** (C#, `CargoAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  string Nome
  string? Descricao
  int NivelHierarquico
  bool Ativo
  IReadOnlyCollection<Guid> GruposAcessoIds
}
```


### `POST /api/atividades/{id}/atribuir`

| | |
|---|---|
| Permissão | `ATIVIDADES_ATRIBUIR` |
| Frontend | ✅ consome |
| Response DTO | `AtividadeResponse` |

**Request**
```ts
{
  responsavelUsuarioId?: uuid | null
}
```

**Response** (C#, `AtividadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  string? Descricao
  StatusAtividade Status
  PrioridadeAtividade Prioridade
  Guid? ResponsavelUsuarioId
  Guid CriadoPorUsuarioId
  DateTimeOffset? PrazoEm
  DateTimeOffset? ConcluidaEm
  DateTimeOffset? CanceladaEm
  string? MotivoCancelamento
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  DateTimeOffset CreatedAt
  IReadOnlyList<AtividadeHistoricoResponse> Historicos
  IReadOnlyList<AtividadeComentarioResponse> Comentarios
}
```


### `POST /api/atividades/{id}/cancelar`

| | |
|---|---|
| Permissão | `ATIVIDADES_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/atividades/{id}/comentarios`

| | |
|---|---|
| Permissão | `ATIVIDADES_COMENTAR` |
| Frontend | ✅ consome |
| Response DTO | `AtividadeResponse` |

**Request**
```ts
{
  mensagem?: string | null
}
```

**Response** (C#, `AtividadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  string? Descricao
  StatusAtividade Status
  PrioridadeAtividade Prioridade
  Guid? ResponsavelUsuarioId
  Guid CriadoPorUsuarioId
  DateTimeOffset? PrazoEm
  DateTimeOffset? ConcluidaEm
  DateTimeOffset? CanceladaEm
  string? MotivoCancelamento
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  DateTimeOffset CreatedAt
  IReadOnlyList<AtividadeHistoricoResponse> Historicos
  IReadOnlyList<AtividadeComentarioResponse> Comentarios
}
```


### `POST /api/atividades/{id}/status`

| | |
|---|---|
| Permissão | `ATIVIDADES_ATUALIZAR` |
| Frontend | ✅ consome |
| Response DTO | `AtividadeResponse` |

**Request**
```ts
{
  status?: Erp.Domain.Workflow.StatusAtividade
  comentario?: string | null
}
```

**Response** (C#, `AtividadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  string? Descricao
  StatusAtividade Status
  PrioridadeAtividade Prioridade
  Guid? ResponsavelUsuarioId
  Guid CriadoPorUsuarioId
  DateTimeOffset? PrazoEm
  DateTimeOffset? ConcluidaEm
  DateTimeOffset? CanceladaEm
  string? MotivoCancelamento
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  DateTimeOffset CreatedAt
  IReadOnlyList<AtividadeHistoricoResponse> Historicos
  IReadOnlyList<AtividadeComentarioResponse> Comentarios
}
```


## Auditoria — 3/3 consumidos pelo frontend

### `GET /api/auditoria/eventos`

| | |
|---|---|
| Permissão | `AUDITORIA_CONSULTAR` |
| Frontend | ✅ consome |


### `GET /api/auditoria/eventos-recentes`

| | |
|---|---|
| Permissão | `AUDITORIA_OPERACIONAL_CONSULTAR` |
| Frontend | ✅ consome |


### `GET /api/auditoria/operacional`

| | |
|---|---|
| Permissão | `AUDITORIA_OPERACIONAL_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `usuarioId?` `modulo?` `entidade?` `entidadeId?` `acao?` `dataInicial?` `dataFinal?` `termo?` `page?` `pageSize?` |


## Ausencias — 10/10 consumidos pelo frontend

### `GET /api/rh/afastamentos`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `colaboradorId?` `status?` |


### `POST /api/rh/afastamentos`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `AfastamentoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  colaboradorId?: uuid
  tipo?: Erp.Domain.Rh.TipoAfastamento
  dataInicio?: date-time
  dataFimPrevista?: date-time | null
  cid?: string | null
  observacao?: string | null
}
```

**Response** (C#, `AfastamentoResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  TipoAfastamento Tipo
  DateTimeOffset DataInicio
  DateTimeOffset? DataFimPrevista
  DateTimeOffset? DataFimReal
  string? Cid
  string? Observacao
  StatusAfastamento StatusAfastamento
}
```


### `POST /api/rh/afastamentos/{id}/encerrar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `AfastamentoResponse` |

**Request**
```ts
{
  dataFimReal?: date-time | null
}
```

**Response** (C#, `AfastamentoResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  TipoAfastamento Tipo
  DateTimeOffset DataInicio
  DateTimeOffset? DataFimPrevista
  DateTimeOffset? DataFimReal
  string? Cid
  string? Observacao
  StatusAfastamento StatusAfastamento
}
```


### `GET /api/rh/ferias`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `colaboradorId?` `status?` |


### `POST /api/rh/ferias`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FeriasResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  colaboradorId?: uuid
  periodoAquisitivoInicio?: date-time
  periodoAquisitivoFim?: date-time
  dataInicio?: date-time
  dataFim?: date-time
  observacao?: string | null
}
```

**Response** (C#, `FeriasResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset PeriodoAquisitivoInicio
  DateTimeOffset PeriodoAquisitivoFim
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiasGozo
  string? Observacao
  StatusFerias StatusFerias
}
```


### `POST /api/rh/ferias/{id}/aprovar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FeriasResponse` |

**Response** (C#, `FeriasResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset PeriodoAquisitivoInicio
  DateTimeOffset PeriodoAquisitivoFim
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiasGozo
  string? Observacao
  StatusFerias StatusFerias
}
```


### `POST /api/rh/ferias/{id}/cancelar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FeriasResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `FeriasResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset PeriodoAquisitivoInicio
  DateTimeOffset PeriodoAquisitivoFim
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiasGozo
  string? Observacao
  StatusFerias StatusFerias
}
```


### `POST /api/rh/ferias/{id}/concluir`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FeriasResponse` |

**Response** (C#, `FeriasResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset PeriodoAquisitivoInicio
  DateTimeOffset PeriodoAquisitivoFim
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiasGozo
  string? Observacao
  StatusFerias StatusFerias
}
```


### `POST /api/rh/ferias/{id}/iniciar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FeriasResponse` |

**Response** (C#, `FeriasResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset PeriodoAquisitivoInicio
  DateTimeOffset PeriodoAquisitivoFim
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiasGozo
  string? Observacao
  StatusFerias StatusFerias
}
```


### `POST /api/rh/ferias/{id}/rejeitar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FeriasResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `FeriasResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset PeriodoAquisitivoInicio
  DateTimeOffset PeriodoAquisitivoFim
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiasGozo
  string? Observacao
  StatusFerias StatusFerias
}
```


## Auth — 4/6 consumidos pelo frontend

### `POST /api/auth/bootstrap-admin`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ❌ **não consome** |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  nome?: string | null
  email?: string | null
  senha?: string | null
  empresaId?: uuid
  filialId?: uuid | null
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `POST /api/auth/login`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ✅ consome |
| Response DTO | `LoginResponse` |

**Request**
```ts
{
  email?: string | null
  password?: string | null
  codigoEmpresa?: string | null
}
```

**Response** (C#, `LoginResponse`)
```csharp
{
  Guid UsuarioId
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  string? CodigoEmpresa
  bool EmpresaValidada
  string AccessToken
  DateTimeOffset AccessTokenExpiraEm
  string RefreshToken
  DateTimeOffset RefreshTokenExpiraEm
  IReadOnlyCollection<string> Permissoes
}
```


### `POST /api/auth/logout`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  refreshToken?: string | null
}
```


### `GET /api/auth/me`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ✅ consome |


### `POST /api/auth/refresh`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ✅ consome |
| Response DTO | `RefreshTokenResponse` |

**Request**
```ts
{
  refreshToken?: string | null
}
```

**Response** (C#, `RefreshTokenResponse`)
```csharp
{
  string AccessToken
  DateTimeOffset AccessTokenExpiraEm
  string RefreshToken
  DateTimeOffset RefreshTokenExpiraEm
  Guid EmpresaId
  Guid? FilialId
  IReadOnlyCollection<string> Permissoes
}
```


### `POST /api/auth/validar-empresa`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ❌ **não consome** |
| Response DTO | `ValidarEmpresaResponse` |

**Request**
```ts
{
  codigoEmpresa?: string | null
}
```

**Response** (C#, `ValidarEmpresaResponse`)
```csharp
{
  string CodigoEmpresa
  bool Ativa
  string OrigemValidacao
  string Mensagem
}
```


## Bancos — 4/4 consumidos pelo frontend

### `POST /api/bancos`

| | |
|---|---|
| Permissão | `BANCOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BancoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
}
```

**Response** (C#, `BancoResponse`)
```csharp
{
  Guid Id
  string Codigo
  string Nome
}
```


### `POST /api/bancos/carteiras`

| | |
|---|---|
| Permissão | `BANCOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CarteiraCobrancaResponse` |

**Request**
```ts
{
  convenioBancarioId?: uuid
  codigo?: string | null
  tipoCobranca?: Erp.Domain.Bancos.TipoCobranca
}
```

**Response** (C#, `CarteiraCobrancaResponse`)
```csharp
{
  Guid Id
  Guid ConvenioBancarioId
  string Codigo
  TipoCobranca TipoCobranca
  long UltimoNossoNumero
}
```


### `POST /api/bancos/contas-bancarias`

| | |
|---|---|
| Permissão | `BANCOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaBancariaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  bancoId?: uuid
  agencia?: string | null
  agenciaDv?: string | null
  conta?: string | null
  contaDv?: string | null
}
```

**Response** (C#, `ContaBancariaResponse`)
```csharp
{
  Guid Id
  Guid BancoId
  string Agencia
  string? AgenciaDv
  string Conta
  string? ContaDv
}
```


### `POST /api/bancos/convenios`

| | |
|---|---|
| Permissão | `BANCOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ConvenioBancarioResponse` |

**Request**
```ts
{
  contaBancariaId?: uuid
  codigoConvenio?: string | null
  codigoCedente?: string | null
}
```

**Response** (C#, `ConvenioBancarioResponse`)
```csharp
{
  Guid Id
  Guid ContaBancariaId
  string CodigoConvenio
  string CodigoCedente
}
```


## Beneficios — 6/6 consumidos pelo frontend

### `GET /api/rh/beneficios`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


### `POST /api/rh/beneficios`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BeneficioResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  tipo?: Erp.Domain.Rh.TipoBeneficio
  valorPadrao?: number
  descricao?: string | null
}
```

**Response** (C#, `BeneficioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  TipoBeneficio Tipo
  decimal ValorPadrao
  string? Descricao
}
```


### `PUT /api/rh/beneficios/{id}`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BeneficioResponse` |

**Request**
```ts
{
  nome?: string | null
  tipo?: Erp.Domain.Rh.TipoBeneficio
  valorPadrao?: number
  descricao?: string | null
}
```

**Response** (C#, `BeneficioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  TipoBeneficio Tipo
  decimal ValorPadrao
  string? Descricao
}
```


### `GET /api/rh/beneficios/concessoes`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `colaboradorId?` `status?` |


### `POST /api/rh/beneficios/concessoes`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ColaboradorBeneficioResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  colaboradorId?: uuid
  beneficioId?: uuid
  valor?: number
  dataInicio?: date-time
}
```

**Response** (C#, `ColaboradorBeneficioResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  Guid BeneficioId
  decimal Valor
  DateTimeOffset DataInicio
  DateTimeOffset? DataFim
  StatusColaboradorBeneficio StatusColaboradorBeneficio
}
```


### `POST /api/rh/beneficios/concessoes/{id}/encerrar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ColaboradorBeneficioResponse` |

**Request**
```ts
{
  dataFim?: date-time | null
}
```

**Response** (C#, `ColaboradorBeneficioResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  Guid BeneficioId
  decimal Valor
  DateTimeOffset DataInicio
  DateTimeOffset? DataFim
  StatusColaboradorBeneficio StatusColaboradorBeneficio
}
```


## BensPatrimoniais — 7/8 consumidos pelo frontend

### `GET /api/patrimonio/bens`

| | |
|---|---|
| Permissão | `PATRIMONIO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `categoria?` `status?` `termo?` |


### `POST /api/patrimonio/bens`

| | |
|---|---|
| Permissão | `PATRIMONIO_BENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BemPatrimonialResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  descricao?: string | null
  categoria?: Erp.Domain.Patrimonio.CategoriaBemPatrimonial
  dataAquisicao?: date-time
  valorAquisicao?: number
  valorResidual?: number
  vidaUtilMeses?: integer
  metodo?: Erp.Domain.Patrimonio.MetodoDepreciacao
  setorId?: uuid | null
  responsavelId?: uuid | null
  contaAtivoId?: uuid | null
  contaDepreciacaoAcumuladaId?: uuid | null
  contaDespesaDepreciacaoId?: uuid | null
}
```

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


### `GET /api/patrimonio/bens/{id}`

| | |
|---|---|
| Permissão | `PATRIMONIO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `BemPatrimonialResponse` |

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


### `PUT /api/patrimonio/bens/{id}`

| | |
|---|---|
| Permissão | `PATRIMONIO_BENS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `BemPatrimonialResponse` |

**Request**
```ts
{
  descricao?: string | null
  categoria?: Erp.Domain.Patrimonio.CategoriaBemPatrimonial
  vidaUtilMeses?: integer
  valorResidual?: number
  contaAtivoId?: uuid | null
  contaDepreciacaoAcumuladaId?: uuid | null
  contaDespesaDepreciacaoId?: uuid | null
}
```

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


### `POST /api/patrimonio/bens/{id}/baixar`

| | |
|---|---|
| Permissão | `PATRIMONIO_BAIXAR` |
| Frontend | ✅ consome |
| Response DTO | `BemPatrimonialResponse` |

**Request**
```ts
{
  data?: date-time | null
  motivo?: Erp.Domain.Patrimonio.MotivoBaixaPatrimonial
  justificativa?: string | null
  valorBaixa?: number | null
}
```

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


### `POST /api/patrimonio/bens/{id}/bloquear`

| | |
|---|---|
| Permissão | `PATRIMONIO_BENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BemPatrimonialResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


### `POST /api/patrimonio/bens/{id}/desbloquear`

| | |
|---|---|
| Permissão | `PATRIMONIO_BENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BemPatrimonialResponse` |

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


### `POST /api/patrimonio/bens/{id}/transferir`

| | |
|---|---|
| Permissão | `PATRIMONIO_TRANSFERIR` |
| Frontend | ✅ consome |
| Response DTO | `BemPatrimonialResponse` |

**Request**
```ts
{
  setorNovoId?: uuid | null
  responsavelNovoId?: uuid | null
  data?: date-time | null
  observacao?: string | null
}
```

**Response** (C#, `BemPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  CategoriaBemPatrimonial Categoria
  DateTimeOffset DataAquisicao
  decimal ValorAquisicao
  decimal ValorResidual
  int VidaUtilMeses
  MetodoDepreciacao Metodo
  Guid? SetorId
  Guid? ResponsavelId
  Guid? ContaAtivoId
  Guid? ContaDepreciacaoAcumuladaId
  Guid? ContaDespesaDepreciacaoId
  decimal DepreciacaoAcumulada
  int MesesDepreciados
  int? UltimaCompetenciaDepreciada
  decimal ValorContabilAtual
  StatusBemPatrimonial StatusBem
  bool Bloqueado
  string? MotivoBloqueio
  DateTimeOffset? DataBaixa
  MotivoBaixaPatrimonial? MotivoBaixa
  string? JustificativaBaixa
  decimal? ValorBaixa
  IReadOnlyList<MovimentacaoBemResponse> Movimentacoes
  IReadOnlyList<DepreciacaoBemResponse> Depreciacoes
}
```


## Boletos — 5/5 consumidos pelo frontend

### `GET /api/bancos/boletos`

| | |
|---|---|
| Permissão | `BANCOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<BoletoResponse>` |
| Query | `EmpresaId?` `FilialId?` `ContaBancariaId?` `Status?` |

**Response** (C#, `IReadOnlyCollection<BoletoResponse>`)
```csharp
{
  Guid Id
  Guid ContaReceberId
  Guid ParcelaReceberId
  Guid CarteiraCobrancaId
  long NossoNumero
  string NumeroDocumento
  DateTimeOffset DataEmissao
  DateTimeOffset DataVencimento
  decimal ValorTitulo
  StatusBoleto StatusBoleto
  string? LinhaDigitavel
  string? CodigoBarras
  DateTimeOffset? DataLiquidacao
  decimal? ValorPago
}
```


### `GET /api/bancos/boletos/{id}`

| | |
|---|---|
| Permissão | `BANCOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `BoletoResponse` |

**Response** (C#, `BoletoResponse`)
```csharp
{
  Guid Id
  Guid ContaReceberId
  Guid ParcelaReceberId
  Guid CarteiraCobrancaId
  long NossoNumero
  string NumeroDocumento
  DateTimeOffset DataEmissao
  DateTimeOffset DataVencimento
  decimal ValorTitulo
  StatusBoleto StatusBoleto
  string? LinhaDigitavel
  string? CodigoBarras
  DateTimeOffset? DataLiquidacao
  decimal? ValorPago
}
```


### `POST /api/bancos/boletos/{id}/cancelar`

| | |
|---|---|
| Permissão | `BOLETOS_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `BoletoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `BoletoResponse`)
```csharp
{
  Guid Id
  Guid ContaReceberId
  Guid ParcelaReceberId
  Guid CarteiraCobrancaId
  long NossoNumero
  string NumeroDocumento
  DateTimeOffset DataEmissao
  DateTimeOffset DataVencimento
  decimal ValorTitulo
  StatusBoleto StatusBoleto
  string? LinhaDigitavel
  string? CodigoBarras
  DateTimeOffset? DataLiquidacao
  decimal? ValorPago
}
```


### `GET /api/bancos/boletos/{id}/historico`

| | |
|---|---|
| Permissão | `BANCOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<BoletoHistoricoResponse>` |

**Response** (C#, `IReadOnlyCollection<BoletoHistoricoResponse>`)
```csharp
{
  Guid Id
  StatusBoleto StatusAnterior
  StatusBoleto StatusNovo
  string Observacao
  Guid? UsuarioId
  DateTimeOffset Data
}
```


### `POST /api/bancos/boletos/gerar`

| | |
|---|---|
| Permissão | `BOLETOS_GERAR` |
| Frontend | ✅ consome |
| Response DTO | `GerarBoletoResponse` |

**Request**
```ts
{
  contaReceberId?: uuid
  parcelaReceberId?: uuid
  carteiraCobrancaId?: uuid
  numeroDocumento?: string | null
}
```

**Response** (C#, `GerarBoletoResponse`)
```csharp
{
  BoletoResponse Boleto
  IReadOnlyCollection<string> Alertas
}
```


## CadastrosFiscais — 2/16 consumidos pelo frontend

### `GET /api/fiscal/cadastros/cest`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `segmento?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/cfop`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `termo?` `codigo?` `tipo?` `ambito?` `indicadorDevolucao?` `indicadorTransferencia?` `indicadorIndustrializacao?` `geraFinanceiro?` `movimentaEstoque?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/codigos-servico`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `municipioCodigoIbge?` `codigoLc116?` `termo?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/csosn`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/cst-icms`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/cst-ipi`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `indicadorOperacao?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/cst-pis-cofins`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `indicadorOperacao?` `geraCredito?` `ativo?` `pagina?` `tamanhoPagina?` |


### `POST /api/fiscal/cadastros/importar/{tabela}`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_GERENCIAR` |
| Frontend | ❌ **não consome** |


### `GET /api/fiscal/cadastros/municipios`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `ufSigla?` `termo?` `codigoIbge?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/ncm`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `termo?` `codigo?` `vigenteEm?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/ncm-cest`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `ncmCodigo?` `cestCodigo?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/ncm/{codigo}/validacao`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `cestCodigo?` `dataOperacao?` |


### `GET /api/fiscal/cadastros/origens-mercadoria`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/paises`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigoBacen?` `ativo?` `pagina?` `tamanhoPagina?` |


### `GET /api/fiscal/cadastros/uf`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `ativo?` |


### `GET /api/fiscal/cadastros/unidades-tributaveis`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `sigla?` `ativo?` `pagina?` `tamanhoPagina?` |


## Caixas — 6/6 consumidos pelo frontend

### `GET /api/pdv/caixas`

| | |
|---|---|
| Permissão | `PDV_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `operadorId?` |


### `GET /api/pdv/caixas/{id}`

| | |
|---|---|
| Permissão | `PDV_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `CaixaResponse` |

**Response** (C#, `CaixaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid OperadorId
  string Terminal
  DateTimeOffset DataAbertura
  decimal ValorAbertura
  StatusCaixa StatusCaixa
  DateTimeOffset? DataFechamento
  decimal TotalSuprimentos
  decimal TotalSangrias
  decimal TotalRecebimentoDinheiro
  decimal TotalRecebimentoCartao
  decimal TotalRecebimentoPix
  decimal TotalRecebimentoOutro
  decimal TotalVendas
  decimal SaldoDinheiroEsperado
  decimal? ValorEsperadoDinheiro
  decimal? ValorInformadoFechamento
  decimal? DiferencaFechamento
  IReadOnlyList<MovimentoCaixaResponse> Movimentos
}
```


### `POST /api/pdv/caixas/{id}/fechar`

| | |
|---|---|
| Permissão | `PDV_CAIXA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CaixaResponse` |

**Request**
```ts
{
  valorInformado?: number
}
```

**Response** (C#, `CaixaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid OperadorId
  string Terminal
  DateTimeOffset DataAbertura
  decimal ValorAbertura
  StatusCaixa StatusCaixa
  DateTimeOffset? DataFechamento
  decimal TotalSuprimentos
  decimal TotalSangrias
  decimal TotalRecebimentoDinheiro
  decimal TotalRecebimentoCartao
  decimal TotalRecebimentoPix
  decimal TotalRecebimentoOutro
  decimal TotalVendas
  decimal SaldoDinheiroEsperado
  decimal? ValorEsperadoDinheiro
  decimal? ValorInformadoFechamento
  decimal? DiferencaFechamento
  IReadOnlyList<MovimentoCaixaResponse> Movimentos
}
```


### `POST /api/pdv/caixas/{id}/sangria`

| | |
|---|---|
| Permissão | `PDV_CAIXA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CaixaResponse` |

**Request**
```ts
{
  valor?: number
  descricao?: string | null
}
```

**Response** (C#, `CaixaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid OperadorId
  string Terminal
  DateTimeOffset DataAbertura
  decimal ValorAbertura
  StatusCaixa StatusCaixa
  DateTimeOffset? DataFechamento
  decimal TotalSuprimentos
  decimal TotalSangrias
  decimal TotalRecebimentoDinheiro
  decimal TotalRecebimentoCartao
  decimal TotalRecebimentoPix
  decimal TotalRecebimentoOutro
  decimal TotalVendas
  decimal SaldoDinheiroEsperado
  decimal? ValorEsperadoDinheiro
  decimal? ValorInformadoFechamento
  decimal? DiferencaFechamento
  IReadOnlyList<MovimentoCaixaResponse> Movimentos
}
```


### `POST /api/pdv/caixas/{id}/suprimento`

| | |
|---|---|
| Permissão | `PDV_CAIXA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CaixaResponse` |

**Request**
```ts
{
  valor?: number
  descricao?: string | null
}
```

**Response** (C#, `CaixaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid OperadorId
  string Terminal
  DateTimeOffset DataAbertura
  decimal ValorAbertura
  StatusCaixa StatusCaixa
  DateTimeOffset? DataFechamento
  decimal TotalSuprimentos
  decimal TotalSangrias
  decimal TotalRecebimentoDinheiro
  decimal TotalRecebimentoCartao
  decimal TotalRecebimentoPix
  decimal TotalRecebimentoOutro
  decimal TotalVendas
  decimal SaldoDinheiroEsperado
  decimal? ValorEsperadoDinheiro
  decimal? ValorInformadoFechamento
  decimal? DiferencaFechamento
  IReadOnlyList<MovimentoCaixaResponse> Movimentos
}
```


### `POST /api/pdv/caixas/abrir`

| | |
|---|---|
| Permissão | `PDV_CAIXA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CaixaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  terminal?: string | null
  valorAbertura?: number
}
```

**Response** (C#, `CaixaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid OperadorId
  string Terminal
  DateTimeOffset DataAbertura
  decimal ValorAbertura
  StatusCaixa StatusCaixa
  DateTimeOffset? DataFechamento
  decimal TotalSuprimentos
  decimal TotalSangrias
  decimal TotalRecebimentoDinheiro
  decimal TotalRecebimentoCartao
  decimal TotalRecebimentoPix
  decimal TotalRecebimentoOutro
  decimal TotalVendas
  decimal SaldoDinheiroEsperado
  decimal? ValorEsperadoDinheiro
  decimal? ValorInformadoFechamento
  decimal? DiferencaFechamento
  IReadOnlyList<MovimentoCaixaResponse> Movimentos
}
```


## Cargos — 4/4 consumidos pelo frontend

### `GET /api/administracao/cargos`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


### `POST /api/administracao/cargos`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CargoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  setorId?: uuid | null
  nome?: string | null
  descricao?: string | null
  nivelHierarquico?: integer
}
```

**Response** (C#, `CargoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? SetorId
  string Nome
  string? Descricao
  int NivelHierarquico
  EntityStatus Status
  DateTimeOffset CreatedAt
}
```


### `PUT /api/administracao/cargos/{id}`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CargoResponse` |

**Request**
```ts
{
  setorId?: uuid | null
  nome?: string | null
  descricao?: string | null
  nivelHierarquico?: integer
}
```

**Response** (C#, `CargoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? SetorId
  string Nome
  string? Descricao
  int NivelHierarquico
  EntityStatus Status
  DateTimeOffset CreatedAt
}
```


### `POST /api/administracao/cargos/{id}/inativar`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## CargosAcesso — 0/6 consumidos pelo frontend

### `GET /api/seguranca/cargos-acesso`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `escopo?` `ativo?` |


### `POST /api/seguranca/cargos-acesso`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  escopo?: Erp.Domain.Security.EscopoAcesso
  nome?: string | null
  descricao?: string | null
  nivelHierarquico?: integer
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `GET /api/seguranca/cargos-acesso/{id}`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `UsuarioResponse` |

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `PUT /api/seguranca/cargos-acesso/{id}`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `CargoAcessoResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
  nivelHierarquico?: integer
  motivo?: string | null
}
```

**Response** (C#, `CargoAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  string Nome
  string? Descricao
  int NivelHierarquico
  bool Ativo
  IReadOnlyCollection<Guid> GruposAcessoIds
}
```


### `POST /api/seguranca/cargos-acesso/{id}/grupos`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `CargoAcessoResponse` |

**Request**
```ts
{
  grupoAcessoId?: uuid
  motivo?: string | null
}
```

**Response** (C#, `CargoAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  string Nome
  string? Descricao
  int NivelHierarquico
  bool Ativo
  IReadOnlyCollection<Guid> GruposAcessoIds
}
```


### `POST /api/seguranca/cargos-acesso/{id}/grupos/{grupoAcessoId}/remover`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `CargoAcessoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `CargoAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  string Nome
  string? Descricao
  int NivelHierarquico
  bool Ativo
  IReadOnlyCollection<Guid> GruposAcessoIds
}
```


## CategoriasProduto — 4/4 consumidos pelo frontend

### `GET /api/produtos/categorias`

| | |
|---|---|
| Permissão | `PRODUTOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/produtos/categorias`

| | |
|---|---|
| Permissão | `CATEGORIAS_PRODUTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CategoriaProdutoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `CategoriaProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `PUT /api/produtos/categorias/{id}`

| | |
|---|---|
| Permissão | `CATEGORIAS_PRODUTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CategoriaProdutoResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `CategoriaProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `POST /api/produtos/categorias/{id}/inativar`

| | |
|---|---|
| Permissão | `CATEGORIAS_PRODUTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## CentrosCusto — 4/4 consumidos pelo frontend

### `GET /api/administracao/centros-custo`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


### `POST /api/administracao/centros-custo`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CentroCustoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `CentroCustoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  string? Descricao
  Guid? SetorId
  Guid? CargoId
  EntityStatus Status
  DateTimeOffset CreatedAt
}
```


### `PUT /api/administracao/centros-custo/{id}`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CentroCustoResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `CentroCustoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  string? Descricao
  Guid? SetorId
  Guid? CargoId
  EntityStatus Status
  DateTimeOffset CreatedAt
}
```


### `POST /api/administracao/centros-custo/{id}/inativar`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## ClassificacoesPessoa — 0/4 consumidos pelo frontend

### `GET /api/pessoas/classificacoes`

| | |
|---|---|
| Permissão | `PESSOAS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `termo?` |


### `POST /api/pessoas/classificacoes`

| | |
|---|---|
| Permissão | `CLASSIFICACOES_PESSOA_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ClassificacaoPessoaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  codigo?: string | null
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `ClassificacaoPessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  string Codigo
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `PUT /api/pessoas/classificacoes/{id}`

| | |
|---|---|
| Permissão | `CLASSIFICACOES_PESSOA_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ClassificacaoPessoaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `ClassificacaoPessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  string Codigo
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `POST /api/pessoas/classificacoes/{id}/inativar`

| | |
|---|---|
| Permissão | `CLASSIFICACOES_PESSOA_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  empresaId?: uuid
  motivo?: string | null
}
```


## Clientes — 6/7 consumidos pelo frontend

### `GET /api/clientes`

| | |
|---|---|
| Permissão | `CLIENTES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/clientes`

| | |
|---|---|
| Permissão | `CLIENTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ClienteResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  pessoaId?: uuid
  codigo?: string | null
  limiteCredito?: number
  observacao?: string | null
}
```

**Response** (C#, `ClienteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  decimal LimiteCredito
  bool CreditoBloqueado
  string? MotivoBloqueioCredito
  string? Observacao
  Guid? TabelaPrecoPadraoId
  Guid? CondicaoPagamentoPadraoId
  Guid? ClassificacaoId
  int? DiaVencimentoPreferencial
  bool PermiteVendaAPrazo
  EntityStatus Status
}
```


### `PUT /api/clientes/{id}`

| | |
|---|---|
| Permissão | `CLIENTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ClienteResponse` |

**Request**
```ts
{
  limiteCredito?: number
  observacao?: string | null
}
```

**Response** (C#, `ClienteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  decimal LimiteCredito
  bool CreditoBloqueado
  string? MotivoBloqueioCredito
  string? Observacao
  Guid? TabelaPrecoPadraoId
  Guid? CondicaoPagamentoPadraoId
  Guid? ClassificacaoId
  int? DiaVencimentoPreferencial
  bool PermiteVendaAPrazo
  EntityStatus Status
}
```


### `POST /api/clientes/{id}/bloquear-credito`

| | |
|---|---|
| Permissão | `CLIENTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ClienteResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `ClienteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  decimal LimiteCredito
  bool CreditoBloqueado
  string? MotivoBloqueioCredito
  string? Observacao
  Guid? TabelaPrecoPadraoId
  Guid? CondicaoPagamentoPadraoId
  Guid? ClassificacaoId
  int? DiaVencimentoPreferencial
  bool PermiteVendaAPrazo
  EntityStatus Status
}
```


### `PUT /api/clientes/{id}/configuracao-comercial`

| | |
|---|---|
| Permissão | `CLIENTES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ClienteResponse` |

**Request**
```ts
{
  tabelaPrecoPadraoId?: uuid | null
  condicaoPagamentoPadraoId?: uuid | null
  classificacaoId?: uuid | null
  diaVencimentoPreferencial?: integer | null
  permiteVendaAPrazo?: boolean
}
```

**Response** (C#, `ClienteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  decimal LimiteCredito
  bool CreditoBloqueado
  string? MotivoBloqueioCredito
  string? Observacao
  Guid? TabelaPrecoPadraoId
  Guid? CondicaoPagamentoPadraoId
  Guid? ClassificacaoId
  int? DiaVencimentoPreferencial
  bool PermiteVendaAPrazo
  EntityStatus Status
}
```


### `POST /api/clientes/{id}/desbloquear-credito`

| | |
|---|---|
| Permissão | `CLIENTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ClienteResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `ClienteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  decimal LimiteCredito
  bool CreditoBloqueado
  string? MotivoBloqueioCredito
  string? Observacao
  Guid? TabelaPrecoPadraoId
  Guid? CondicaoPagamentoPadraoId
  Guid? ClassificacaoId
  int? DiaVencimentoPreferencial
  bool PermiteVendaAPrazo
  EntityStatus Status
}
```


### `POST /api/clientes/{id}/inativar`

| | |
|---|---|
| Permissão | `CLIENTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## Cnab — 3/3 consumidos pelo frontend

### `POST /api/bancos/cnab/remessas`

| | |
|---|---|
| Permissão | `CNAB_REMESSA_GERAR` |
| Frontend | ✅ consome |
| Response DTO | `GerarRemessaCnabResponse` |

**Request**
```ts
{
  carteiraCobrancaId?: uuid
}
```

**Response** (C#, `GerarRemessaCnabResponse`)
```csharp
{
  Guid ArquivoRemessaCnabId
  int Sequencial
  int QuantidadeBoletos
  string NomeArquivo
  IReadOnlyCollection<string> Alertas
}
```


### `GET /api/bancos/cnab/retornos/{id}`

| | |
|---|---|
| Permissão | `BANCOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ArquivoRetornoResponse` |

**Response** (C#, `ArquivoRetornoResponse`)
```csharp
{
  Guid Id
  Guid ContaBancariaId
  string CaminhoRelativo
  int QuantidadeRegistros
  int QuantidadeProcessados
  int QuantidadeComErro
  DateTimeOffset ProcessadoEm
  IReadOnlyCollection<OcorrenciaRetornoResponse> Ocorrencias
}
```


### `POST /api/bancos/cnab/retornos/importar`

| | |
|---|---|
| Permissão | `CNAB_RETORNO_PROCESSAR` |
| Frontend | ✅ consome |
| Response DTO | `ImportarRetornoCnabResponse` |

**Request**
```ts
{
  ContaBancariaId?: uuid
  Arquivo?: binary
}
```

**Response** (C#, `ImportarRetornoCnabResponse`)
```csharp
{
  Guid ArquivoRetornoCnabId
  bool JaProcessadoAnteriormente
  int QuantidadeRegistros
  int QuantidadeProcessados
  int QuantidadeComErro
  IReadOnlyCollection<string> Alertas
}
```


## Colaboradores — 4/5 consumidos pelo frontend

### `GET /api/rh/colaboradores`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `setorId?` `cargoId?` `termo?` |


### `POST /api/rh/colaboradores`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ColaboradorResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  matricula?: string | null
  nome?: string | null
  cpf?: string | null
  cargoId?: uuid
  setorId?: uuid | null
  pessoaId?: uuid | null
  jornadaId?: uuid | null
  regime?: Erp.Domain.Rh.RegimeTrabalho
  salarioBase?: number
  dataAdmissao?: date-time
  dataNascimento?: date-time | null
  email?: string | null
  telefone?: string | null
}
```

**Response** (C#, `ColaboradorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Matricula
  string Nome
  string Cpf
  Guid CargoId
  Guid? SetorId
  Guid? PessoaId
  Guid? JornadaId
  RegimeTrabalho Regime
  decimal SalarioBase
  DateTimeOffset DataAdmissao
  DateTimeOffset? DataNascimento
  string? Email
  string? Telefone
  DateTimeOffset? DataDemissao
  string? MotivoDesligamento
  StatusColaborador StatusColaborador
}
```


### `GET /api/rh/colaboradores/{id}`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ColaboradorResponse` |

**Response** (C#, `ColaboradorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Matricula
  string Nome
  string Cpf
  Guid CargoId
  Guid? SetorId
  Guid? PessoaId
  Guid? JornadaId
  RegimeTrabalho Regime
  decimal SalarioBase
  DateTimeOffset DataAdmissao
  DateTimeOffset? DataNascimento
  string? Email
  string? Telefone
  DateTimeOffset? DataDemissao
  string? MotivoDesligamento
  StatusColaborador StatusColaborador
}
```


### `PUT /api/rh/colaboradores/{id}`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ColaboradorResponse` |

**Request**
```ts
{
  nome?: string | null
  cargoId?: uuid
  setorId?: uuid | null
  jornadaId?: uuid | null
  regime?: Erp.Domain.Rh.RegimeTrabalho
  salarioBase?: number
  email?: string | null
  telefone?: string | null
}
```

**Response** (C#, `ColaboradorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Matricula
  string Nome
  string Cpf
  Guid CargoId
  Guid? SetorId
  Guid? PessoaId
  Guid? JornadaId
  RegimeTrabalho Regime
  decimal SalarioBase
  DateTimeOffset DataAdmissao
  DateTimeOffset? DataNascimento
  string? Email
  string? Telefone
  DateTimeOffset? DataDemissao
  string? MotivoDesligamento
  StatusColaborador StatusColaborador
}
```


### `POST /api/rh/colaboradores/{id}/desligar`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ColaboradorResponse` |

**Request**
```ts
{
  dataDemissao?: date-time
  motivo?: string | null
}
```

**Response** (C#, `ColaboradorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Matricula
  string Nome
  string Cpf
  Guid CargoId
  Guid? SetorId
  Guid? PessoaId
  Guid? JornadaId
  RegimeTrabalho Regime
  decimal SalarioBase
  DateTimeOffset DataAdmissao
  DateTimeOffset? DataNascimento
  string? Email
  string? Telefone
  DateTimeOffset? DataDemissao
  string? MotivoDesligamento
  StatusColaborador StatusColaborador
}
```


## CondicoesPagamento — 4/4 consumidos pelo frontend

### `GET /api/financeiro/condicoes-pagamento`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyList<CondicaoPagamentoResponse>` |
| Query | `empresaId?` |

**Response** (C#, `IReadOnlyList<CondicaoPagamentoResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  int QuantidadeParcelas
  int IntervaloDias
  bool PermiteEntrada
  string Status
}
```


### `POST /api/financeiro/condicoes-pagamento`

| | |
|---|---|
| Permissão | `CONDICOES_PAGAMENTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CondicaoPagamentoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  quantidadeParcelas?: integer
  intervaloDias?: integer
  permiteEntrada?: boolean
}
```

**Response** (C#, `CondicaoPagamentoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  int QuantidadeParcelas
  int IntervaloDias
  bool PermiteEntrada
  string Status
}
```


### `PUT /api/financeiro/condicoes-pagamento/{id}`

| | |
|---|---|
| Permissão | `CONDICOES_PAGAMENTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CondicaoPagamentoResponse` |

**Request**
```ts
{
  nome?: string | null
  quantidadeParcelas?: integer
  intervaloDias?: integer
  permiteEntrada?: boolean
}
```

**Response** (C#, `CondicaoPagamentoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  int QuantidadeParcelas
  int IntervaloDias
  bool PermiteEntrada
  string Status
}
```


### `POST /api/financeiro/condicoes-pagamento/{id}/inativar`

| | |
|---|---|
| Permissão | `CONDICOES_PAGAMENTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## ContasPagar — 6/6 consumidos pelo frontend

### `GET /api/financeiro/contas-pagar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyList<ContaPagarResponse>` |
| Query | `empresaId?` `filialId?` `fornecedorId?` `status?` |

**Response** (C#, `IReadOnlyList<ContaPagarResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid FornecedorId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorPago
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaPagarResponse> Parcelas
  IReadOnlyList<PagamentoResponse> Pagamentos
}
```


### `POST /api/financeiro/contas-pagar`

| | |
|---|---|
| Permissão | `FINANCEIRO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaPagarResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  fornecedorId?: uuid
  documento?: string | null
  origem?: Erp.Domain.Financeiro.OrigemFinanceira
  origemId?: uuid | null
  dataEmissao?: date-time
  observacao?: string | null
  parcelas?: Erp.Application.Financeiro.ContasPagar.ParcelaPagarRequest[] | null
}
```

**Response** (C#, `ContaPagarResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid FornecedorId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorPago
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaPagarResponse> Parcelas
  IReadOnlyList<PagamentoResponse> Pagamentos
}
```


### `GET /api/financeiro/contas-pagar/{id}`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaPagarResponse` |

**Response** (C#, `ContaPagarResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid FornecedorId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorPago
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaPagarResponse> Parcelas
  IReadOnlyList<PagamentoResponse> Pagamentos
}
```


### `POST /api/financeiro/contas-pagar/{id}/cancelar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/financeiro/contas-pagar/{id}/estornar-pagamento`

| | |
|---|---|
| Permissão | `FINANCEIRO_ESTORNAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaPagarResponse` |

**Request**
```ts
{
  pagamentoId?: uuid
  motivo?: string | null
}
```

**Response** (C#, `ContaPagarResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid FornecedorId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorPago
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaPagarResponse> Parcelas
  IReadOnlyList<PagamentoResponse> Pagamentos
}
```


### `POST /api/financeiro/contas-pagar/{id}/pagar`

| | |
|---|---|
| Permissão | `FINANCEIRO_PAGAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaPagarResponse` |

**Request**
```ts
{
  parcelaId?: uuid
  formaPagamentoId?: uuid
  dataPagamento?: date-time
  valorPago?: number
  valorJuros?: number
  valorMulta?: number
  valorDesconto?: number
  gerarMovimentoCaixa?: boolean
  gerarMovimentoBancario?: boolean
  contaBancariaReferencia?: string | null
  observacao?: string | null
}
```

**Response** (C#, `ContaPagarResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid FornecedorId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorPago
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaPagarResponse> Parcelas
  IReadOnlyList<PagamentoResponse> Pagamentos
}
```


## ContasReceber — 7/7 consumidos pelo frontend

### `GET /api/financeiro/contas-receber`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyList<ContaReceberResponse>` |
| Query | `empresaId?` `filialId?` `clienteId?` `status?` |

**Response** (C#, `IReadOnlyList<ContaReceberResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


### `POST /api/financeiro/contas-receber`

| | |
|---|---|
| Permissão | `FINANCEIRO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaReceberResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  clienteId?: uuid
  documento?: string | null
  origem?: Erp.Domain.Financeiro.OrigemFinanceira
  origemId?: uuid | null
  dataEmissao?: date-time
  observacao?: string | null
  parcelas?: Erp.Application.Financeiro.ContasReceber.ParcelaFinanceiraRequest[] | null
}
```

**Response** (C#, `ContaReceberResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


### `GET /api/financeiro/contas-receber/{id}`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaReceberResponse` |

**Response** (C#, `ContaReceberResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


### `POST /api/financeiro/contas-receber/{id}/cancelar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/financeiro/contas-receber/{id}/estornar-recebimento`

| | |
|---|---|
| Permissão | `FINANCEIRO_ESTORNAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaReceberResponse` |

**Request**
```ts
{
  recebimentoId?: uuid
  motivo?: string | null
}
```

**Response** (C#, `ContaReceberResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


### `POST /api/financeiro/contas-receber/{id}/receber`

| | |
|---|---|
| Permissão | `FINANCEIRO_RECEBER` |
| Frontend | ✅ consome |
| Response DTO | `ContaReceberResponse` |

**Request**
```ts
{
  parcelaId?: uuid
  formaPagamentoId?: uuid
  dataRecebimento?: date-time
  valorRecebido?: number
  valorJuros?: number
  valorMulta?: number
  valorDesconto?: number
  gerarMovimentoCaixa?: boolean
  gerarMovimentoBancario?: boolean
  contaBancariaReferencia?: string | null
  observacao?: string | null
}
```

**Response** (C#, `ContaReceberResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


### `POST /api/financeiro/contas-receber/pedido-venda/{pedidoVendaId}`

| | |
|---|---|
| Permissão | `FINANCEIRO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaReceberResponse` |

**Request**
```ts
{
  condicaoPagamentoId?: uuid | null
  primeiraDataVencimento?: date-time
  documento?: string | null
  observacao?: string | null
}
```

**Response** (C#, `ContaReceberResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


## Contratos — 10/10 consumidos pelo frontend

### `GET /api/contratos`

| | |
|---|---|
| Permissão | `CONTRATOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `clienteId?` `status?` `tipo?` `termo?` |


### `POST /api/contratos`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  clienteId?: uuid
  descricao?: string | null
  tipoFaturamento?: Erp.Domain.Contratos.TipoFaturamentoContrato
  periodicidade?: Erp.Domain.Contratos.PeriodicidadeContrato
  dataInicio?: date-time
  dataFim?: date-time
  diaVencimento?: integer
  valorRecorrente?: number
  valorBaseConsumo?: number
  franquiaQuantidade?: number
  valorUnitarioExcedente?: number
  responsavelId?: uuid | null
  indiceReajuste?: string | null
}
```

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `GET /api/contratos/{id}`

| | |
|---|---|
| Permissão | `CONTRATOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `PUT /api/contratos/{id}`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Request**
```ts
{
  descricao?: string | null
  diaVencimento?: integer
  valorRecorrente?: number
  valorBaseConsumo?: number
  franquiaQuantidade?: number
  valorUnitarioExcedente?: number
  responsavelId?: uuid | null
  indiceReajuste?: string | null
}
```

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `POST /api/contratos/{id}/aprovar`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `POST /api/contratos/{id}/cancelar`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `POST /api/contratos/{id}/encerrar`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `POST /api/contratos/{id}/faturamentos`

| | |
|---|---|
| Permissão | `CONTRATOS_FATURAR` |
| Frontend | ✅ consome |
| Response DTO | `GerarFaturamentoContratoResponse` |

**Request**
```ts
{
  ano?: integer
  mes?: integer
  consumoRegistrado?: number | null
}
```

**Response** (C#, `GerarFaturamentoContratoResponse`)
```csharp
{
  Guid ContratoId
  FaturamentoContratoResponse Faturamento
  Guid? ContaReceberId
  bool DivergenciaNotificada
}
```


### `POST /api/contratos/{id}/reajustar`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Request**
```ts
{
  percentual?: number
}
```

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


### `POST /api/contratos/{id}/renovar`

| | |
|---|---|
| Permissão | `CONTRATOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContratoResponse` |

**Request**
```ts
{
  novaDataFim?: date-time
}
```

**Response** (C#, `ContratoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  TipoFaturamentoContrato TipoFaturamento
  PeriodicidadeContrato Periodicidade
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  int DiaVencimento
  decimal ValorRecorrente
  decimal ValorBaseConsumo
  decimal FranquiaQuantidade
  decimal ValorUnitarioExcedente
  Guid? ResponsavelId
  string? IndiceReajuste
  StatusContrato StatusContrato
  DateTimeOffset? AprovadoEm
  decimal? UltimoPercentualReajuste
  DateTimeOffset? ReajustadoEm
  DateTimeOffset? RenovadoEm
  DateTimeOffset? EncerradoEm
  DateTimeOffset? CanceladoEm
  IReadOnlyList<FaturamentoContratoResponse> Faturamentos
}
```


## CotacoesCompra — 7/7 consumidos pelo frontend

### `GET /api/compras/cotacoes`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `fornecedorId?` `status?` `termo?` |


### `POST /api/compras/cotacoes`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CotacaoCompraResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  fornecedorId?: uuid
  dataCotacao?: date-time
  validade?: date-time | null
  solicitacaoCompraId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `CotacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  Guid? SolicitacaoCompraId
  DateTimeOffset DataCotacao
  DateTimeOffset? Validade
  string? Observacao
  StatusCotacaoCompra StatusCotacao
  IReadOnlyList<CotacaoCompraItemResponse> Itens
}
```


### `GET /api/compras/cotacoes/{id}`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `CotacaoCompraResponse` |

**Response** (C#, `CotacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  Guid? SolicitacaoCompraId
  DateTimeOffset DataCotacao
  DateTimeOffset? Validade
  string? Observacao
  StatusCotacaoCompra StatusCotacao
  IReadOnlyList<CotacaoCompraItemResponse> Itens
}
```


### `POST /api/compras/cotacoes/{id}/aprovar`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_APROVAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoCompraResponse` |

**Request**
```ts
{
  numeroPedido?: string | null
  dataEmissaoPedido?: date-time
  dataPrevisaoEntrega?: date-time | null
  condicaoPagamentoId?: uuid | null
  observacao?: string | null
  itensLocalEstoque?: Erp.Application.Compras.Cotacoes.ItemPedidoOrigemCotacaoRequest[] | null
}
```

**Response** (C#, `PedidoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  Guid? CondicaoPagamentoId
  StatusPedidoCompra StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  IReadOnlyList<ItemPedidoCompraResponse> Itens
}
```


### `POST /api/compras/cotacoes/{id}/cancelar`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CotacaoCompraResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `CotacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  Guid? SolicitacaoCompraId
  DateTimeOffset DataCotacao
  DateTimeOffset? Validade
  string? Observacao
  StatusCotacaoCompra StatusCotacao
  IReadOnlyList<CotacaoCompraItemResponse> Itens
}
```


### `POST /api/compras/cotacoes/{id}/itens`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CotacaoCompraResponse` |

**Request**
```ts
{
  produtoId?: uuid
  quantidade?: number
  valorUnitario?: number
  observacao?: string | null
}
```

**Response** (C#, `CotacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  Guid? SolicitacaoCompraId
  DateTimeOffset DataCotacao
  DateTimeOffset? Validade
  string? Observacao
  StatusCotacaoCompra StatusCotacao
  IReadOnlyList<CotacaoCompraItemResponse> Itens
}
```


### `POST /api/compras/cotacoes/{id}/recusar`

| | |
|---|---|
| Permissão | `COMPRAS_COTACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CotacaoCompraResponse` |

**Response** (C#, `CotacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  Guid? SolicitacaoCompraId
  DateTimeOffset DataCotacao
  DateTimeOffset? Validade
  string? Observacao
  StatusCotacaoCompra StatusCotacao
  IReadOnlyList<CotacaoCompraItemResponse> Itens
}
```


## Deploy — 11/11 consumidos pelo frontend

### `GET /api/deploy`

| | |
|---|---|
| Permissão | `DEPLOY_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `ambiente?` `status?` |


### `POST /api/deploy`

| | |
|---|---|
| Permissão | `DEPLOY_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroDeployResponse` |

**Request**
```ts
{
  versao?: string | null
  ambiente?: string | null
  descricao?: string | null
  migracoesAplicadasInformadas?: integer | null
}
```

**Response** (C#, `RegistroDeployResponse`)
```csharp
{
  Guid Id
  string Versao
  string Ambiente
  string? Descricao
  int? MigracoesAplicadasInformadas
  Guid? UsuarioId
  DateTimeOffset DataInicio
  DateTimeOffset? DataConclusao
  StatusDeploy StatusDeploy
  string? Observacao
  DateTimeOffset? RevertidoEm
  string? MotivoRollback
  string? VersaoRollbackAlvo
}
```


### `GET /api/deploy/{id}`

| | |
|---|---|
| Permissão | `DEPLOY_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroDeployResponse` |

**Response** (C#, `RegistroDeployResponse`)
```csharp
{
  Guid Id
  string Versao
  string Ambiente
  string? Descricao
  int? MigracoesAplicadasInformadas
  Guid? UsuarioId
  DateTimeOffset DataInicio
  DateTimeOffset? DataConclusao
  StatusDeploy StatusDeploy
  string? Observacao
  DateTimeOffset? RevertidoEm
  string? MotivoRollback
  string? VersaoRollbackAlvo
}
```


### `GET /api/deploy/{id}/checklist`

| | |
|---|---|
| Permissão | `DEPLOY_CONSULTAR` |
| Frontend | ✅ consome |


### `POST /api/deploy/{id}/concluir`

| | |
|---|---|
| Permissão | `DEPLOY_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroDeployResponse` |

**Request**
```ts
{
  observacao?: string | null
}
```

**Response** (C#, `RegistroDeployResponse`)
```csharp
{
  Guid Id
  string Versao
  string Ambiente
  string? Descricao
  int? MigracoesAplicadasInformadas
  Guid? UsuarioId
  DateTimeOffset DataInicio
  DateTimeOffset? DataConclusao
  StatusDeploy StatusDeploy
  string? Observacao
  DateTimeOffset? RevertidoEm
  string? MotivoRollback
  string? VersaoRollbackAlvo
}
```


### `POST /api/deploy/{id}/falhar`

| | |
|---|---|
| Permissão | `DEPLOY_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroDeployResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `RegistroDeployResponse`)
```csharp
{
  Guid Id
  string Versao
  string Ambiente
  string? Descricao
  int? MigracoesAplicadasInformadas
  Guid? UsuarioId
  DateTimeOffset DataInicio
  DateTimeOffset? DataConclusao
  StatusDeploy StatusDeploy
  string? Observacao
  DateTimeOffset? RevertidoEm
  string? MotivoRollback
  string? VersaoRollbackAlvo
}
```


### `POST /api/deploy/{id}/reverter`

| | |
|---|---|
| Permissão | `DEPLOY_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroDeployResponse` |

**Request**
```ts
{
  motivo?: string | null
  versaoAlvo?: string | null
}
```

**Response** (C#, `RegistroDeployResponse`)
```csharp
{
  Guid Id
  string Versao
  string Ambiente
  string? Descricao
  int? MigracoesAplicadasInformadas
  Guid? UsuarioId
  DateTimeOffset DataInicio
  DateTimeOffset? DataConclusao
  StatusDeploy StatusDeploy
  string? Observacao
  DateTimeOffset? RevertidoEm
  string? MotivoRollback
  string? VersaoRollbackAlvo
}
```


### `GET /api/deploy/ambiente`

| | |
|---|---|
| Permissão | `DEPLOY_CONSULTAR` |
| Frontend | ✅ consome |


### `POST /api/deploy/checklist`

| | |
|---|---|
| Permissão | `DEPLOY_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  registroDeployId?: uuid
  descricao?: string | null
  obrigatorio?: boolean
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/deploy/checklist/{id}/resultado`

| | |
|---|---|
| Permissão | `DEPLOY_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ItemChecklistDeployResponse` |

**Request**
```ts
{
  status?: Erp.Domain.Deploy.StatusItemChecklist
  observacao?: string | null
}
```

**Response** (C#, `ItemChecklistDeployResponse`)
```csharp
{
  Guid Id
  Guid RegistroDeployId
  string Descricao
  bool Obrigatorio
  StatusItemChecklist StatusItem
  string? Observacao
  DateTimeOffset CriadoEm
  DateTimeOffset? VerificadoEm
  Guid? VerificadoPor
}
```


### `GET /api/deploy/migracoes`

| | |
|---|---|
| Permissão | `DEPLOY_CONSULTAR` |
| Frontend | ✅ consome |


## DepreciacaoPatrimonial — 1/1 consumidos pelo frontend

### `POST /api/patrimonio/depreciacao/processar`

| | |
|---|---|
| Permissão | `PATRIMONIO_DEPRECIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProcessarDepreciacaoPeriodoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  ano?: integer
  mes?: integer
}
```

**Response** (C#, `ProcessarDepreciacaoPeriodoResponse`)
```csharp
{
  int Competencia
  int TotalBensDepreciados
  decimal ValorTotalDepreciado
  int TotalContabilizados
  IReadOnlyList<BemDepreciadoResponse> Bens
}
```


## Empresas — 4/6 consumidos pelo frontend

### `GET /api/administracao/empresas`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_CONSULTAR` |
| Frontend | ✅ consome |


### `POST /api/administracao/empresas`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `EmpresaResponse` |

**Request**
```ts
{
  razaoSocial?: string | null
  nomeFantasia?: string | null
  documento?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  regimeTributario?: Erp.Domain.Administration.RegimeTributario
  crt?: Erp.Domain.Administration.Crt
  contribuinteIpi?: boolean
}
```

**Response** (C#, `EmpresaResponse`)
```csharp
{
  Guid Id
  string RazaoSocial
  string NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  RegimeTributario RegimeTributario
  Crt? Crt
  bool ContribuinteIpi
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `PUT /api/administracao/empresas/{id}`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `EmpresaResponse` |

**Request**
```ts
{
  razaoSocial?: string | null
  nomeFantasia?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  regimeTributario?: Erp.Domain.Administration.RegimeTributario
  crt?: Erp.Domain.Administration.Crt
  contribuinteIpi?: boolean | null
}
```

**Response** (C#, `EmpresaResponse`)
```csharp
{
  Guid Id
  string RazaoSocial
  string NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  RegimeTributario RegimeTributario
  Crt? Crt
  bool ContribuinteIpi
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `PUT /api/administracao/empresas/{id}/endereco-fiscal`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EmpresaResponse` |

**Request**
```ts
{
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  codigoMunicipioIbge?: string | null
}
```

**Response** (C#, `EmpresaResponse`)
```csharp
{
  Guid Id
  string RazaoSocial
  string NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  RegimeTributario RegimeTributario
  Crt? Crt
  bool ContribuinteIpi
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `DELETE /api/administracao/empresas/{id}/endereco-fiscal/municipio`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EmpresaResponse` |

**Response** (C#, `EmpresaResponse`)
```csharp
{
  Guid Id
  string RazaoSocial
  string NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  RegimeTributario RegimeTributario
  Crt? Crt
  bool ContribuinteIpi
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `POST /api/administracao/empresas/{id}/inativar`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## Estoque — 6/7 consumidos pelo frontend

### `POST /api/estoque/ajustes`

| | |
|---|---|
| Permissão | `ESTOQUE_MOVIMENTAR` |
| Frontend | ✅ consome |
| Response DTO | `MovimentoEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  produtoId?: uuid
  localEstoqueId?: uuid
  quantidadeContada?: number
  origemModulo?: string | null
  origemId?: uuid | null
  documento?: string | null
  motivo?: string | null
}
```

**Response** (C#, `MovimentoEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  Guid LocalEstoqueId
  TipoMovimentoEstoque Tipo
  decimal Quantidade
  decimal QuantidadeAnterior
  decimal QuantidadePosterior
  decimal QuantidadeReservadaAnterior
  decimal QuantidadeReservadaPosterior
  string OrigemModulo
  Guid? OrigemId
  string? Documento
  string Motivo
  DateTimeOffset DataMovimento
}
```


### `POST /api/estoque/entradas`

| | |
|---|---|
| Permissão | `ESTOQUE_MOVIMENTAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  produtoId?: uuid
  localEstoqueId?: uuid
  quantidade?: number
  origemModulo?: string | null
  origemId?: uuid | null
  documento?: string | null
  motivo?: string | null
}
```

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


### `GET /api/estoque/movimentos`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `produtoId?` `localEstoqueId?` `inicio?` `fim?` |


### `POST /api/estoque/saidas`

| | |
|---|---|
| Permissão | `ESTOQUE_MOVIMENTAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  produtoId?: uuid
  localEstoqueId?: uuid
  quantidade?: number
  origemModulo?: string | null
  origemId?: uuid | null
  documento?: string | null
  motivo?: string | null
}
```

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


### `GET /api/estoque/saldos`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `produtoId?` `localEstoqueId?` |


### `GET /api/estoque/saldos/produto/{produtoId}/local/{localEstoqueId}`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EstoqueSaldoResponse` |
| Query | `empresaId?` |

**Response** (C#, `EstoqueSaldoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  Guid LocalEstoqueId
  decimal QuantidadeAtual
  decimal QuantidadeReservada
  decimal QuantidadeDisponivel
}
```


### `POST /api/estoque/transferencias`

| | |
|---|---|
| Permissão | `ESTOQUE_MOVIMENTAR` |
| Frontend | ✅ consome |
| Response DTO | `TransferenciaEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialOrigemId?: uuid | null
  filialDestinoId?: uuid | null
  produtoId?: uuid
  localEstoqueOrigemId?: uuid
  localEstoqueDestinoId?: uuid
  quantidade?: number
  origemModulo?: string | null
  origemId?: uuid | null
  documento?: string | null
  motivo?: string | null
}
```

**Response** (C#, `TransferenciaEstoqueResponse`)
```csharp
{
  Guid EmpresaId
  Guid ProdutoId
  Guid LocalEstoqueOrigemId
  Guid LocalEstoqueDestinoId
  Guid? FilialOrigemId
  Guid? FilialDestinoId
  decimal Quantidade
  MovimentoEstoqueResponse MovimentoSaida
  MovimentoEstoqueResponse MovimentoEntrada
  EstoqueSaldoResponse SaldoOrigem
  EstoqueSaldoResponse SaldoDestino
}
```


## EstoqueAvancado — 11/11 consumidos pelo frontend

### `POST /api/estoque/avancado/ajustes`

| | |
|---|---|
| Permissão | `ESTOQUE_AJUSTAR` |
| Frontend | ✅ consome |
| Response DTO | `AjusteEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid
  localEstoqueId?: uuid
  produtoId?: uuid
  tipo?: Erp.Domain.Estoque.Avancado.TipoAjusteEstoque
  quantidade?: number
  motivo?: string | null
}
```

**Response** (C#, `AjusteEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  Guid ProdutoId
  TipoAjusteEstoque Tipo
  decimal Quantidade
  string Motivo
  string Origem
}
```


### `POST /api/estoque/avancado/bloqueios`

| | |
|---|---|
| Permissão | `ESTOQUE_BLOQUEIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BloqueioEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid
  localEstoqueId?: uuid
  produtoId?: uuid
  quantidade?: number
  motivo?: string | null
}
```

**Response** (C#, `BloqueioEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  Guid ProdutoId
  decimal Quantidade
  string Motivo
  StatusBloqueioEstoque Status
}
```


### `POST /api/estoque/avancado/bloqueios/{id}/cancelar`

| | |
|---|---|
| Permissão | `ESTOQUE_BLOQUEIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BloqueioEstoqueResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `BloqueioEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  Guid ProdutoId
  decimal Quantidade
  string Motivo
  StatusBloqueioEstoque Status
}
```


### `POST /api/estoque/avancado/bloqueios/{id}/liberar`

| | |
|---|---|
| Permissão | `ESTOQUE_BLOQUEIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `BloqueioEstoqueResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `BloqueioEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  Guid ProdutoId
  decimal Quantidade
  string Motivo
  StatusBloqueioEstoque Status
}
```


### `GET /api/estoque/avancado/inventarios`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `localEstoqueId?` `status?` `page?` `pageSize?` |


### `POST /api/estoque/avancado/inventarios`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid
  localEstoqueId?: uuid
  descricao?: string | null
  dataReferencia?: date
}
```

**Response** (C#, `InventarioEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  string Descricao
  DateOnly DataReferencia
  StatusInventarioEstoque Status
  IReadOnlyList<ItemInventarioEstoqueResponse> Itens
}
```


### `GET /api/estoque/avancado/inventarios/{id}`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioPatrimonialResponse` |

**Response** (C#, `InventarioPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  DateTimeOffset DataReferencia
  StatusInventarioPatrimonial StatusInventario
  DateTimeOffset? EncerradoEm
  int TotalDivergencias
  IReadOnlyList<ItemInventarioResponse> Itens
}
```


### `POST /api/estoque/avancado/inventarios/{id}/cancelar`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `InventarioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid LocalEstoqueId
  string Descricao
  StatusInventario StatusInventario
  DateTimeOffset AbertoEm
  DateTimeOffset? FechadoEm
  string? MotivoFechamento
  IReadOnlyCollection<ItemInventarioResponse> Itens
}
```


### `POST /api/estoque/avancado/inventarios/{id}/concluir`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioEstoqueResponse` |

**Request**
```ts
{
  motivoAjuste?: string | null
}
```

**Response** (C#, `InventarioEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  string Descricao
  DateOnly DataReferencia
  StatusInventarioEstoque Status
  IReadOnlyList<ItemInventarioEstoqueResponse> Itens
}
```


### `POST /api/estoque/avancado/inventarios/{id}/iniciar-contagem`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioEstoqueResponse` |

**Response** (C#, `InventarioEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid LocalEstoqueId
  string Descricao
  DateOnly DataReferencia
  StatusInventarioEstoque Status
  IReadOnlyList<ItemInventarioEstoqueResponse> Itens
}
```


### `POST /api/estoque/avancado/inventarios/{id}/itens`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioResponse` |

**Request**
```ts
{
  produtoId?: uuid
  quantidadeSistema?: number
  quantidadeContada?: number
  observacao?: string | null
}
```

**Response** (C#, `InventarioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid LocalEstoqueId
  string Descricao
  StatusInventario StatusInventario
  DateTimeOffset AbertoEm
  DateTimeOffset? FechadoEm
  string? MotivoFechamento
  IReadOnlyCollection<ItemInventarioResponse> Itens
}
```


## EventosRh — 2/2 consumidos pelo frontend

### `GET /api/rh/eventos`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `colaboradorId?` `competencia?` `tipo?` |


### `POST /api/rh/eventos`

| | |
|---|---|
| Permissão | `RH_EVENTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `EventoRhResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  colaboradorId?: uuid
  competencia?: integer
  tipo?: Erp.Domain.Rh.TipoEventoRh
  codigo?: string | null
  descricao?: string | null
  valor?: number
  referencia?: number | null
  origem?: Erp.Domain.Rh.OrigemEventoRh
}
```

**Response** (C#, `EventoRhResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  int Competencia
  TipoEventoRh Tipo
  string Codigo
  string Descricao
  decimal? Referencia
  decimal Valor
  OrigemEventoRh Origem
}
```


## ExcecoesFiscais — 5/5 consumidos pelo frontend

### `GET /api/fiscal/excecoes`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `uf?` `somenteAtivas?` `termo?` `pagina?` `tamanhoPagina?` |


### `POST /api/fiscal/excecoes`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  descricao?: string | null
  uf?: string | null
  codigoBeneficio?: string | null
  vigenciaInicio?: date
  vigenciaFim?: date | null
  icms?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoIcmsRequest
  pisCofins?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoPisCofinsRequest
}
```


### `GET /api/fiscal/excecoes/{id}`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |


### `PUT /api/fiscal/excecoes/{id}`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  descricao?: string | null
  uf?: string | null
  codigoBeneficio?: string | null
  vigenciaInicio?: date
  vigenciaFim?: date | null
  icms?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoIcmsRequest
  pisCofins?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoPisCofinsRequest
}
```


### `POST /api/fiscal/excecoes/{id}/inativar`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  motivo?: string | null
}
```


## ExcecoesFiscaisNcm — 5/5 consumidos pelo frontend

### `GET /api/fiscal/excecoes-ncm`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `ncmId?` `uf?` `somenteAtivas?` `termo?` `pagina?` `tamanhoPagina?` |


### `POST /api/fiscal/excecoes-ncm`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  descricao?: string | null
  ncmId?: uuid
  uf?: string | null
  codigoBeneficio?: string | null
  vigenciaInicio?: date
  vigenciaFim?: date | null
  icms?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoIcmsRequest
  pisCofins?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoPisCofinsRequest
}
```


### `GET /api/fiscal/excecoes-ncm/{id}`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |


### `PUT /api/fiscal/excecoes-ncm/{id}`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  descricao?: string | null
  ncmId?: uuid
  uf?: string | null
  codigoBeneficio?: string | null
  vigenciaInicio?: date
  vigenciaFim?: date | null
  icms?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoIcmsRequest
  pisCofins?: Erp.Application.Fiscal.Tributacao.Excecoes.ExcecaoPisCofinsRequest
}
```


### `POST /api/fiscal/excecoes-ncm/{id}/inativar`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  motivo?: string | null
}
```


## Faturamentos — 7/8 consumidos pelo frontend

### `GET /api/faturamento`

| | |
|---|---|
| Permissão | `FATURAMENTO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `PagedResult<FaturamentoResponse>` |
| Query | `EmpresaId?` `FilialId?` `PedidoVendaId?` `Etapa?` `Page?` `PageSize?` |

**Response** (C#, `PagedResult<FaturamentoResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PedidoVendaId
  Guid? NotaFiscalId
  Guid? ContaReceberId
  StatusFaturamento Etapa
  decimal ValorTotal
  DateTimeOffset? ConfirmadoEm
  Guid? ConfirmadoPor
  DateTimeOffset? CanceladoEm
  Guid? CanceladoPor
  string? MotivoCancelamento
  IReadOnlyCollection<FaturamentoLegResponse>? Legs = null
  bool PossuiLegComFalha = false
  bool PossuiLegRevertido = false
  bool EtapaDivergeDosLegs = false
  bool PossuiLegEmReversao = false
}
```


### `GET /api/faturamento/{id}`

| | |
|---|---|
| Permissão | `FATURAMENTO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `FaturamentoResponse` |

**Response** (C#, `FaturamentoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PedidoVendaId
  Guid? NotaFiscalId
  Guid? ContaReceberId
  StatusFaturamento Etapa
  decimal ValorTotal
  DateTimeOffset? ConfirmadoEm
  Guid? ConfirmadoPor
  DateTimeOffset? CanceladoEm
  Guid? CanceladoPor
  string? MotivoCancelamento
  IReadOnlyCollection<FaturamentoLegResponse>? Legs = null
  bool PossuiLegComFalha = false
  bool PossuiLegRevertido = false
  bool EtapaDivergeDosLegs = false
  bool PossuiLegEmReversao = false
}
```


### `POST /api/faturamento/{id}/cancelar`

| | |
|---|---|
| Permissão | `FATURAMENTO_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/faturamento/{id}/confirmar`

| | |
|---|---|
| Permissão | `FATURAMENTO_CONFIRMAR` |
| Frontend | ✅ consome |
| Response DTO | `ConfirmarFaturamentoResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  serie?: string | null
  numero?: string | null
  naturezaOperacaoId?: uuid | null
  cfopPadrao?: string | null
  unidadeComercialPadrao?: string | null
  validarDadosFiscaisProduto?: boolean
  certificateThumbprint?: string | null
  condicaoPagamentoId?: uuid | null
  primeiraDataVencimentoContaReceber?: date-time
  correlationId?: string | null
}
```

**Response** (C#, `ConfirmarFaturamentoResponse`)
```csharp
{
  FaturamentoResponse Faturamento
  IReadOnlyCollection<string> Alertas
}
```


### `GET /api/faturamento/{id}/historico`

| | |
|---|---|
| Permissão | `FATURAMENTO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<FaturamentoHistoricoResponse>` |

**Response** (C#, `IReadOnlyCollection<FaturamentoHistoricoResponse>`)
```csharp
{
  Guid Id
  StatusFaturamento StatusAnterior
  StatusFaturamento StatusNovo
  string Observacao
  Guid? UsuarioId
  DateTimeOffset Data
}
```


### `GET /api/faturamento/{id}/ocorrencias`

| | |
|---|---|
| Permissão | `FATURAMENTO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<FaturamentoOcorrenciaResponse>` |

**Response** (C#, `IReadOnlyCollection<FaturamentoOcorrenciaResponse>`)
```csharp
{
  Guid Id
  TipoOcorrenciaFaturamento Tipo
  string Mensagem
  DateTimeOffset Data
}
```


### `POST /api/faturamento/{id}/retomar-reversao`

| | |
|---|---|
| Permissão | `FATURAMENTO_RETOMAR_REVERSAO` |
| Frontend | ❌ **não consome** |
| Response DTO | `FaturamentoResponse` |

**Request**
```ts
{
  leg?: Erp.Domain.Faturamento.LegIntegracaoFaturamento
  acao?: Erp.Application.Faturamento.AcaoRetomadaReversaoLeg
  motivo?: string | null
}
```

**Response** (C#, `FaturamentoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PedidoVendaId
  Guid? NotaFiscalId
  Guid? ContaReceberId
  StatusFaturamento Etapa
  decimal ValorTotal
  DateTimeOffset? ConfirmadoEm
  Guid? ConfirmadoPor
  DateTimeOffset? CanceladoEm
  Guid? CanceladoPor
  string? MotivoCancelamento
  IReadOnlyCollection<FaturamentoLegResponse>? Legs = null
  bool PossuiLegComFalha = false
  bool PossuiLegRevertido = false
  bool EtapaDivergeDosLegs = false
  bool PossuiLegEmReversao = false
}
```


### `POST /api/faturamento/preparar`

| | |
|---|---|
| Permissão | `FATURAMENTO_PREPARAR` |
| Frontend | ✅ consome |
| Response DTO | `PrepararFaturamentoResponse` |

**Request**
```ts
{
  pedidoVendaId?: uuid
  observacao?: string | null
}
```

**Response** (C#, `PrepararFaturamentoResponse`)
```csharp
{
  FaturamentoResponse Faturamento
  bool JaExistia
  IReadOnlyCollection<string> Alertas
}
```


## FichasTecnicas — 6/6 consumidos pelo frontend

### `GET /api/producao/fichas-tecnicas`

| | |
|---|---|
| Permissão | `PRODUCAO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `produtoId?` `status?` `termo?` |


### `POST /api/producao/fichas-tecnicas`

| | |
|---|---|
| Permissão | `PRODUCAO_FICHA_TECNICA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FichaTecnicaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  produtoId?: uuid
  descricao?: string | null
  quantidadeBase?: number
  versao?: string | null
}
```

**Response** (C#, `FichaTecnicaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid ProdutoId
  string Descricao
  decimal QuantidadeBase
  string? Versao
  StatusFichaTecnica StatusFicha
  IReadOnlyList<FichaTecnicaComponenteResponse> Componentes
}
```


### `GET /api/producao/fichas-tecnicas/{id}`

| | |
|---|---|
| Permissão | `PRODUCAO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `FichaTecnicaResponse` |

**Response** (C#, `FichaTecnicaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid ProdutoId
  string Descricao
  decimal QuantidadeBase
  string? Versao
  StatusFichaTecnica StatusFicha
  IReadOnlyList<FichaTecnicaComponenteResponse> Componentes
}
```


### `POST /api/producao/fichas-tecnicas/{id}/ativar`

| | |
|---|---|
| Permissão | `PRODUCAO_FICHA_TECNICA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FichaTecnicaResponse` |

**Response** (C#, `FichaTecnicaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid ProdutoId
  string Descricao
  decimal QuantidadeBase
  string? Versao
  StatusFichaTecnica StatusFicha
  IReadOnlyList<FichaTecnicaComponenteResponse> Componentes
}
```


### `POST /api/producao/fichas-tecnicas/{id}/componentes`

| | |
|---|---|
| Permissão | `PRODUCAO_FICHA_TECNICA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FichaTecnicaResponse` |

**Request**
```ts
{
  produtoId?: uuid
  quantidade?: number
  perdaPercentual?: number
  observacao?: string | null
}
```

**Response** (C#, `FichaTecnicaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid ProdutoId
  string Descricao
  decimal QuantidadeBase
  string? Versao
  StatusFichaTecnica StatusFicha
  IReadOnlyList<FichaTecnicaComponenteResponse> Componentes
}
```


### `POST /api/producao/fichas-tecnicas/{id}/inativar`

| | |
|---|---|
| Permissão | `PRODUCAO_FICHA_TECNICA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FichaTecnicaResponse` |

**Response** (C#, `FichaTecnicaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid ProdutoId
  string Descricao
  decimal QuantidadeBase
  string? Versao
  StatusFichaTecnica StatusFicha
  IReadOnlyList<FichaTecnicaComponenteResponse> Componentes
}
```


## Filiais — 4/6 consumidos pelo frontend

### `GET /api/administracao/filiais`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` |


### `POST /api/administracao/filiais`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FilialResponse` |

**Request**
```ts
{
  empresaId?: uuid
  nome?: string | null
  documento?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
}
```

**Response** (C#, `FilialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  string Nome
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `PUT /api/administracao/filiais/{id}`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FilialResponse` |

**Request**
```ts
{
  nome?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
}
```

**Response** (C#, `FilialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  string Nome
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `PUT /api/administracao/filiais/{id}/endereco-fiscal`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `FilialResponse` |

**Request**
```ts
{
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  codigoMunicipioIbge?: string | null
}
```

**Response** (C#, `FilialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  string Nome
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `DELETE /api/administracao/filiais/{id}/endereco-fiscal/municipio`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `FilialResponse` |

**Response** (C#, `FilialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  string Nome
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  EntityStatus Status
  DateTimeOffset CreatedAt
  EnderecoFiscalResponse? EnderecoFiscal
}
```


### `POST /api/administracao/filiais/{id}/inativar`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## FinanceiroAvancado — 2/14 consumidos pelo frontend

### `GET /api/financeiro/avancado/contas-pagar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `participanteId?` `status?` `dataInicial?` `dataFinal?` `page?` `pageSize?` |


### `POST /api/financeiro/avancado/contas-pagar`

| | |
|---|---|
| Permissão | `FINANCEIRO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContaPagarResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  participanteId?: uuid
  descricao?: string | null
  documento?: string | null
  valorOriginal?: number
  dataEmissao?: date
  dataVencimento?: date
  origemModulo?: string | null
  origemId?: uuid | null
}
```

**Response** (C#, `ContaPagarResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid FornecedorId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorPago
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaPagarResponse> Parcelas
  IReadOnlyList<PagamentoResponse> Pagamentos
}
```


### `POST /api/financeiro/avancado/contas-pagar/{id}/baixar`

| | |
|---|---|
| Permissão | `FINANCEIRO_PAGAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContaFinanceiraResponse` |

**Request**
```ts
{
  valor?: number
  dataBaixa?: date
  observacao?: string | null
}
```

**Response** (C#, `ContaFinanceiraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoContaFinanceira Tipo
  Guid ParticipanteId
  string Descricao
  string? Documento
  decimal ValorOriginal
  decimal Saldo
  DateOnly DataEmissao
  DateOnly DataVencimento
  StatusContaFinanceira Status
  string? OrigemModulo
  Guid? OrigemId
  IReadOnlyList<BaixaFinanceiraResponse> Baixas
}
```


### `POST /api/financeiro/avancado/contas-pagar/{id}/cancelar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CANCELAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/financeiro/avancado/contas-pagar/{id}/estornar`

| | |
|---|---|
| Permissão | `FINANCEIRO_ESTORNAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  baixaId?: uuid
  dataEstorno?: date
  motivo?: string | null
}
```


### `GET /api/financeiro/avancado/contas-receber`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `participanteId?` `status?` `dataInicial?` `dataFinal?` `page?` `pageSize?` |


### `POST /api/financeiro/avancado/contas-receber`

| | |
|---|---|
| Permissão | `FINANCEIRO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContaReceberResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  participanteId?: uuid
  descricao?: string | null
  documento?: string | null
  valorOriginal?: number
  dataEmissao?: date
  dataVencimento?: date
  origemModulo?: string | null
  origemId?: uuid | null
}
```

**Response** (C#, `ContaReceberResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ClienteId
  string Documento
  OrigemFinanceira Origem
  Guid? OrigemId
  DateTimeOffset DataEmissao
  decimal ValorOriginal
  decimal ValorRecebido
  decimal ValorJuros
  decimal ValorMulta
  decimal ValorDesconto
  decimal ValorSaldo
  StatusContaFinanceira Status
  string? Observacao
  IReadOnlyList<ParcelaReceberResponse> Parcelas
  IReadOnlyList<RecebimentoResponse> Recebimentos
}
```


### `POST /api/financeiro/avancado/contas-receber/{id}/baixar`

| | |
|---|---|
| Permissão | `FINANCEIRO_RECEBER` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContaFinanceiraResponse` |

**Request**
```ts
{
  valor?: number
  dataBaixa?: date
  observacao?: string | null
}
```

**Response** (C#, `ContaFinanceiraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoContaFinanceira Tipo
  Guid ParticipanteId
  string Descricao
  string? Documento
  decimal ValorOriginal
  decimal Saldo
  DateOnly DataEmissao
  DateOnly DataVencimento
  StatusContaFinanceira Status
  string? OrigemModulo
  Guid? OrigemId
  IReadOnlyList<BaixaFinanceiraResponse> Baixas
}
```


### `POST /api/financeiro/avancado/contas-receber/{id}/cancelar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CANCELAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/financeiro/avancado/contas-receber/{id}/estornar`

| | |
|---|---|
| Permissão | `FINANCEIRO_ESTORNAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  baixaId?: uuid
  dataEstorno?: date
  motivo?: string | null
}
```


### `GET /api/financeiro/avancado/contas/{id}`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `POST /api/financeiro/avancado/contas/{id}/cancelar`

| | |
|---|---|
| Permissão | `FINANCEIRO_CANCELAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/financeiro/avancado/contas/{id}/estornar`

| | |
|---|---|
| Permissão | `FINANCEIRO_ESTORNAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContaFinanceiraResponse` |

**Request**
```ts
{
  baixaId?: uuid
  dataEstorno?: date
  motivo?: string | null
}
```

**Response** (C#, `ContaFinanceiraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoContaFinanceira Tipo
  Guid ParticipanteId
  string Descricao
  string? Documento
  decimal ValorOriginal
  decimal Saldo
  DateOnly DataEmissao
  DateOnly DataVencimento
  StatusContaFinanceira Status
  string? OrigemModulo
  Guid? OrigemId
  IReadOnlyList<BaixaFinanceiraResponse> Baixas
}
```


### `GET /api/financeiro/avancado/fluxo-caixa`

| | |
|---|---|
| Permissão | `FINANCEIRO_FLUXO_CAIXA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |


## FormasPagamento — 4/4 consumidos pelo frontend

### `GET /api/financeiro/formas-pagamento`

| | |
|---|---|
| Permissão | `FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyList<FormaPagamentoResponse>` |
| Query | `empresaId?` |

**Response** (C#, `IReadOnlyList<FormaPagamentoResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  bool PermiteRecebimento
  bool PermitePagamento
  string Status
}
```


### `POST /api/financeiro/formas-pagamento`

| | |
|---|---|
| Permissão | `FORMAS_PAGAMENTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FormaPagamentoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  permiteRecebimento?: boolean
  permitePagamento?: boolean
}
```

**Response** (C#, `FormaPagamentoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  bool PermiteRecebimento
  bool PermitePagamento
  string Status
}
```


### `PUT /api/financeiro/formas-pagamento/{id}`

| | |
|---|---|
| Permissão | `FORMAS_PAGAMENTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FormaPagamentoResponse` |

**Request**
```ts
{
  nome?: string | null
  permiteRecebimento?: boolean
  permitePagamento?: boolean
}
```

**Response** (C#, `FormaPagamentoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  bool PermiteRecebimento
  bool PermitePagamento
  string Status
}
```


### `POST /api/financeiro/formas-pagamento/{id}/inativar`

| | |
|---|---|
| Permissão | `FORMAS_PAGAMENTO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## Fornecedores — 4/8 consumidos pelo frontend

### `GET /api/fornecedores`

| | |
|---|---|
| Permissão | `FORNECEDORES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/fornecedores`

| | |
|---|---|
| Permissão | `FORNECEDORES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FornecedorResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  pessoaId?: uuid
  codigo?: string | null
  observacao?: string | null
}
```

**Response** (C#, `FornecedorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Observacao
  Guid? CondicaoPagamentoPadraoId
  int? PrazoEntregaMedio
  bool Homologado
  string? CategoriaFornecimento
  EntityStatus Status
}
```


### `PUT /api/fornecedores/{id}`

| | |
|---|---|
| Permissão | `FORNECEDORES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `FornecedorResponse` |

**Request**
```ts
{
  observacao?: string | null
}
```

**Response** (C#, `FornecedorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Observacao
  Guid? CondicaoPagamentoPadraoId
  int? PrazoEntregaMedio
  bool Homologado
  string? CategoriaFornecimento
  EntityStatus Status
}
```


### `PUT /api/fornecedores/{id}/configuracao-compra`

| | |
|---|---|
| Permissão | `FORNECEDORES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `FornecedorResponse` |

**Request**
```ts
{
  condicaoPagamentoPadraoId?: uuid | null
  prazoEntregaMedio?: integer | null
  categoriaFornecimento?: string | null
}
```

**Response** (C#, `FornecedorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Observacao
  Guid? CondicaoPagamentoPadraoId
  int? PrazoEntregaMedio
  bool Homologado
  string? CategoriaFornecimento
  EntityStatus Status
}
```


### `POST /api/fornecedores/{id}/homologar`

| | |
|---|---|
| Permissão | `FORNECEDORES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `FornecedorResponse` |

**Response** (C#, `FornecedorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Observacao
  Guid? CondicaoPagamentoPadraoId
  int? PrazoEntregaMedio
  bool Homologado
  string? CategoriaFornecimento
  EntityStatus Status
}
```


### `POST /api/fornecedores/{id}/inativar`

| | |
|---|---|
| Permissão | `FORNECEDORES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/fornecedores/{id}/revogar-homologacao`

| | |
|---|---|
| Permissão | `FORNECEDORES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `FornecedorResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `FornecedorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Observacao
  Guid? CondicaoPagamentoPadraoId
  int? PrazoEntregaMedio
  bool Homologado
  string? CategoriaFornecimento
  EntityStatus Status
}
```


### `GET /api/fornecedores/{id}/situacao-compra`

| | |
|---|---|
| Permissão | `FORNECEDORES_CONSULTAR` |
| Frontend | ❌ **não consome** |


## GruposAcesso — 5/7 consumidos pelo frontend

### `GET /api/seguranca/grupos-acesso`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


### `POST /api/seguranca/grupos-acesso`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `GrupoAcessoResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
  empresaId?: uuid
  filialId?: uuid | null
  permissoesIds?: uuid[] | null
  permissoes?: string[] | null
}
```

**Response** (C#, `GrupoAcessoResponse`)
```csharp
{
  Guid Id
  string Nome
  string? Descricao
  Guid EmpresaId
  Guid? FilialId
  bool Sistema
  string Status
  IReadOnlyCollection<string> Permissoes
  IReadOnlyCollection<GrupoAcessoPermissaoResponse> PermissoesDetalhadas
}
```


### `GET /api/seguranca/grupos-acesso/{id}`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `GrupoAcessoResponse` |

**Response** (C#, `GrupoAcessoResponse`)
```csharp
{
  Guid Id
  string Nome
  string? Descricao
  Guid EmpresaId
  Guid? FilialId
  bool Sistema
  string Status
  IReadOnlyCollection<string> Permissoes
  IReadOnlyCollection<GrupoAcessoPermissaoResponse> PermissoesDetalhadas
}
```


### `PUT /api/seguranca/grupos-acesso/{id}`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `GrupoAcessoResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
  permissoes?: string[] | null
}
```

**Response** (C#, `GrupoAcessoResponse`)
```csharp
{
  Guid Id
  string Nome
  string? Descricao
  Guid EmpresaId
  Guid? FilialId
  bool Sistema
  string Status
  IReadOnlyCollection<string> Permissoes
  IReadOnlyCollection<GrupoAcessoPermissaoResponse> PermissoesDetalhadas
}
```


### `POST /api/seguranca/grupos-acesso/{id}/inativar`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/seguranca/grupos-acesso/{id}/permissoes`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `GrupoAcessoResponse` |

**Request**
```ts
{
  permissaoId?: uuid | null
  codigoPermissao?: string | null
}
```

**Response** (C#, `GrupoAcessoResponse`)
```csharp
{
  Guid Id
  string Nome
  string? Descricao
  Guid EmpresaId
  Guid? FilialId
  bool Sistema
  string Status
  IReadOnlyCollection<string> Permissoes
  IReadOnlyCollection<GrupoAcessoPermissaoResponse> PermissoesDetalhadas
}
```


### `POST /api/seguranca/grupos-acesso/{id}/permissoes/{permissaoId}/remover`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `GrupoAcessoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `GrupoAcessoResponse`)
```csharp
{
  Guid Id
  string Nome
  string? Descricao
  Guid EmpresaId
  Guid? FilialId
  bool Sistema
  string Status
  IReadOnlyCollection<string> Permissoes
  IReadOnlyCollection<GrupoAcessoPermissaoResponse> PermissoesDetalhadas
}
```


## GruposAcessoMatriz — 0/2 consumidos pelo frontend

### `GET /api/seguranca/grupos-acesso/{id}/matriz-permissoes`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `GrupoAcessoMatrizResponse` |

**Response** (C#, `GrupoAcessoMatrizResponse`)
```csharp
{
  Guid GrupoAcessoId
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  IReadOnlyCollection<MatrizPermissaoModuloResponse> MatrizPermissoes
}
```


### `PUT /api/seguranca/grupos-acesso/{id}/matriz-permissoes`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `GrupoAcessoMatrizResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  escopo?: Erp.Domain.Security.EscopoAcesso
  motivo?: string | null
  matrizPermissoes?: Erp.Application.Security.GruposAcesso.Estruturado.MatrizPermissaoModuloRequest[] | null
}
```

**Response** (C#, `GrupoAcessoMatrizResponse`)
```csharp
{
  Guid GrupoAcessoId
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  IReadOnlyCollection<MatrizPermissaoModuloResponse> MatrizPermissoes
}
```


## Health — 1/3 consumidos pelo frontend

### `GET /api/health`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ✅ consome |


### `GET /api/health/database`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ❌ **não consome** |


### `GET /api/health/redis`

| | |
|---|---|
| Permissão | `(sem RequiredPermission)` |
| Frontend | ❌ **não consome** |


## InfraestruturaProducao — 0/3 consumidos pelo frontend

### `GET /api/infraestrutura/backups/status`

| | |
|---|---|
| Permissão | `INFRAESTRUTURA_BACKUP_CONSULTAR` |
| Frontend | ❌ **não consome** |


### `GET /api/infraestrutura/health`

| | |
|---|---|
| Permissão | `INFRAESTRUTURA_CONSULTAR` |
| Frontend | ❌ **não consome** |


### `GET /api/infraestrutura/health/dependencies`

| | |
|---|---|
| Permissão | `INFRAESTRUTURA_CONSULTAR` |
| Frontend | ❌ **não consome** |


## Inspecoes — 8/8 consumidos pelo frontend

### `GET /api/qualidade/inspecoes`

| | |
|---|---|
| Permissão | `QUALIDADE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `origem?` `status?` `produtoId?` `termo?` |


### `POST /api/qualidade/inspecoes`

| | |
|---|---|
| Permissão | `QUALIDADE_INSPECIONAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  origem?: Erp.Domain.Qualidade.OrigemInspecao
  origemId?: uuid | null
  produtoId?: uuid
  quantidade?: number
  localEstoqueId?: uuid | null
  responsavelId?: uuid | null
  dataInspecao?: date-time | null
  observacao?: string | null
  criterios?: Erp.Application.Qualidade.Inspecoes.CriterioInspecaoItemRequest[] | null
}
```

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


### `GET /api/qualidade/inspecoes/{id}`

| | |
|---|---|
| Permissão | `QUALIDADE_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


### `POST /api/qualidade/inspecoes/{id}/aprovar`

| | |
|---|---|
| Permissão | `QUALIDADE_INSPECIONAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


### `POST /api/qualidade/inspecoes/{id}/criterios`

| | |
|---|---|
| Permissão | `QUALIDADE_INSPECIONAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Request**
```ts
{
  descricao?: string | null
  critico?: boolean
  valorEsperado?: string | null
}
```

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


### `POST /api/qualidade/inspecoes/{id}/encerrar`

| | |
|---|---|
| Permissão | `QUALIDADE_INSPECIONAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Request**
```ts
{
  evidencia?: string | null
}
```

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


### `POST /api/qualidade/inspecoes/{id}/reprovar`

| | |
|---|---|
| Permissão | `QUALIDADE_INSPECIONAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Request**
```ts
{
  descricao?: string | null
}
```

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


### `POST /api/qualidade/inspecoes/{id}/resultados`

| | |
|---|---|
| Permissão | `QUALIDADE_INSPECIONAR` |
| Frontend | ✅ consome |
| Response DTO | `InspecaoResponse` |

**Request**
```ts
{
  criterioId?: uuid
  conforme?: boolean
  valorMedido?: string | null
  observacao?: string | null
}
```

**Response** (C#, `InspecaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  OrigemInspecao Origem
  Guid? OrigemId
  Guid ProdutoId
  decimal Quantidade
  Guid? LocalEstoqueId
  Guid? ResponsavelId
  DateTimeOffset DataInspecao
  string? Observacao
  StatusInspecao StatusInspecao
  Guid? BloqueioEstoqueId
  string? Evidencia
  DateTimeOffset? EncerradaEm
  IReadOnlyList<CriterioInspecaoResponse> Criterios
}
```


## Integracoes — 0/10 consumidos pelo frontend

### `GET /api/integracoes/eventos`

| | |
|---|---|
| Permissão | `INTEGRACOES_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `integracaoExternaId?` `situacao?` `direcao?` `tipoEvento?` `correlationId?` `page?` `pageSize?` |


### `POST /api/integracoes/eventos`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EventoIntegracaoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  integracaoExternaId?: uuid | null
  tipoEvento?: string | null
  direcao?: Erp.Domain.Integracoes.DirecaoEventoIntegracao
  payloadEntradaSanitizado?: string | null
  entidadeOrigem?: string | null
  entidadeOrigemId?: uuid | null
  correlationId?: string | null
  maxTentativas?: integer
}
```

**Response** (C#, `EventoIntegracaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? IntegracaoExternaId
  string TipoEvento
  DirecaoEventoIntegracao Direcao
  SituacaoEventoIntegracao Situacao
  string? PayloadEntradaSanitizado
  string? PayloadSaidaSanitizado
  string? ErroSanitizado
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  string CorrelationId
  int Tentativas
  int MaxTentativas
  DateTimeOffset CriadoEmEvento
  DateTimeOffset? ProcessadoEm
  DateTimeOffset? ProximoProcessamentoEm
}
```


### `POST /api/integracoes/eventos/{id}/falha`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EventoIntegracaoResponse` |

**Request**
```ts
{
  erroSanitizado?: string | null
  delayMinutos?: integer
}
```

**Response** (C#, `EventoIntegracaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? IntegracaoExternaId
  string TipoEvento
  DirecaoEventoIntegracao Direcao
  SituacaoEventoIntegracao Situacao
  string? PayloadEntradaSanitizado
  string? PayloadSaidaSanitizado
  string? ErroSanitizado
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  string CorrelationId
  int Tentativas
  int MaxTentativas
  DateTimeOffset CriadoEmEvento
  DateTimeOffset? ProcessadoEm
  DateTimeOffset? ProximoProcessamentoEm
}
```


### `POST /api/integracoes/eventos/{id}/reprocessar`

| | |
|---|---|
| Permissão | `INTEGRACOES_REPROCESSAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EventoIntegracaoResponse` |

**Request**
```ts
{
  motivo?: string | null
  delayMinutos?: integer
}
```

**Response** (C#, `EventoIntegracaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? IntegracaoExternaId
  string TipoEvento
  DirecaoEventoIntegracao Direcao
  SituacaoEventoIntegracao Situacao
  string? PayloadEntradaSanitizado
  string? PayloadSaidaSanitizado
  string? ErroSanitizado
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  string CorrelationId
  int Tentativas
  int MaxTentativas
  DateTimeOffset CriadoEmEvento
  DateTimeOffset? ProcessadoEm
  DateTimeOffset? ProximoProcessamentoEm
}
```


### `POST /api/integracoes/eventos/{id}/sucesso`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EventoIntegracaoResponse` |

**Request**
```ts
{
  payloadSaidaSanitizado?: string | null
}
```

**Response** (C#, `EventoIntegracaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? IntegracaoExternaId
  string TipoEvento
  DirecaoEventoIntegracao Direcao
  SituacaoEventoIntegracao Situacao
  string? PayloadEntradaSanitizado
  string? PayloadSaidaSanitizado
  string? ErroSanitizado
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  string CorrelationId
  int Tentativas
  int MaxTentativas
  DateTimeOffset CriadoEmEvento
  DateTimeOffset? ProcessadoEm
  DateTimeOffset? ProximoProcessamentoEm
}
```


### `GET /api/integracoes/externas`

| | |
|---|---|
| Permissão | `INTEGRACOES_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `incluirInativas?` |


### `POST /api/integracoes/externas`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IntegracaoExternaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  tipo?: Erp.Domain.Integracoes.TipoIntegracaoExterna
  descricao?: string | null
}
```

**Response** (C#, `IntegracaoExternaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoIntegracaoExterna Tipo
  string? Descricao
  bool Ativa
}
```


### `PUT /api/integracoes/externas/{id}`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IntegracaoExternaResponse` |

**Request**
```ts
{
  nome?: string | null
  tipo?: Erp.Domain.Integracoes.TipoIntegracaoExterna
  descricao?: string | null
  motivo?: string | null
}
```

**Response** (C#, `IntegracaoExternaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoIntegracaoExterna Tipo
  string? Descricao
  bool Ativa
}
```


### `POST /api/integracoes/externas/{id}/inativar`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IntegracaoExternaResponse` |
| Query | `motivo?` |

**Response** (C#, `IntegracaoExternaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoIntegracaoExterna Tipo
  string? Descricao
  bool Ativa
}
```


### `POST /api/integracoes/externas/{id}/reativar`

| | |
|---|---|
| Permissão | `INTEGRACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IntegracaoExternaResponse` |
| Query | `motivo?` |

**Response** (C#, `IntegracaoExternaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoIntegracaoExterna Tipo
  string? Descricao
  bool Ativa
}
```


## InutilizacoesFiscais — 1/1 consumidos pelo frontend

### `POST /api/fiscal/inutilizacoes`

| | |
|---|---|
| Permissão | `FISCAL_INUTILIZAR` |
| Frontend | ✅ consome |
| Response DTO | `InutilizacaoNumeracaoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  serie?: string | null
  numeroInicial?: integer
  numeroFinal?: integer
  motivo?: string | null
  ufAutorizadora?: string | null
  xmlInutilizacaoAssinado?: string | null
  validarSchemaAntesTransmissao?: boolean
  schemaSetName?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `InutilizacaoNumeracaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  string Serie
  int NumeroInicial
  int NumeroFinal
  string Motivo
  string? Protocolo
  DateTimeOffset InutilizadaEm
  Guid InutilizadaPor
  bool ComunicacaoOk
  bool AutorizadaPeloAmbiente
  string? CodigoStatus
  string? RetornoMotivo
  bool DeveReprocessar
}
```


## InventariosEstoque — 5/5 consumidos pelo frontend

### `GET /api/estoque/inventarios`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `localEstoqueId?` |


### `POST /api/estoque/inventarios`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioPatrimonialResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  localEstoqueId?: uuid
  descricao?: string | null
}
```

**Response** (C#, `InventarioPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  DateTimeOffset DataReferencia
  StatusInventarioPatrimonial StatusInventario
  DateTimeOffset? EncerradoEm
  int TotalDivergencias
  IReadOnlyList<ItemInventarioResponse> Itens
}
```


### `POST /api/estoque/inventarios/{id}/cancelar`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `InventarioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid LocalEstoqueId
  string Descricao
  StatusInventario StatusInventario
  DateTimeOffset AbertoEm
  DateTimeOffset? FechadoEm
  string? MotivoFechamento
  IReadOnlyCollection<ItemInventarioResponse> Itens
}
```


### `POST /api/estoque/inventarios/{id}/fechar`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `InventarioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid LocalEstoqueId
  string Descricao
  StatusInventario StatusInventario
  DateTimeOffset AbertoEm
  DateTimeOffset? FechadoEm
  string? MotivoFechamento
  IReadOnlyCollection<ItemInventarioResponse> Itens
}
```


### `POST /api/estoque/inventarios/{id}/itens`

| | |
|---|---|
| Permissão | `ESTOQUE_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioResponse` |

**Request**
```ts
{
  produtoId?: uuid
  quantidadeContada?: number
  observacao?: string | null
}
```

**Response** (C#, `InventarioResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  Guid LocalEstoqueId
  string Descricao
  StatusInventario StatusInventario
  DateTimeOffset AbertoEm
  DateTimeOffset? FechadoEm
  string? MotivoFechamento
  IReadOnlyCollection<ItemInventarioResponse> Itens
}
```


## InventariosPatrimoniais — 5/5 consumidos pelo frontend

### `GET /api/patrimonio/inventarios`

| | |
|---|---|
| Permissão | `PATRIMONIO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` |


### `POST /api/patrimonio/inventarios`

| | |
|---|---|
| Permissão | `PATRIMONIO_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioPatrimonialResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  descricao?: string | null
  dataReferencia?: date-time | null
  bemIds?: uuid[] | null
}
```

**Response** (C#, `InventarioPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  DateTimeOffset DataReferencia
  StatusInventarioPatrimonial StatusInventario
  DateTimeOffset? EncerradoEm
  int TotalDivergencias
  IReadOnlyList<ItemInventarioResponse> Itens
}
```


### `GET /api/patrimonio/inventarios/{id}`

| | |
|---|---|
| Permissão | `PATRIMONIO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioPatrimonialResponse` |

**Response** (C#, `InventarioPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  DateTimeOffset DataReferencia
  StatusInventarioPatrimonial StatusInventario
  DateTimeOffset? EncerradoEm
  int TotalDivergencias
  IReadOnlyList<ItemInventarioResponse> Itens
}
```


### `POST /api/patrimonio/inventarios/{id}/contagem`

| | |
|---|---|
| Permissão | `PATRIMONIO_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioPatrimonialResponse` |

**Request**
```ts
{
  itemId?: uuid
  localizado?: boolean
  setorEncontradoId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `InventarioPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  DateTimeOffset DataReferencia
  StatusInventarioPatrimonial StatusInventario
  DateTimeOffset? EncerradoEm
  int TotalDivergencias
  IReadOnlyList<ItemInventarioResponse> Itens
}
```


### `POST /api/patrimonio/inventarios/{id}/encerrar`

| | |
|---|---|
| Permissão | `PATRIMONIO_INVENTARIO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `InventarioPatrimonialResponse` |

**Response** (C#, `InventarioPatrimonialResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  DateTimeOffset DataReferencia
  StatusInventarioPatrimonial StatusInventario
  DateTimeOffset? EncerradoEm
  int TotalDivergencias
  IReadOnlyList<ItemInventarioResponse> Itens
}
```


## Jornadas — 3/3 consumidos pelo frontend

### `GET /api/rh/jornadas`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


### `POST /api/rh/jornadas`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `JornadaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  cargaHorariaSemanal?: number
  horaEntrada?: string | null
  horaSaida?: string | null
  descricao?: string | null
}
```

**Response** (C#, `JornadaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  decimal CargaHorariaSemanal
  string? HoraEntrada
  string? HoraSaida
  string? Descricao
}
```


### `PUT /api/rh/jornadas/{id}`

| | |
|---|---|
| Permissão | `RH_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `JornadaResponse` |

**Request**
```ts
{
  nome?: string | null
  cargaHorariaSemanal?: number
  horaEntrada?: string | null
  horaSaida?: string | null
  descricao?: string | null
}
```

**Response** (C#, `JornadaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  decimal CargaHorariaSemanal
  string? HoraEntrada
  string? HoraSaida
  string? Descricao
}
```


## LancamentosContabeis — 4/4 consumidos pelo frontend

### `GET /api/contabil/lancamentos`

| | |
|---|---|
| Permissão | `CONTABIL_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `inicio?` `fim?` `status?` |


### `POST /api/contabil/lancamentos`

| | |
|---|---|
| Permissão | `CONTABIL_LANCAMENTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LancamentoContabilResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  data?: date-time
  historico?: string | null
  partidas?: Erp.Application.Contabil.Lancamentos.PartidaContabilRequest[] | null
}
```

**Response** (C#, `LancamentoContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset Data
  string Historico
  OrigemLancamentoContabil Origem
  Guid? OrigemId
  StatusLancamentoContabil StatusLancamento
  Guid? LancamentoEstornoId
  decimal TotalDebito
  decimal TotalCredito
  IReadOnlyList<PartidaContabilResponse> Partidas
}
```


### `GET /api/contabil/lancamentos/{id}`

| | |
|---|---|
| Permissão | `CONTABIL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `LancamentoContabilResponse` |

**Response** (C#, `LancamentoContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset Data
  string Historico
  OrigemLancamentoContabil Origem
  Guid? OrigemId
  StatusLancamentoContabil StatusLancamento
  Guid? LancamentoEstornoId
  decimal TotalDebito
  decimal TotalCredito
  IReadOnlyList<PartidaContabilResponse> Partidas
}
```


### `POST /api/contabil/lancamentos/{id}/estornar`

| | |
|---|---|
| Permissão | `CONTABIL_LANCAMENTOS_ESTORNAR` |
| Frontend | ✅ consome |
| Response DTO | `LancamentoContabilResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `LancamentoContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset Data
  string Historico
  OrigemLancamentoContabil Origem
  Guid? OrigemId
  StatusLancamentoContabil StatusLancamento
  Guid? LancamentoEstornoId
  decimal TotalDebito
  decimal TotalCredito
  IReadOnlyList<PartidaContabilResponse> Partidas
}
```


## Leads — 4/6 consumidos pelo frontend

### `GET /api/crm/leads`

| | |
|---|---|
| Permissão | `CRM_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `termo?` |


### `POST /api/crm/leads`

| | |
|---|---|
| Permissão | `CRM_LEADS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LeadResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  empresa?: string | null
  email?: string | null
  telefone?: string | null
  origem?: Erp.Domain.Crm.OrigemLead
  responsavelId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `LeadResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Empresa
  string? Email
  string? Telefone
  OrigemLead Origem
  Guid? ResponsavelId
  string? Observacao
  StatusLead StatusLead
  Guid? ClienteId
  Guid? OportunidadeId
  DateTimeOffset? QualificadoEm
  string? MotivoDescarte
}
```


### `GET /api/crm/leads/{id}`

| | |
|---|---|
| Permissão | `CRM_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `LeadResponse` |

**Response** (C#, `LeadResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Empresa
  string? Email
  string? Telefone
  OrigemLead Origem
  Guid? ResponsavelId
  string? Observacao
  StatusLead StatusLead
  Guid? ClienteId
  Guid? OportunidadeId
  DateTimeOffset? QualificadoEm
  string? MotivoDescarte
}
```


### `PUT /api/crm/leads/{id}`

| | |
|---|---|
| Permissão | `CRM_LEADS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `LeadResponse` |

**Request**
```ts
{
  nome?: string | null
  empresa?: string | null
  email?: string | null
  telefone?: string | null
  origem?: Erp.Domain.Crm.OrigemLead
  responsavelId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `LeadResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Empresa
  string? Email
  string? Telefone
  OrigemLead Origem
  Guid? ResponsavelId
  string? Observacao
  StatusLead StatusLead
  Guid? ClienteId
  Guid? OportunidadeId
  DateTimeOffset? QualificadoEm
  string? MotivoDescarte
}
```


### `POST /api/crm/leads/{id}/descartar`

| | |
|---|---|
| Permissão | `CRM_LEADS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LeadResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `LeadResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Empresa
  string? Email
  string? Telefone
  OrigemLead Origem
  Guid? ResponsavelId
  string? Observacao
  StatusLead StatusLead
  Guid? ClienteId
  Guid? OportunidadeId
  DateTimeOffset? QualificadoEm
  string? MotivoDescarte
}
```


### `POST /api/crm/leads/{id}/qualificar`

| | |
|---|---|
| Permissão | `CRM_LEADS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OportunidadeResponse` |

**Request**
```ts
{
  clienteId?: uuid
  titulo?: string | null
  valorEstimado?: number
  responsavelId?: uuid | null
  dataPrevisaoFechamento?: date-time | null
}
```

**Response** (C#, `OportunidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  Guid ClienteId
  Guid? LeadId
  decimal ValorEstimado
  Guid? ResponsavelId
  DateTimeOffset? DataPrevisaoFechamento
  EstagioOportunidade Estagio
  StatusOportunidade StatusOportunidade
  MotivoPerdaOportunidade? MotivoPerda
  string? JustificativaPerda
  Guid? PropostaVencedoraId
  Guid? PedidoVendaId
  DateTimeOffset? GanhaEm
  DateTimeOffset? PerdidaEm
}
```


## LocaisEstoque — 4/4 consumidos pelo frontend

### `GET /api/estoque/locais`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/estoque/locais`

| | |
|---|---|
| Permissão | `LOCAIS_ESTOQUE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LocalEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `LocalEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `PUT /api/estoque/locais/{id}`

| | |
|---|---|
| Permissão | `LOCAIS_ESTOQUE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LocalEstoqueResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `LocalEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `POST /api/estoque/locais/{id}/inativar`

| | |
|---|---|
| Permissão | `LOCAIS_ESTOQUE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## Lotes — 8/8 consumidos pelo frontend

### `GET /api/alimentar/lotes`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `produtoId?` `status?` `vencidos?` `termo?` |


### `POST /api/alimentar/lotes`

| | |
|---|---|
| Permissão | `ALIMENTAR_LOTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LoteResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  produtoId?: uuid
  numeroLote?: string | null
  origem?: Erp.Domain.Alimentar.LoteOrigem
  dataFabricacao?: date-time | null
  dataValidade?: date-time
  quantidadeInicial?: number
  fornecedorId?: uuid | null
  localEstoqueId?: uuid | null
  documentoOrigem?: string | null
}
```

**Response** (C#, `LoteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  string NumeroLote
  LoteOrigem Origem
  DateTimeOffset? DataFabricacao
  DateTimeOffset DataValidade
  decimal QuantidadeInicial
  decimal QuantidadeAtual
  Guid? FornecedorId
  Guid? LocalEstoqueId
  StatusLote StatusLote
  string? MotivoBloqueio
  bool Vencido
}
```


### `GET /api/alimentar/lotes/{id}`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `LoteResponse` |

**Response** (C#, `LoteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  string NumeroLote
  LoteOrigem Origem
  DateTimeOffset? DataFabricacao
  DateTimeOffset DataValidade
  decimal QuantidadeInicial
  decimal QuantidadeAtual
  Guid? FornecedorId
  Guid? LocalEstoqueId
  StatusLote StatusLote
  string? MotivoBloqueio
  bool Vencido
}
```


### `POST /api/alimentar/lotes/{id}/bloquear`

| | |
|---|---|
| Permissão | `ALIMENTAR_LOTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LoteResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `LoteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  string NumeroLote
  LoteOrigem Origem
  DateTimeOffset? DataFabricacao
  DateTimeOffset DataValidade
  decimal QuantidadeInicial
  decimal QuantidadeAtual
  Guid? FornecedorId
  Guid? LocalEstoqueId
  StatusLote StatusLote
  string? MotivoBloqueio
  bool Vencido
}
```


### `POST /api/alimentar/lotes/{id}/desbloquear`

| | |
|---|---|
| Permissão | `ALIMENTAR_LOTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `LoteResponse` |

**Response** (C#, `LoteResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  string NumeroLote
  LoteOrigem Origem
  DateTimeOffset? DataFabricacao
  DateTimeOffset DataValidade
  decimal QuantidadeInicial
  decimal QuantidadeAtual
  Guid? FornecedorId
  Guid? LocalEstoqueId
  StatusLote StatusLote
  string? MotivoBloqueio
  bool Vencido
}
```


### `GET /api/alimentar/lotes/{id}/movimentacoes`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` |


### `GET /api/alimentar/lotes/a-vencer`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `dias?` |


### `POST /api/alimentar/lotes/movimentacoes`

| | |
|---|---|
| Permissão | `ALIMENTAR_LOTES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `MovimentacaoLoteResponse` |

**Request**
```ts
{
  loteId?: uuid
  tipo?: Erp.Domain.Alimentar.TipoMovimentacaoLote
  quantidade?: number
  data?: date-time | null
  documentoOrigem?: string | null
  observacao?: string | null
}
```

**Response** (C#, `MovimentacaoLoteResponse`)
```csharp
{
  Guid Id
  Guid LoteId
  Guid ProdutoId
  TipoMovimentacaoLote Tipo
  decimal Quantidade
  DateTimeOffset Data
  string? DocumentoOrigem
  string? Observacao
}
```


## Marcas — 4/4 consumidos pelo frontend

### `GET /api/produtos/marcas`

| | |
|---|---|
| Permissão | `PRODUTOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/produtos/marcas`

| | |
|---|---|
| Permissão | `MARCAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `MarcaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `MarcaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `PUT /api/produtos/marcas/{id}`

| | |
|---|---|
| Permissão | `MARCAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `MarcaResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `MarcaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Descricao
  EntityStatus Status
}
```


### `POST /api/produtos/marcas/{id}/inativar`

| | |
|---|---|
| Permissão | `MARCAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## ModelosDocumentoFiscal — 0/1 consumidos pelo frontend

### `GET /api/fiscal/modelos-documento`

| | |
|---|---|
| Permissão | `FISCAL_MODELOS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `termo?` `codigo?` `ativo?` `pagina?` `tamanhoPagina?` |


## Motoristas — 2/4 consumidos pelo frontend

### `GET /api/frota/motoristas`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/frota/motoristas`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `MotoristaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  cpf?: string | null
  cnhNumero?: string | null
  cnhCategoria?: string | null
  cnhValidade?: date-time
  telefone?: string | null
}
```

**Response** (C#, `MotoristaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Cpf
  string CnhNumero
  string CnhCategoria
  DateTimeOffset CnhValidade
  string? Telefone
  bool CnhVencida
}
```


### `GET /api/frota/motoristas/{id}`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `MotoristaResponse` |

**Response** (C#, `MotoristaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Cpf
  string CnhNumero
  string CnhCategoria
  DateTimeOffset CnhValidade
  string? Telefone
  bool CnhVencida
}
```


### `PUT /api/frota/motoristas/{id}`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `MotoristaResponse` |

**Request**
```ts
{
  nome?: string | null
  cpf?: string | null
  cnhNumero?: string | null
  cnhCategoria?: string | null
  cnhValidade?: date-time
  telefone?: string | null
}
```

**Response** (C#, `MotoristaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Cpf
  string CnhNumero
  string CnhCategoria
  DateTimeOffset CnhValidade
  string? Telefone
  bool CnhVencida
}
```


## NaoConformidades — 7/7 consumidos pelo frontend

### `GET /api/qualidade/nao-conformidades`

| | |
|---|---|
| Permissão | `QUALIDADE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `inspecaoId?` `status?` |


### `GET /api/qualidade/nao-conformidades/{id}`

| | |
|---|---|
| Permissão | `QUALIDADE_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NaoConformidadeResponse` |

**Response** (C#, `NaoConformidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid InspecaoId
  Guid ProdutoId
  string Descricao
  bool Critica
  StatusNaoConformidade StatusNaoConformidade
  DateTimeOffset? EncerradaEm
  IReadOnlyList<AcaoCorretivaResponse> Acoes
}
```


### `POST /api/qualidade/nao-conformidades/{id}/acoes`

| | |
|---|---|
| Permissão | `QUALIDADE_NAO_CONFORMIDADE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NaoConformidadeResponse` |

**Request**
```ts
{
  descricao?: string | null
  responsavelId?: uuid | null
  prazo?: date-time | null
}
```

**Response** (C#, `NaoConformidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid InspecaoId
  Guid ProdutoId
  string Descricao
  bool Critica
  StatusNaoConformidade StatusNaoConformidade
  DateTimeOffset? EncerradaEm
  IReadOnlyList<AcaoCorretivaResponse> Acoes
}
```


### `POST /api/qualidade/nao-conformidades/{id}/acoes/{acaoId}/cancelar`

| | |
|---|---|
| Permissão | `QUALIDADE_NAO_CONFORMIDADE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NaoConformidadeResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `NaoConformidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid InspecaoId
  Guid ProdutoId
  string Descricao
  bool Critica
  StatusNaoConformidade StatusNaoConformidade
  DateTimeOffset? EncerradaEm
  IReadOnlyList<AcaoCorretivaResponse> Acoes
}
```


### `POST /api/qualidade/nao-conformidades/{id}/acoes/{acaoId}/concluir`

| | |
|---|---|
| Permissão | `QUALIDADE_NAO_CONFORMIDADE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NaoConformidadeResponse` |

**Response** (C#, `NaoConformidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid InspecaoId
  Guid ProdutoId
  string Descricao
  bool Critica
  StatusNaoConformidade StatusNaoConformidade
  DateTimeOffset? EncerradaEm
  IReadOnlyList<AcaoCorretivaResponse> Acoes
}
```


### `POST /api/qualidade/nao-conformidades/{id}/acoes/{acaoId}/iniciar`

| | |
|---|---|
| Permissão | `QUALIDADE_NAO_CONFORMIDADE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NaoConformidadeResponse` |

**Response** (C#, `NaoConformidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid InspecaoId
  Guid ProdutoId
  string Descricao
  bool Critica
  StatusNaoConformidade StatusNaoConformidade
  DateTimeOffset? EncerradaEm
  IReadOnlyList<AcaoCorretivaResponse> Acoes
}
```


### `POST /api/qualidade/nao-conformidades/{id}/encerrar`

| | |
|---|---|
| Permissão | `QUALIDADE_NAO_CONFORMIDADE_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NaoConformidadeResponse` |

**Response** (C#, `NaoConformidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid InspecaoId
  Guid ProdutoId
  string Descricao
  bool Critica
  StatusNaoConformidade StatusNaoConformidade
  DateTimeOffset? EncerradaEm
  IReadOnlyList<AcaoCorretivaResponse> Acoes
}
```


## NaturezasOperacao — 0/5 consumidos pelo frontend

### `GET /api/fiscal/naturezas-operacao`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `termo?` `codigo?` `tipoDocumento?` `tipoOperacao?` `finalidade?` `somenteAtivas?` `pagina?` `tamanhoPagina?` |


### `POST /api/fiscal/naturezas-operacao`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  descricao?: string | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  tipoOperacao?: Erp.Domain.Fiscal.TipoOperacaoFiscal
  finalidade?: Erp.Domain.Fiscal.Cadastros.FinalidadeNaturezaOperacao
  indicadorPresencaComprador?: Erp.Domain.Fiscal.Cadastros.IndicadorPresencaComprador
  indicadorConsumidorFinal?: boolean
  movimentaEstoque?: boolean
  geraFinanceiro?: boolean
  observacao?: string | null
  cfops?: Erp.Application.Fiscal.Cadastros.NaturezasOperacao.MapeamentoCfopRequest[] | null
}
```


### `PUT /api/fiscal/naturezas-operacao/{id}`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  descricao?: string | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  tipoOperacao?: Erp.Domain.Fiscal.TipoOperacaoFiscal
  finalidade?: Erp.Domain.Fiscal.Cadastros.FinalidadeNaturezaOperacao
  indicadorPresencaComprador?: Erp.Domain.Fiscal.Cadastros.IndicadorPresencaComprador
  indicadorConsumidorFinal?: boolean
  movimentaEstoque?: boolean
  geraFinanceiro?: boolean
  observacao?: string | null
  cfops?: Erp.Application.Fiscal.Cadastros.NaturezasOperacao.MapeamentoCfopRequest[] | null
}
```


### `GET /api/fiscal/naturezas-operacao/{id}/cfop`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `ufOrigem?` `ufDestino?` `tipoItem?` `operacaoComExterior?` |


### `POST /api/fiscal/naturezas-operacao/{id}/inativar`

| | |
|---|---|
| Permissão | `FISCAL_CADASTROS_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  motivo?: string | null
}
```


## NotasFiscais — 26/28 consumidos pelo frontend

### `GET /api/fiscal/notas-fiscais`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `PagedResult<NotaFiscalListagemItemResponse>` |
| Query | `EmpresaId?` `FilialId?` `TipoDocumento?` `TipoOperacao?` `StatusFiscal?` `Origem?` `OrigemId?` `PessoaId?` `Serie?` `Numero?` `ChaveAcesso?` `ProtocoloAutorizacao?` `DataEmissaoInicial?` `DataEmissaoFinal?` `DataAutorizacaoInicial?` `DataAutorizacaoFinal?` `DataCancelamentoInicial?` `DataCancelamentoFinal?` `ValorTotalMinimo?` `ValorTotalMaximo?` `PossuiXmlAutorizado?` `PossuiDanfe?` `ContaReceberGerada?` `StatusPedidoVenda?` `SomenteComPendenciaXmlAutorizado?` `SomenteComPendenciaDanfe?` `SomenteComPendenciaEstoque?` `SomenteComPendenciaFinanceira?` `Page?` `PageSize?` |

**Response** (C#, `PagedResult<NotaFiscalListagemItemResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  StatusNotaFiscal StatusFiscal
  OrigemNotaFiscal Origem
  Guid? OrigemId
  Guid? PessoaId
  string Serie
  string Numero
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  decimal ValorTotal
  bool PossuiXmlEnvio
  bool PossuiXmlAutorizado
  bool PossuiDanfe
  bool EstoqueAplicavel
  bool EstoqueBaixado
  bool EstoquePendente
  bool FinanceiroAplicavel
  bool ContaReceberGerada
  bool FinanceiroPendente
  string AcaoPrincipalCodigo
  string AcaoPrincipalNome
  string? AcaoPrincipalMetodoHttp
  string? AcaoPrincipalEndpoint
  string? AcaoPrincipalPermissao
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  tipoOperacao?: Erp.Domain.Fiscal.TipoOperacaoFiscal
  origem?: Erp.Domain.Fiscal.OrigemNotaFiscal
  origemId?: uuid | null
  serie?: string | null
  numero?: string | null
  dataEmissao?: date-time
  naturezaOperacaoId?: uuid | null
  pessoaId?: uuid | null
  observacao?: string | null
  valorFrete?: number
  valorSeguro?: number
  valorOutrasDespesas?: number
}
```

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `GET /api/fiscal/notas-fiscais/{id}`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalXmlPipelineResponse` |

**Request**
```ts
{
  certificateThumbprint?: string | null
  xmlEnvio?: string | null
  armazenarXmlAssinado?: boolean
  validarSchemaAntesAssinatura?: boolean
  schemaSetName?: string | null
}
```

**Response** (C#, `NotaFiscalXmlPipelineResponse`)
```csharp
{
  Guid NotaFiscalId
  TipoDocumentoFiscal TipoDocumento
  StatusNotaFiscal StatusFiscal
  TipoXmlFiscal TipoXml
  string ConteudoXml
  string? SchemaSetName
  bool SchemaValidado
  bool Armazenado
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/baixar-estoque`

| | |
|---|---|
| Permissão | `ESTOQUE_MOVIMENTAR` |
| Frontend | ✅ consome |
| Response DTO | `BaixaEstoqueNotaFiscalResponse` |

**Request**
```ts
{
  motivo?: string | null
  documento?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `BaixaEstoqueNotaFiscalResponse`)
```csharp
{
  Guid NotaFiscalId
  Guid PedidoVendaId
  StatusNotaFiscal StatusFiscal
  decimal QuantidadeTotalBaixada
  IReadOnlyCollection<BaixaEstoqueNotaFiscalItemResponse> Itens
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/calcular-tributos`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `NotaFiscalResponse` |

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `POST /api/fiscal/notas-fiscais/{id}/cancelar`

| | |
|---|---|
| Permissão | `FISCAL_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Request**
```ts
{
  motivo?: string | null
  protocoloCancelamento?: string | null
  xmlCancelamento?: string | null
}
```

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `POST /api/fiscal/notas-fiscais/{id}/cancelar-sefaz`

| | |
|---|---|
| Permissão | `FISCAL_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `EventoFiscalOperacionalResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  motivo?: string | null
  xmlEventoAssinado?: string | null
  validarSchemaAntesTransmissao?: boolean
  schemaSetName?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `EventoFiscalOperacionalResponse`)
```csharp
{
  Guid NotaFiscalId
  StatusNotaFiscal StatusFiscal
  TipoEventoFiscal TipoEvento
  bool ComunicacaoOk
  bool AutorizadoPeloAmbiente
  string? CodigoStatus
  string? Motivo
  string? Protocolo
  bool DeveReprocessar
}
```


### `POST /api/fiscal/notas-fiscais/{id}/cartas-correcao`

| | |
|---|---|
| Permissão | `FISCAL_CARTA_CORRECAO` |
| Frontend | ✅ consome |
| Response DTO | `CartaCorrecaoResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  textoCorrecao?: string | null
  xmlEventoAssinado?: string | null
  validarSchemaAntesTransmissao?: boolean
  schemaSetName?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `CartaCorrecaoResponse`)
```csharp
{
  Guid Id
  Guid NotaFiscalId
  int Sequencia
  string TextoCorrecao
  string? Protocolo
  DateTimeOffset CriadaEm
  Guid CriadaPor
}
```


### `POST /api/fiscal/notas-fiscais/{id}/consultar-protocolo-sefaz`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `ConsultaProtocoloSefazResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  servico?: Erp.Application.Fiscal.NotasFiscais.TipoServicoTransmissaoFiscal
  xmlConsultaAssinado?: string | null
  validarSchemaAntesConsulta?: boolean
  schemaSetName?: string | null
  aplicarReconciliacaoLocal?: boolean
  correlationId?: string | null
}
```

**Response** (C#, `ConsultaProtocoloSefazResponse`)
```csharp
{
  Guid NotaFiscalId
  StatusNotaFiscal StatusFiscalAntes
  StatusNotaFiscal StatusFiscalDepois
  TipoServicoTransmissaoFiscal Servico
  bool ComunicacaoOk
  bool AutorizadaNoAmbiente
  bool ReconciliacaoAplicada
  string? CodigoStatus
  string? Motivo
  string? Protocolo
  string? ChaveAcesso
  bool DeveReprocessar
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/danfe`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `DocumentoAuxiliarFiscalResponse` |

**Request**
```ts
{
  correlationId?: string | null
}
```

**Response** (C#, `DocumentoAuxiliarFiscalResponse`)
```csharp
{
  Guid Id
  Guid NotaFiscalId
  TipoDocumentoAuxiliarFiscal Tipo
  FormatoDocumentoAuxiliarFiscal Formato
  string NomeArquivo
  string ContentType
  string HashSha256
  long TamanhoBytes
  DateTimeOffset GeradoEm
  Guid GeradoPor
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/gerar-conta-receber`

| | |
|---|---|
| Permissão | `FINANCEIRO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaReceberNotaFiscalResponse` |

**Request**
```ts
{
  condicaoPagamentoId?: uuid | null
  primeiraDataVencimento?: date-time
  documento?: string | null
  observacao?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `ContaReceberNotaFiscalResponse`)
```csharp
{
  Guid NotaFiscalId
  Guid PedidoVendaId
  Guid ContaReceberId
  string Documento
  OrigemFinanceira Origem
  Guid OrigemId
  decimal ValorOriginal
  decimal ValorSaldo
  StatusContaFinanceira Status
  bool JaExistia
  IReadOnlyCollection<ContaReceberNotaFiscalParcelaResponse> Parcelas
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalXmlPipelineResponse` |

**Request**
```ts
{
  armazenarXml?: boolean
  validarSchema?: boolean
  schemaSetName?: string | null
}
```

**Response** (C#, `NotaFiscalXmlPipelineResponse`)
```csharp
{
  Guid NotaFiscalId
  TipoDocumentoFiscal TipoDocumento
  StatusNotaFiscal StatusFiscal
  TipoXmlFiscal TipoXml
  string ConteudoXml
  string? SchemaSetName
  bool SchemaValidado
  bool Armazenado
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/habilitar-contingencia`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `ContingenciaFiscalResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  tipoContingencia?: Erp.Domain.Fiscal.TipoContingenciaFiscal
  motivo?: string | null
  exigirStatusServicoIndisponivelRecente?: boolean
  janelaStatusServicoMinutos?: integer
  correlationId?: string | null
}
```

**Response** (C#, `ContingenciaFiscalResponse`)
```csharp
{
  Guid? NotaFiscalId
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoAmbienteFiscal Ambiente
  string UfAutorizadora
  TipoContingenciaFiscal TipoContingencia
  bool Permitida
  bool StatusServicoIndisponivelDetectado
  string? CodigoStatusServico
  string? MotivoStatusServico
  string MotivoOperacional
  DateTimeOffset AvaliadaEm
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/impostos`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Request**
```ts
{
  itemNotaFiscalId?: uuid | null
  nome?: string | null
  cstCsosn?: string | null
  baseCalculo?: number
  aliquota?: number
  valor?: number
  observacao?: string | null
}
```

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `GET /api/fiscal/notas-fiscais/{id}/integracoes`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<LogIntegracaoFiscalResponse>` |

**Response** (C#, `IReadOnlyCollection<LogIntegracaoFiscalResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? NotaFiscalId
  string Operacao
  StatusIntegracaoFiscal StatusIntegracao
  string? CorrelationId
  string? PayloadResumo
  string? Mensagem
  DateTimeOffset RegistradoEm
  bool PodeReprocessar
  bool ContemDadoSensivelOcultado
}
```


### `POST /api/fiscal/notas-fiscais/{id}/itens`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  produtoId?: uuid | null
  codigoItem?: string | null
  descricao?: string | null
  ncm?: string | null
  cfop?: string | null
  unidadeComercial?: string | null
  quantidade?: number
  valorUnitario?: number
  valorDesconto?: number
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/fiscal/notas-fiscais/{id}/rejeicao`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Request**
```ts
{
  codigoRejeicao?: string | null
  mensagemRejeicao?: string | null
}
```

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `POST /api/fiscal/notas-fiscais/{id}/reprocessar-sefaz`

| | |
|---|---|
| Permissão | `FISCAL_REPROCESSAR` |
| Frontend | ✅ consome |
| Response DTO | `TransmissaoSefazResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  servico?: Erp.Application.Fiscal.NotasFiscais.TipoServicoTransmissaoFiscal
  xmlEnvioAssinado?: string | null
  validarSchemaAntesTransmissao?: boolean
  schemaSetName?: string | null
  logIntegracaoFiscalId?: uuid | null
  correlationIdOriginal?: string | null
  correlationId?: string | null
  motivo?: string | null
}
```

**Response** (C#, `TransmissaoSefazResponse`)
```csharp
{
  Guid NotaFiscalId
  StatusNotaFiscal StatusFiscal
  bool ComunicacaoOk
  bool Autorizada
  string? CodigoStatus
  string? Motivo
  string? Protocolo
  string? ChaveAcesso
  bool DeveReprocessar
  com default vazio — não só posição final
  mas
  porque construtores posicionais em `tests/` que este bloco NÃO pode tocar (fronteira da
  entre outras coisas
  o alerta de "nota fiscal
  mas o pedido de venda não pôde ser faturado" (D2)
  quando a autorização em si teve
  mas a propriedade gerada é substituída abaixo para nunca expor null — o
}
```


### `GET /api/fiscal/notas-fiscais/{id}/resumo-operacional`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResumoOperacionalResponse` |

**Response** (C#, `NotaFiscalResumoOperacionalResponse`)
```csharp
{
  Guid NotaFiscalId
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  string Serie
  string Numero
  StatusNotaFiscal StatusFiscal
  OrigemNotaFiscal Origem
  Guid? OrigemId
  bool PossuiXmlEnvio
  bool PossuiXmlAutorizado
  bool PossuiDanfe
  PedidoVendaResumoFiscalResponse? PedidoVenda
  EstoqueResumoFiscalResponse Estoque
  FinanceiroResumoFiscalResponse Financeiro
  AcoesOperacionaisNotaFiscalResponse Acoes
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `TransmissaoSefazResponse` |

**Request**
```ts
{
  ufAutorizadora?: string | null
  servico?: Erp.Application.Fiscal.NotasFiscais.TipoServicoTransmissaoFiscal
  xmlEnvioAssinado?: string | null
  validarSchemaAntesTransmissao?: boolean
  schemaSetName?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `TransmissaoSefazResponse`)
```csharp
{
  Guid NotaFiscalId
  StatusNotaFiscal StatusFiscal
  bool ComunicacaoOk
  bool Autorizada
  string? CodigoStatus
  string? Motivo
  string? Protocolo
  string? ChaveAcesso
  bool DeveReprocessar
  com default vazio — não só posição final
  mas
  porque construtores posicionais em `tests/` que este bloco NÃO pode tocar (fronteira da
  entre outras coisas
  o alerta de "nota fiscal
  mas o pedido de venda não pôde ser faturado" (D2)
  quando a autorização em si teve
  mas a propriedade gerada é substituída abaixo para nunca expor null — o
}
```


### `POST /api/fiscal/notas-fiscais/{id}/validar`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `POST /api/fiscal/notas-fiscais/{id}/valores-acessorios`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `NotaFiscalResponse` |

**Request**
```ts
{
  valorFrete?: number
  valorSeguro?: number
  valorOutrasDespesas?: number
}
```

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `GET /api/fiscal/notas-fiscais/{id}/workflow-operacional`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalWorkflowOperacionalResponse` |

**Response** (C#, `NotaFiscalWorkflowOperacionalResponse`)
```csharp
{
  Guid NotaFiscalId
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  StatusNotaFiscal StatusFiscal
  string EtapaAtual
  int OrdemEtapaAtual
  decimal PercentualConcluido
  NotaFiscalResumoOperacionalResponse Resumo
  IReadOnlyCollection<EtapaWorkflowFiscalResponse> Etapas
  IReadOnlyCollection<AcaoWorkflowFiscalResponse> ProximasAcoes
  IReadOnlyCollection<string> Bloqueios
  IReadOnlyCollection<string> Alertas
}
```


### `POST /api/fiscal/notas-fiscais/{id}/xmls`

| | |
|---|---|
| Permissão | `FISCAL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Fiscal.TipoXmlFiscal
  conteudoXml?: string | null
  protocolo?: string | null
  chaveAcesso?: string | null
}
```

**Response** (C#, `NotaFiscalResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoOperacaoFiscal TipoOperacao
  OrigemNotaFiscal Origem
  Guid? OrigemId
  string Serie
  string Numero
  e em documento que não passa pela numeração com chave de acesso. É campo próprio
  distinto do
  string? ChaveAcesso
  string? ProtocoloAutorizacao
  DateTimeOffset DataEmissao
  DateTimeOffset? AutorizadaEm
  DateTimeOffset? CanceladaEm
  StatusNotaFiscal StatusFiscal
  decimal ValorProdutos
  decimal ValorDesconto
  aditivo em ValorTotal. Imposto ainda não entra aqui — G2. decimal ValorFrete
  decimal ValorSeguro
  decimal ValorOutrasDespesas
  decimal ValorTotal
  string? CodigoRejeicao
  string? MensagemRejeicao
  string? MotivoCancelamento
  string? Observacao
  IReadOnlyCollection<ItemNotaFiscalResponse> Itens
  IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos
  IReadOnlyCollection<XmlNotaFiscalResponse> Xmls
  IReadOnlyCollection<EventoNotaFiscalResponse> Eventos
  decimal ValorIcmsSt = 0m
  decimal ValorFcpSt = 0m
}
```


### `GET /api/fiscal/notas-fiscais/documentos-auxiliares/{documentoAuxiliarId}/download`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ArquivoFiscalDownloadResponse` |

**Response** (C#, `ArquivoFiscalDownloadResponse`)
```csharp
{
  Guid Id
  string NomeArquivo
  string ContentType
  string HashSha256
  long TamanhoBytes
  byte[] Conteudo
}
```


### `GET /api/fiscal/notas-fiscais/exportacoes/csv`

| | |
|---|---|
| Permissão | `FISCAL_EXPORTAR` |
| Frontend | ✅ consome |
| Response DTO | `ArquivoFiscalDownloadResponse` |
| Query | `EmpresaId?` `FilialId?` `TipoDocumento?` `TipoOperacao?` `StatusFiscal?` `Origem?` `OrigemId?` `PessoaId?` `Serie?` `Numero?` `ChaveAcesso?` `ProtocoloAutorizacao?` `DataEmissaoInicial?` `DataEmissaoFinal?` `DataAutorizacaoInicial?` `DataAutorizacaoFinal?` `DataCancelamentoInicial?` `DataCancelamentoFinal?` `ValorTotalMinimo?` `ValorTotalMaximo?` `PossuiXmlAutorizado?` `PossuiDanfe?` `ContaReceberGerada?` `StatusPedidoVenda?` `SomenteComPendenciaXmlAutorizado?` `SomenteComPendenciaDanfe?` `SomenteComPendenciaEstoque?` `SomenteComPendenciaFinanceira?` `Formato?` `Limite?` `Motivo?` |

**Response** (C#, `ArquivoFiscalDownloadResponse`)
```csharp
{
  Guid Id
  string NomeArquivo
  string ContentType
  string HashSha256
  long TamanhoBytes
  byte[] Conteudo
}
```


### `POST /api/fiscal/notas-fiscais/gerar-de-pedido-venda`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `NotaFiscalPedidoVendaResponse` |

**Request**
```ts
{
  pedidoVendaId?: uuid
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  serie?: string | null
  numero?: string | null
  naturezaOperacaoId?: uuid | null
  cfopPadrao?: string | null
  unidadeComercialPadrao?: string | null
  validarDadosFiscaisProduto?: boolean
  observacao?: string | null
}
```

**Response** (C#, `NotaFiscalPedidoVendaResponse`)
```csharp
{
  NotaFiscalResponse NotaFiscal
  Guid PedidoVendaId
  string NumeroPedidoVenda
  IReadOnlyCollection<string> Alertas
}
```


## Notificacoes — 5/6 consumidos pelo frontend

### `GET /api/notificacoes`

| | |
|---|---|
| Permissão | `NOTIFICACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `usuarioDestinoId?` `situacao?` `severidade?` `categoria?` `moduloOrigem?` `incluirExpiradas?` `page?` `pageSize?` |


### `POST /api/notificacoes`

| | |
|---|---|
| Permissão | `NOTIFICACOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  usuarioDestinoId?: uuid
  titulo?: string | null
  mensagem?: string | null
  categoria?: string | null
  moduloOrigem?: string | null
  severidade?: Erp.Domain.Notificacoes.SeveridadeNotificacao
  entidadeOrigem?: string | null
  entidadeOrigemId?: uuid | null
  acaoUrl?: string | null
  expiraEm?: date-time | null
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `POST /api/notificacoes/{id}/arquivar`

| | |
|---|---|
| Permissão | `NOTIFICACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NotificacaoInternaResponse` |

**Response** (C#, `NotificacaoInternaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid UsuarioDestinoId
  string Titulo
  string Mensagem
  string Categoria
  string ModuloOrigem
  SeveridadeNotificacao Severidade
  StatusNotificacao Situacao
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  string? AcaoUrl
  DateTimeOffset CriadaEm
  DateTimeOffset? LidaEm
  DateTimeOffset? ArquivadaEm
  DateTimeOffset? ExpiraEm
}
```


### `POST /api/notificacoes/{id}/marcar-lida`

| | |
|---|---|
| Permissão | `NOTIFICACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NotificacaoInternaResponse` |

**Response** (C#, `NotificacaoInternaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid UsuarioDestinoId
  string Titulo
  string Mensagem
  string Categoria
  string ModuloOrigem
  SeveridadeNotificacao Severidade
  StatusNotificacao Situacao
  string? EntidadeOrigem
  Guid? EntidadeOrigemId
  string? AcaoUrl
  DateTimeOffset CriadaEm
  DateTimeOffset? LidaEm
  DateTimeOffset? ArquivadaEm
  DateTimeOffset? ExpiraEm
}
```


### `POST /api/notificacoes/marcar-todas-lidas`

| | |
|---|---|
| Permissão | `NOTIFICACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `int` |
| Query | `empresaId?` `filialId?` |


### `GET /api/notificacoes/nao-lidas/contagem`

| | |
|---|---|
| Permissão | `NOTIFICACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


## ObservabilidadeFiscal — 1/1 consumidos pelo frontend

### `GET /api/fiscal/observabilidade/integracoes`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ObservabilidadeFiscalResponse` |
| Query | `empresaId?` `filialId?` `registradoApos?` `take?` |

**Response** (C#, `ObservabilidadeFiscalResponse`)
```csharp
{
  Guid EmpresaId
  Guid? FilialId
  DateTimeOffset GeradoEm
  DateTimeOffset? RegistradoApos
  int TotalLogsAnalisados
  int TotalSucesso
  int TotalFalha
  int TotalReprocessamento
  int TotalPendente
  DateTimeOffset? UltimoRegistroEm
  bool PossuiFalhaRecente
  bool PossuiPendenciaRecente
  IReadOnlyCollection<string> OperacoesComFalha
  IReadOnlyCollection<string> Alertas
  IReadOnlyCollection<LogIntegracaoFiscalResponse> LogsRecentes
}
```


## Oportunidades — 6/7 consumidos pelo frontend

### `GET /api/crm/oportunidades`

| | |
|---|---|
| Permissão | `CRM_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `clienteId?` `status?` `estagio?` `termo?` |


### `GET /api/crm/oportunidades/{id}`

| | |
|---|---|
| Permissão | `CRM_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `OportunidadeResponse` |

**Response** (C#, `OportunidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  Guid ClienteId
  Guid? LeadId
  decimal ValorEstimado
  Guid? ResponsavelId
  DateTimeOffset? DataPrevisaoFechamento
  EstagioOportunidade Estagio
  StatusOportunidade StatusOportunidade
  MotivoPerdaOportunidade? MotivoPerda
  string? JustificativaPerda
  Guid? PropostaVencedoraId
  Guid? PedidoVendaId
  DateTimeOffset? GanhaEm
  DateTimeOffset? PerdidaEm
}
```


### `PUT /api/crm/oportunidades/{id}`

| | |
|---|---|
| Permissão | `CRM_OPORTUNIDADES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `OportunidadeResponse` |

**Request**
```ts
{
  titulo?: string | null
  valorEstimado?: number
  responsavelId?: uuid | null
  dataPrevisaoFechamento?: date-time | null
}
```

**Response** (C#, `OportunidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  Guid ClienteId
  Guid? LeadId
  decimal ValorEstimado
  Guid? ResponsavelId
  DateTimeOffset? DataPrevisaoFechamento
  EstagioOportunidade Estagio
  StatusOportunidade StatusOportunidade
  MotivoPerdaOportunidade? MotivoPerda
  string? JustificativaPerda
  Guid? PropostaVencedoraId
  Guid? PedidoVendaId
  DateTimeOffset? GanhaEm
  DateTimeOffset? PerdidaEm
}
```


### `POST /api/crm/oportunidades/{id}/converter`

| | |
|---|---|
| Permissão | `CRM_CONVERTER` |
| Frontend | ✅ consome |
| Response DTO | `ConverterOportunidadeResponse` |

**Request**
```ts
{
  numeroPedido?: string | null
  tipo?: Erp.Domain.Vendas.TipoPedidoVenda
  dataEmissao?: date-time | null
  dataPrevisaoEntrega?: date-time | null
  observacao?: string | null
}
```

**Response** (C#, `ConverterOportunidadeResponse`)
```csharp
{
  Guid OportunidadeId
  Guid PedidoVendaId
  string NumeroPedido
  decimal ValorTotal
}
```


### `POST /api/crm/oportunidades/{id}/estagio`

| | |
|---|---|
| Permissão | `CRM_OPORTUNIDADES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OportunidadeResponse` |

**Request**
```ts
{
  estagio?: Erp.Domain.Crm.EstagioOportunidade
}
```

**Response** (C#, `OportunidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  Guid ClienteId
  Guid? LeadId
  decimal ValorEstimado
  Guid? ResponsavelId
  DateTimeOffset? DataPrevisaoFechamento
  EstagioOportunidade Estagio
  StatusOportunidade StatusOportunidade
  MotivoPerdaOportunidade? MotivoPerda
  string? JustificativaPerda
  Guid? PropostaVencedoraId
  Guid? PedidoVendaId
  DateTimeOffset? GanhaEm
  DateTimeOffset? PerdidaEm
}
```


### `POST /api/crm/oportunidades/{id}/ganhar`

| | |
|---|---|
| Permissão | `CRM_OPORTUNIDADES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OportunidadeResponse` |

**Request**
```ts
{
  propostaVencedoraId?: uuid | null
}
```

**Response** (C#, `OportunidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  Guid ClienteId
  Guid? LeadId
  decimal ValorEstimado
  Guid? ResponsavelId
  DateTimeOffset? DataPrevisaoFechamento
  EstagioOportunidade Estagio
  StatusOportunidade StatusOportunidade
  MotivoPerdaOportunidade? MotivoPerda
  string? JustificativaPerda
  Guid? PropostaVencedoraId
  Guid? PedidoVendaId
  DateTimeOffset? GanhaEm
  DateTimeOffset? PerdidaEm
}
```


### `POST /api/crm/oportunidades/{id}/perder`

| | |
|---|---|
| Permissão | `CRM_OPORTUNIDADES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OportunidadeResponse` |

**Request**
```ts
{
  motivo?: Erp.Domain.Crm.MotivoPerdaOportunidade
  justificativa?: string | null
}
```

**Response** (C#, `OportunidadeResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Titulo
  Guid ClienteId
  Guid? LeadId
  decimal ValorEstimado
  Guid? ResponsavelId
  DateTimeOffset? DataPrevisaoFechamento
  EstagioOportunidade Estagio
  StatusOportunidade StatusOportunidade
  MotivoPerdaOportunidade? MotivoPerda
  string? JustificativaPerda
  Guid? PropostaVencedoraId
  Guid? PedidoVendaId
  DateTimeOffset? GanhaEm
  DateTimeOffset? PerdidaEm
}
```


## OrdensProducao — 8/8 consumidos pelo frontend

### `GET /api/producao/ordens`

| | |
|---|---|
| Permissão | `PRODUCAO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `produtoId?` `status?` `termo?` |


### `POST /api/producao/ordens`

| | |
|---|---|
| Permissão | `PRODUCAO_ORDENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  produtoId?: uuid
  quantidadePlanejada?: number
  dataPlanejada?: date-time
  localEstoqueId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `GET /api/producao/ordens/{id}`

| | |
|---|---|
| Permissão | `PRODUCAO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/producao/ordens/{id}/apontamentos`

| | |
|---|---|
| Permissão | `PRODUCAO_ORDENS_APONTAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemProducaoResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Producao.TipoApontamentoProducao
  produtoId?: uuid | null
  quantidade?: number
  horas?: number | null
  custoHoraInformado?: number | null
  observacao?: string | null
  dataApontamento?: date-time | null
}
```

**Response** (C#, `OrdemProducaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ProdutoId
  Guid FichaTecnicaId
  Guid? LocalEstoqueId
  decimal QuantidadePlanejada
  decimal QuantidadeProduzida
  decimal QuantidadePerdas
  StatusOrdemProducao StatusOrdem
  decimal? CustoConsolidado
  string? Observacao
  IReadOnlyList<OrdemProducaoComponenteResponse> Componentes
  IReadOnlyList<OrdemProducaoApontamentoResponse> Apontamentos
}
```


### `POST /api/producao/ordens/{id}/cancelar`

| | |
|---|---|
| Permissão | `PRODUCAO_ORDENS_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemProducaoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `OrdemProducaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ProdutoId
  Guid FichaTecnicaId
  Guid? LocalEstoqueId
  decimal QuantidadePlanejada
  decimal QuantidadeProduzida
  decimal QuantidadePerdas
  StatusOrdemProducao StatusOrdem
  decimal? CustoConsolidado
  string? Observacao
  IReadOnlyList<OrdemProducaoComponenteResponse> Componentes
  IReadOnlyList<OrdemProducaoApontamentoResponse> Apontamentos
}
```


### `POST /api/producao/ordens/{id}/encerrar`

| | |
|---|---|
| Permissão | `PRODUCAO_ORDENS_ENCERRAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemProducaoResponse` |

**Request**
```ts
{
  observacao?: string | null
}
```

**Response** (C#, `OrdemProducaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ProdutoId
  Guid FichaTecnicaId
  Guid? LocalEstoqueId
  decimal QuantidadePlanejada
  decimal QuantidadeProduzida
  decimal QuantidadePerdas
  StatusOrdemProducao StatusOrdem
  decimal? CustoConsolidado
  string? Observacao
  IReadOnlyList<OrdemProducaoComponenteResponse> Componentes
  IReadOnlyList<OrdemProducaoApontamentoResponse> Apontamentos
}
```


### `POST /api/producao/ordens/{id}/liberar`

| | |
|---|---|
| Permissão | `PRODUCAO_ORDENS_LIBERAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemProducaoResponse` |

**Response** (C#, `OrdemProducaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ProdutoId
  Guid FichaTecnicaId
  Guid? LocalEstoqueId
  decimal QuantidadePlanejada
  decimal QuantidadeProduzida
  decimal QuantidadePerdas
  StatusOrdemProducao StatusOrdem
  decimal? CustoConsolidado
  string? Observacao
  IReadOnlyList<OrdemProducaoComponenteResponse> Componentes
  IReadOnlyList<OrdemProducaoApontamentoResponse> Apontamentos
}
```


### `GET /api/producao/ordens/{id}/necessidade`

| | |
|---|---|
| Permissão | `PRODUCAO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `NecessidadeOrdemProducaoResponse` |

**Response** (C#, `NecessidadeOrdemProducaoResponse`)
```csharp
{
  Guid OrdemProducaoId
  IReadOnlyList<NecessidadeComponenteResponse> Componentes
}
```


## OrdensServico — 10/10 consumidos pelo frontend

### `GET /api/servicos/ordens`

| | |
|---|---|
| Permissão | `SERVICOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `clienteId?` `status?` `tecnicoResponsavelId?` `termo?` |


### `POST /api/servicos/ordens`

| | |
|---|---|
| Permissão | `SERVICOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  clienteId?: uuid
  descricao?: string | null
  prioridade?: Erp.Domain.Servicos.PrioridadeOrdemServico
  tecnicoResponsavelId?: uuid | null
  localEstoqueId?: uuid | null
  dataAbertura?: date-time | null
  dataPrevisao?: date-time | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `GET /api/servicos/ordens/{id}`

| | |
|---|---|
| Permissão | `SERVICOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/servicos/ordens/{id}/cancelar`

| | |
|---|---|
| Permissão | `SERVICOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/servicos/ordens/{id}/encerrar`

| | |
|---|---|
| Permissão | `SERVICOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  laudoTecnico?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/servicos/ordens/{id}/faturar`

| | |
|---|---|
| Permissão | `SERVICOS_FATURAR` |
| Frontend | ✅ consome |
| Response DTO | `FaturarOrdemServicoResponse` |

**Request**
```ts
{
  numeroDocumento?: string | null
  dataVencimento?: date-time | null
  observacao?: string | null
}
```

**Response** (C#, `FaturarOrdemServicoResponse`)
```csharp
{
  Guid OrdemServicoId
  Guid ContaReceberId
  decimal ValorTotal
}
```


### `POST /api/servicos/ordens/{id}/iniciar-execucao`

| | |
|---|---|
| Permissão | `SERVICOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/servicos/ordens/{id}/itens`

| | |
|---|---|
| Permissão | `SERVICOS_APONTAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Servicos.TipoItemOrdemServico
  descricao?: string | null
  produtoId?: uuid | null
  quantidade?: number
  valorUnitario?: number
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/servicos/ordens/{id}/planejar`

| | |
|---|---|
| Permissão | `SERVICOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  planoExecucao?: string | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


### `POST /api/servicos/ordens/{id}/triar`

| | |
|---|---|
| Permissão | `SERVICOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `OrdemServicoResponse` |

**Request**
```ts
{
  diagnostico?: string | null
  tecnicoResponsavelId?: uuid | null
}
```

**Response** (C#, `OrdemServicoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  string Descricao
  PrioridadeOrdemServico Prioridade
  Guid? TecnicoResponsavelId
  Guid? LocalEstoqueId
  DateTimeOffset DataAbertura
  DateTimeOffset? DataPrevisao
  DateTimeOffset? DataEncerramento
  string? Diagnostico
  string? PlanoExecucao
  string? LaudoTecnico
  StatusOrdemServico StatusOS
  decimal ValorMaoDeObra
  decimal ValorMaterial
  decimal ValorTotal
  Guid? ContaReceberId
  DateTimeOffset? FaturadoEm
  IReadOnlyList<ItemOrdemServicoResponse> Itens
}
```


## Parametros — 0/2 consumidos pelo frontend

### `GET /api/parametros`

| | |
|---|---|
| Permissão | `SEGURANCA_PARAMETROS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IReadOnlyList<ParametroEfetivoResponse>` |
| Query | `empresaId?` `filialId?` |

**Response** (C#, `IReadOnlyList<ParametroEfetivoResponse>`)
```csharp
{
  string Chave
  string Valor
  TipoParametro Tipo
  OrigemParametro Origem
  string Descricao
}
```


### `PUT /api/parametros`

| | |
|---|---|
| Permissão | `SEGURANCA_PARAMETROS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ParametroEfetivoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  chave?: string | null
  valor?: string | null
}
```

**Response** (C#, `ParametroEfetivoResponse`)
```csharp
{
  string Chave
  string Valor
  TipoParametro Tipo
  OrigemParametro Origem
  string Descricao
}
```


## PedidosCompra — 11/11 consumidos pelo frontend

### `GET /api/compras/pedidos`

| | |
|---|---|
| Permissão | `COMPRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `fornecedorId?` `status?` `termo?` |


### `POST /api/compras/pedidos`

| | |
|---|---|
| Permissão | `COMPRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  fornecedorId?: uuid
  dataEmissao?: date-time
  dataPrevisaoEntrega?: date-time | null
  condicaoPagamentoId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `GET /api/compras/pedidos/{id}`

| | |
|---|---|
| Permissão | `COMPRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `PUT /api/compras/pedidos/{id}`

| | |
|---|---|
| Permissão | `COMPRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  dataPrevisaoEntrega?: date-time | null
  condicaoPagamentoId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/compras/pedidos/{id}/aprovar`

| | |
|---|---|
| Permissão | `COMPRAS_APROVAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/compras/pedidos/{id}/cancelar`

| | |
|---|---|
| Permissão | `COMPRAS_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/compras/pedidos/{id}/enviar-para-aprovacao`

| | |
|---|---|
| Permissão | `COMPRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/compras/pedidos/{id}/itens`

| | |
|---|---|
| Permissão | `COMPRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  produtoId?: uuid
  localEstoqueId?: uuid | null
  quantidade?: number
  valorUnitario?: number
  valorDesconto?: number
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `PUT /api/compras/pedidos/{id}/itens/{itemId}`

| | |
|---|---|
| Permissão | `COMPRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  localEstoqueId?: uuid | null
  quantidade?: number
  valorUnitario?: number
  valorDesconto?: number
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/compras/pedidos/{id}/itens/{itemId}/remover`

| | |
|---|---|
| Permissão | `COMPRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/compras/pedidos/{id}/receber`

| | |
|---|---|
| Permissão | `COMPRAS_RECEBER` |
| Frontend | ✅ consome |
| Response DTO | `PedidoCompraResponse` |

**Request**
```ts
{
  documento?: string | null
  dataRecebimento?: date-time
  permiteReceberAcimaDoPedido?: boolean
  gerarContaPagar?: boolean
  primeiroVencimento?: date-time | null
  observacao?: string | null
  itens?: Erp.Application.Compras.Pedidos.ReceberItemCompraRequest[] | null
}
```

**Response** (C#, `PedidoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid FornecedorId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  Guid? CondicaoPagamentoId
  StatusPedidoCompra StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  IReadOnlyList<ItemPedidoCompraResponse> Itens
}
```


## PedidosVenda — 11/11 consumidos pelo frontend

### `GET /api/vendas/pedidos`

| | |
|---|---|
| Permissão | `VENDAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `clienteId?` `status?` `termo?` |


### `POST /api/vendas/pedidos`

| | |
|---|---|
| Permissão | `VENDAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  clienteId?: uuid
  dataEmissao?: date-time
  dataPrevisaoEntrega?: date-time | null
  tipo?: Erp.Domain.Vendas.TipoPedidoVenda
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `GET /api/vendas/pedidos/{id}`

| | |
|---|---|
| Permissão | `VENDAS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `PUT /api/vendas/pedidos/{id}`

| | |
|---|---|
| Permissão | `VENDAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  dataPrevisaoEntrega?: date-time | null
  tipo?: Erp.Domain.Vendas.TipoPedidoVenda
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/vendas/pedidos/{id}/aprovar`

| | |
|---|---|
| Permissão | `VENDAS_APROVAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  reservarEstoque?: boolean
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/vendas/pedidos/{id}/cancelar`

| | |
|---|---|
| Permissão | `VENDAS_CANCELAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/vendas/pedidos/{id}/enviar-para-aprovacao`

| | |
|---|---|
| Permissão | `VENDAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/vendas/pedidos/{id}/faturar`

| | |
|---|---|
| Permissão | `VENDAS_FATURAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  baixarEstoque?: boolean
  documento?: string | null
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/vendas/pedidos/{id}/itens`

| | |
|---|---|
| Permissão | `VENDAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  produtoId?: uuid
  localEstoqueId?: uuid | null
  quantidade?: number
  valorUnitario?: number
  valorDesconto?: number
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `PUT /api/vendas/pedidos/{id}/itens/{itemId}`

| | |
|---|---|
| Permissão | `VENDAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  localEstoqueId?: uuid | null
  quantidade?: number
  valorUnitario?: number
  valorDesconto?: number
  observacao?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/vendas/pedidos/{id}/itens/{itemId}/remover`

| | |
|---|---|
| Permissão | `VENDAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


## PeriodosContabeis — 4/4 consumidos pelo frontend

### `GET /api/contabil/periodos`

| | |
|---|---|
| Permissão | `CONTABIL_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` |


### `POST /api/contabil/periodos`

| | |
|---|---|
| Permissão | `CONTABIL_PERIODOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PeriodoContabilResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  ano?: integer
  mes?: integer
}
```

**Response** (C#, `PeriodoContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  int Ano
  int Mes
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  StatusPeriodoContabil StatusPeriodo
  DateTimeOffset? FechadoEm
}
```


### `POST /api/contabil/periodos/{id}/fechar`

| | |
|---|---|
| Permissão | `CONTABIL_PERIODOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PeriodoContabilResponse` |

**Request**
```ts
{
  observacao?: string | null
}
```

**Response** (C#, `PeriodoContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  int Ano
  int Mes
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  StatusPeriodoContabil StatusPeriodo
  DateTimeOffset? FechadoEm
}
```


### `POST /api/contabil/periodos/{id}/reabrir`

| | |
|---|---|
| Permissão | `CONTABIL_PERIODOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PeriodoContabilResponse` |

**Response** (C#, `PeriodoContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  int Ano
  int Mes
  DateTimeOffset DataInicio
  DateTimeOffset DataFim
  StatusPeriodoContabil StatusPeriodo
  DateTimeOffset? FechadoEm
}
```


## Permissoes — 0/1 consumidos pelo frontend

### `GET /api/seguranca/permissoes`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_CONSULTAR` |
| Frontend | ❌ **não consome** |


## PermissoesCatalogo — 0/1 consumidos pelo frontend

### `GET /api/seguranca/permissoes/catalogo`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_CONSULTAR` |
| Frontend | ❌ **não consome** |


## Pessoas — 4/19 consumidos pelo frontend

### `GET /api/pessoas`

| | |
|---|---|
| Permissão | `PESSOAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/pessoas`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PessoaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  tipoPessoa?: Erp.Domain.Pessoas.TipoPessoa
  nomeRazaoSocial?: string | null
  nomeFantasia?: string | null
  documento?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  observacao?: string | null
}
```

**Response** (C#, `PessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoPessoa TipoPessoa
  string NomeRazaoSocial
  string? NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  IndicadorContribuinteIcms? IndicadorContribuinteIcms
  IndicadorIeDestinatario? IndicadorIeDestinatario
  string? InscricaoEstadualSt
  string? Suframa
  RegimeTributario? RegimeTributarioParceiro
  Guid? MunicipioIbgeId
  Guid? PaisId
  string? Observacao
  bool Bloqueada
  string? MotivoBloqueio
  EntityStatus Status
  bool? ContribuinteIpi
  bool? TomadorOrgaoPublico
}
```


### `PUT /api/pessoas/{id}`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PessoaResponse` |

**Request**
```ts
{
  nomeRazaoSocial?: string | null
  nomeFantasia?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  observacao?: string | null
}
```

**Response** (C#, `PessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoPessoa TipoPessoa
  string NomeRazaoSocial
  string? NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  IndicadorContribuinteIcms? IndicadorContribuinteIcms
  IndicadorIeDestinatario? IndicadorIeDestinatario
  string? InscricaoEstadualSt
  string? Suframa
  RegimeTributario? RegimeTributarioParceiro
  Guid? MunicipioIbgeId
  Guid? PaisId
  string? Observacao
  bool Bloqueada
  string? MotivoBloqueio
  EntityStatus Status
  bool? ContribuinteIpi
  bool? TomadorOrgaoPublico
}
```


### `POST /api/pessoas/{id}/bloquear`

| | |
|---|---|
| Permissão | `PESSOAS_BLOQUEAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `PessoaResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `PessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoPessoa TipoPessoa
  string NomeRazaoSocial
  string? NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  IndicadorContribuinteIcms? IndicadorContribuinteIcms
  IndicadorIeDestinatario? IndicadorIeDestinatario
  string? InscricaoEstadualSt
  string? Suframa
  RegimeTributario? RegimeTributarioParceiro
  Guid? MunicipioIbgeId
  Guid? PaisId
  string? Observacao
  bool Bloqueada
  string? MotivoBloqueio
  EntityStatus Status
  bool? ContribuinteIpi
  bool? TomadorOrgaoPublico
}
```


### `GET /api/pessoas/{id}/contatos`

| | |
|---|---|
| Permissão | `PESSOAS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IReadOnlyList<ContatoPessoaResponse>` |

**Response** (C#, `IReadOnlyList<ContatoPessoaResponse>`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoContato Tipo
  string Valor
  string? Nome
  bool Principal
  EntityStatus Status
}
```


### `POST /api/pessoas/{id}/contatos`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContatoPessoaResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Pessoas.TipoContato
  valor?: string | null
  nome?: string | null
  principal?: boolean
}
```

**Response** (C#, `ContatoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoContato Tipo
  string Valor
  string? Nome
  bool Principal
  EntityStatus Status
}
```


### `DELETE /api/pessoas/{id}/contatos/{contatoId}`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `(sem corpo)` |


### `PUT /api/pessoas/{id}/contatos/{contatoId}`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContatoPessoaResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Pessoas.TipoContato
  valor?: string | null
  nome?: string | null
  principal?: boolean
}
```

**Response** (C#, `ContatoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoContato Tipo
  string Valor
  string? Nome
  bool Principal
  EntityStatus Status
}
```


### `POST /api/pessoas/{id}/contatos/{contatoId}/principal`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContatoPessoaResponse` |

**Response** (C#, `ContatoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoContato Tipo
  string Valor
  string? Nome
  bool Principal
  EntityStatus Status
}
```


### `PATCH /api/pessoas/{id}/dados-fiscais`

| | |
|---|---|
| Permissão | `PESSOAS_DADOS_FISCAIS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `PessoaResponse` |

**Request**
```ts
{
  indicadorContribuinteIcms?: Erp.Domain.Pessoas.IndicadorContribuinteIcms
  inscricaoEstadualSt?: string | null
  suframa?: string | null
  regimeTributarioParceiro?: Erp.Domain.Administration.RegimeTributario
  municipioIbgeCodigo?: string | null
  paisCodigoBacen?: string | null
  contribuinteIpi?: boolean | null
  tomadorOrgaoPublico?: boolean | null
}
```

**Response** (C#, `PessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoPessoa TipoPessoa
  string NomeRazaoSocial
  string? NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  IndicadorContribuinteIcms? IndicadorContribuinteIcms
  IndicadorIeDestinatario? IndicadorIeDestinatario
  string? InscricaoEstadualSt
  string? Suframa
  RegimeTributario? RegimeTributarioParceiro
  Guid? MunicipioIbgeId
  Guid? PaisId
  string? Observacao
  bool Bloqueada
  string? MotivoBloqueio
  EntityStatus Status
  bool? ContribuinteIpi
  bool? TomadorOrgaoPublico
}
```


### `POST /api/pessoas/{id}/desbloquear`

| | |
|---|---|
| Permissão | `PESSOAS_BLOQUEAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `PessoaResponse` |

**Response** (C#, `PessoaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  TipoPessoa TipoPessoa
  string NomeRazaoSocial
  string? NomeFantasia
  string Documento
  string? InscricaoEstadual
  string? InscricaoMunicipal
  IndicadorContribuinteIcms? IndicadorContribuinteIcms
  IndicadorIeDestinatario? IndicadorIeDestinatario
  string? InscricaoEstadualSt
  string? Suframa
  RegimeTributario? RegimeTributarioParceiro
  Guid? MunicipioIbgeId
  Guid? PaisId
  string? Observacao
  bool Bloqueada
  string? MotivoBloqueio
  EntityStatus Status
  bool? ContribuinteIpi
  bool? TomadorOrgaoPublico
}
```


### `GET /api/pessoas/{id}/enderecos`

| | |
|---|---|
| Permissão | `PESSOAS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `IReadOnlyList<EnderecoPessoaResponse>` |

**Response** (C#, `IReadOnlyList<EnderecoPessoaResponse>`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoEndereco Tipo
  string Logradouro
  string Numero
  string? Complemento
  string Bairro
  string Cidade
  string Uf
  string Cep
  bool Principal
  EntityStatus Status
  Guid? MunicipioIbgeId
}
```


### `POST /api/pessoas/{id}/enderecos`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EnderecoPessoaResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Pessoas.TipoEndereco
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  principal?: boolean
}
```

**Response** (C#, `EnderecoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoEndereco Tipo
  string Logradouro
  string Numero
  string? Complemento
  string Bairro
  string Cidade
  string Uf
  string Cep
  bool Principal
  EntityStatus Status
  Guid? MunicipioIbgeId
}
```


### `DELETE /api/pessoas/{id}/enderecos/{enderecoId}`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `(sem corpo)` |


### `PUT /api/pessoas/{id}/enderecos/{enderecoId}`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EnderecoPessoaResponse` |

**Request**
```ts
{
  tipo?: Erp.Domain.Pessoas.TipoEndereco
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  principal?: boolean
}
```

**Response** (C#, `EnderecoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoEndereco Tipo
  string Logradouro
  string Numero
  string? Complemento
  string Bairro
  string Cidade
  string Uf
  string Cep
  bool Principal
  EntityStatus Status
  Guid? MunicipioIbgeId
}
```


### `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio`

| | |
|---|---|
| Permissão | `PESSOAS_DADOS_FISCAIS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EnderecoPessoaResponse` |

**Request**
```ts
{
  municipioIbgeCodigo?: string | null
}
```

**Response** (C#, `EnderecoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoEndereco Tipo
  string Logradouro
  string Numero
  string? Complemento
  string Bairro
  string Cidade
  string Uf
  string Cep
  bool Principal
  EntityStatus Status
  Guid? MunicipioIbgeId
}
```


### `POST /api/pessoas/{id}/enderecos/{enderecoId}/principal`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `EnderecoPessoaResponse` |

**Response** (C#, `EnderecoPessoaResponse`)
```csharp
{
  Guid Id
  Guid PessoaId
  TipoEndereco Tipo
  string Logradouro
  string Numero
  string? Complemento
  string Bairro
  string Cidade
  string Uf
  string Cep
  bool Principal
  EntityStatus Status
  Guid? MunicipioIbgeId
}
```


### `POST /api/pessoas/{id}/inativar`

| | |
|---|---|
| Permissão | `PESSOAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/pessoas/enderecos/backfill-municipios`

| | |
|---|---|
| Permissão | `PESSOAS_DADOS_FISCAIS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `BackfillMunicipiosEnderecosPessoaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
}
```

**Response** (C#, `BackfillMunicipiosEnderecosPessoaResponse`)
```csharp
{
  int Analisados
  int Vinculados
  IReadOnlyList<DivergenciaMunicipioEnderecoResponse> Divergencias
}
```


## PlanoContas — 3/4 consumidos pelo frontend

### `GET /api/contabil/plano-contas`

| | |
|---|---|
| Permissão | `CONTABIL_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `tipo?` `status?` `termo?` |


### `POST /api/contabil/plano-contas`

| | |
|---|---|
| Permissão | `CONTABIL_PLANO_CONTAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaContabilResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  nome?: string | null
  tipo?: Erp.Domain.Contabil.TipoContaContabil
  natureza?: Erp.Domain.Contabil.NaturezaContaContabil
  analitica?: boolean
  contaPaiId?: uuid | null
}
```

**Response** (C#, `ContaContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoContaContabil Tipo
  NaturezaContaContabil Natureza
  bool Analitica
  Guid? ContaPaiId
  StatusContaContabil StatusConta
}
```


### `GET /api/contabil/plano-contas/{id}`

| | |
|---|---|
| Permissão | `CONTABIL_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ContaContabilResponse` |

**Response** (C#, `ContaContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoContaContabil Tipo
  NaturezaContaContabil Natureza
  bool Analitica
  Guid? ContaPaiId
  StatusContaContabil StatusConta
}
```


### `POST /api/contabil/plano-contas/{id}/inativar`

| | |
|---|---|
| Permissão | `CONTABIL_PLANO_CONTAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ContaContabilResponse` |

**Response** (C#, `ContaContabilResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Nome
  TipoContaContabil Tipo
  NaturezaContaContabil Natureza
  bool Analitica
  Guid? ContaPaiId
  StatusContaContabil StatusConta
}
```


## Ponto — 2/2 consumidos pelo frontend

### `GET /api/rh/ponto`

| | |
|---|---|
| Permissão | `RH_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `colaboradorId?` `de?` `ate?` |


### `POST /api/rh/ponto`

| | |
|---|---|
| Permissão | `RH_PONTO_REGISTRAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroPontoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  colaboradorId?: uuid
  dataHora?: date-time | null
  tipo?: Erp.Domain.Rh.TipoMarcacaoPonto
  origem?: Erp.Domain.Rh.OrigemPonto
  observacao?: string | null
}
```

**Response** (C#, `RegistroPontoResponse`)
```csharp
{
  Guid Id
  Guid ColaboradorId
  DateTimeOffset DataHora
  TipoMarcacaoPonto Tipo
  OrigemPonto Origem
  string? Observacao
}
```


## Portaria — 12/13 consumidos pelo frontend

### `GET /api/portaria/ocorrencias`

| | |
|---|---|
| Permissão | `PORTARIA_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<FaturamentoOcorrenciaResponse>` |
| Query | `empresaId?` `filialId?` `registroAcessoId?` `status?` |

**Response** (C#, `IReadOnlyCollection<FaturamentoOcorrenciaResponse>`)
```csharp
{
  Guid Id
  TipoOcorrenciaFaturamento Tipo
  string Mensagem
  DateTimeOffset Data
}
```


### `POST /api/portaria/ocorrencias`

| | |
|---|---|
| Permissão | `PORTARIA_OPERAR` |
| Frontend | ✅ consome |
| Response DTO | `OcorrenciaAcessoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  registroAcessoId?: uuid | null
  tipo?: Erp.Domain.Portaria.TipoOcorrenciaAcesso
  gravidade?: Erp.Domain.Portaria.GravidadeOcorrencia
  descricao?: string | null
  dataOcorrencia?: date-time | null
}
```

**Response** (C#, `OcorrenciaAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? RegistroAcessoId
  TipoOcorrenciaAcesso Tipo
  GravidadeOcorrencia Gravidade
  string Descricao
  DateTimeOffset DataOcorrencia
  StatusOcorrenciaAcesso StatusOcorrenciaAcesso
  string? Resolucao
  DateTimeOffset? DataResolucao
}
```


### `POST /api/portaria/ocorrencias/{id}/resolver`

| | |
|---|---|
| Permissão | `PORTARIA_OPERAR` |
| Frontend | ✅ consome |
| Response DTO | `OcorrenciaAcessoResponse` |

**Request**
```ts
{
  resolucao?: string | null
}
```

**Response** (C#, `OcorrenciaAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? RegistroAcessoId
  TipoOcorrenciaAcesso Tipo
  GravidadeOcorrencia Gravidade
  string Descricao
  DateTimeOffset DataOcorrencia
  StatusOcorrenciaAcesso StatusOcorrenciaAcesso
  string? Resolucao
  DateTimeOffset? DataResolucao
}
```


### `GET /api/portaria/pre-autorizacoes`

| | |
|---|---|
| Permissão | `PORTARIA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `termo?` |


### `POST /api/portaria/pre-autorizacoes`

| | |
|---|---|
| Permissão | `PORTARIA_PREAUTORIZAR` |
| Frontend | ✅ consome |
| Response DTO | `PreAutorizacaoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nomeVisitante?: string | null
  documentoTipo?: Erp.Domain.Portaria.TipoDocumentoAcesso
  documentoNumero?: string | null
  tipoAcesso?: Erp.Domain.Portaria.TipoAcesso
  destino?: string | null
  motivo?: string | null
  placaVeiculo?: string | null
  autorizante?: string | null
  validadeInicio?: date-time
  validadeFim?: date-time
}
```

**Response** (C#, `PreAutorizacaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  string? Autorizante
  DateTimeOffset ValidadeInicio
  DateTimeOffset ValidadeFim
  StatusPreAutorizacao StatusPreAutorizacao
  bool Expirada
}
```


### `GET /api/portaria/pre-autorizacoes/{id}`

| | |
|---|---|
| Permissão | `PORTARIA_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `PreAutorizacaoResponse` |

**Response** (C#, `PreAutorizacaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  string? Autorizante
  DateTimeOffset ValidadeInicio
  DateTimeOffset ValidadeFim
  StatusPreAutorizacao StatusPreAutorizacao
  bool Expirada
}
```


### `POST /api/portaria/pre-autorizacoes/{id}/cancelar`

| | |
|---|---|
| Permissão | `PORTARIA_PREAUTORIZAR` |
| Frontend | ✅ consome |
| Response DTO | `PreAutorizacaoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `PreAutorizacaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  string? Autorizante
  DateTimeOffset ValidadeInicio
  DateTimeOffset ValidadeFim
  StatusPreAutorizacao StatusPreAutorizacao
  bool Expirada
}
```


### `GET /api/portaria/registros`

| | |
|---|---|
| Permissão | `PORTARIA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `termo?` |


### `GET /api/portaria/registros/{id}`

| | |
|---|---|
| Permissão | `PORTARIA_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


### `POST /api/portaria/registros/{id}/cancelar`

| | |
|---|---|
| Permissão | `PORTARIA_OPERAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


### `POST /api/portaria/registros/{id}/saida`

| | |
|---|---|
| Permissão | `PORTARIA_OPERAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Request**
```ts
{
  dataSaida?: date-time | null
  observacao?: string | null
}
```

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


### `POST /api/portaria/registros/{id}/validar-documento`

| | |
|---|---|
| Permissão | `PORTARIA_OPERAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Request**
```ts
{
  aprovado?: boolean
  validadoPor?: string | null
  observacao?: string | null
}
```

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


### `POST /api/portaria/registros/entrada`

| | |
|---|---|
| Permissão | `PORTARIA_OPERAR` |
| Frontend | ✅ consome |
| Response DTO | `RegistroAcessoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  preAutorizacaoId?: uuid | null
  nomeVisitante?: string | null
  documentoTipo?: Erp.Domain.Portaria.TipoDocumentoAcesso
  documentoNumero?: string | null
  tipoAcesso?: Erp.Domain.Portaria.TipoAcesso
  destino?: string | null
  motivo?: string | null
  placaVeiculo?: string | null
  dataEntrada?: date-time | null
}
```

**Response** (C#, `RegistroAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? PreAutorizacaoId
  string NomeVisitante
  TipoDocumentoAcesso DocumentoTipo
  string DocumentoNumero
  TipoAcesso TipoAcesso
  string Destino
  string? Motivo
  string? PlacaVeiculo
  DateTimeOffset DataEntrada
  bool DocumentoValidado
  DateTimeOffset? DataValidacaoDocumento
  string? ValidadoPor
  string? ObservacaoValidacao
  DateTimeOffset? DataSaida
  int? PermanenciaMinutos
  string? ObservacaoSaida
  StatusRegistroAcesso StatusRegistroAcesso
}
```


## Produtos — 9/9 consumidos pelo frontend

### `GET /api/produtos`

| | |
|---|---|
| Permissão | `PRODUTOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/produtos`

| | |
|---|---|
| Permissão | `PRODUTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  codigo?: string | null
  descricao?: string | null
  descricaoComercial?: string | null
  tipoProduto?: Erp.Domain.Produtos.TipoProduto
  unidadeMedidaId?: uuid
  categoriaProdutoId?: uuid | null
  marcaId?: uuid | null
  precoVendaBase?: number
  custoReferencial?: number
  controlaEstoque?: boolean
  permiteVenda?: boolean
  permiteCompra?: boolean
  controlaQualidade?: boolean
  observacao?: string | null
}
```

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


### `GET /api/produtos/{id}`

| | |
|---|---|
| Permissão | `PRODUTOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


### `PUT /api/produtos/{id}`

| | |
|---|---|
| Permissão | `PRODUTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Request**
```ts
{
  descricao?: string | null
  descricaoComercial?: string | null
  tipoProduto?: Erp.Domain.Produtos.TipoProduto
  unidadeMedidaId?: uuid
  categoriaProdutoId?: uuid | null
  marcaId?: uuid | null
  controlaEstoque?: boolean
  permiteVenda?: boolean
  permiteCompra?: boolean
  controlaQualidade?: boolean
  observacao?: string | null
}
```

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


### `POST /api/produtos/{id}/codigos-barras`

| | |
|---|---|
| Permissão | `PRODUTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Request**
```ts
{
  codigo?: string | null
  descricao?: string | null
  principal?: boolean
}
```

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


### `PATCH /api/produtos/{id}/dados-fiscais`

| | |
|---|---|
| Permissão | `PRODUTOS_DADOS_FISCAIS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Request**
```ts
{
  ncmCodigo?: string | null
  cestCodigo?: string | null
  origemMercadoriaCodigo?: string | null
  tipoItemSped?: Erp.Domain.Produtos.TipoItemSped
  unidadeTributavelSigla?: string | null
  unidadeMedidaTributavelId?: uuid | null
  exTipi?: string | null
  codigoBeneficioFiscalPadrao?: string | null
  tipoItemFiscal?: Erp.Domain.Produtos.TipoItemFiscal
  codigoFiscalExterno?: string | null
}
```

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


### `POST /api/produtos/{id}/fornecedores`

| | |
|---|---|
| Permissão | `PRODUTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Request**
```ts
{
  fornecedorId?: uuid
  codigoFornecedor?: string | null
  descricaoFornecedor?: string | null
  principal?: boolean
}
```

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


### `POST /api/produtos/{id}/inativar`

| | |
|---|---|
| Permissão | `PRODUTOS_INATIVAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `PATCH /api/produtos/{id}/preco-custo`

| | |
|---|---|
| Permissão | `PRODUTOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ProdutoResponse` |

**Request**
```ts
{
  precoVendaBase?: number
  custoReferencial?: number
}
```

**Response** (C#, `ProdutoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Codigo
  string Descricao
  string? DescricaoComercial
  TipoProduto TipoProduto
  Guid UnidadeMedidaId
  Guid? CategoriaProdutoId
  Guid? MarcaId
  decimal PrecoVendaBase
  decimal CustoReferencial
  bool ControlaEstoque
  bool PermiteVenda
  bool PermiteCompra
  bool ControlaQualidade
  Guid? NcmId
  string? Ncm
  Guid? CestId
  string? Cest
  Guid? OrigemMercadoriaId
  string? OrigemMercadoriaCodigo
  TipoItemSped? TipoItemSped
  TipoItemFiscal? TipoItemFiscal
  Guid? UnidadeTributavelOficialId
  string? UnidadeTributavelSigla
  Guid? UnidadeMedidaTributavelId
  string? GeneroItem
  string? ExTipi
  string? CodigoBeneficioFiscalPadrao
  string? CodigoFiscalExterno
  string? Observacao
  EntityStatus Status
  IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras
  IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores
}
```


## Propostas — 4/5 consumidos pelo frontend

### `GET /api/crm/propostas`

| | |
|---|---|
| Permissão | `CRM_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `oportunidadeId?` |


### `POST /api/crm/propostas`

| | |
|---|---|
| Permissão | `CRM_PROPOSTAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PropostaResponse` |

**Request**
```ts
{
  oportunidadeId?: uuid
  dataValidade?: date-time | null
  observacao?: string | null
  itens?: Erp.Application.Crm.Propostas.ItemPropostaRequest[] | null
}
```

**Response** (C#, `PropostaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid OportunidadeId
  int Numero
  DateTimeOffset? DataValidade
  string? Observacao
  StatusProposta StatusProposta
  decimal ValorTotal
  IReadOnlyList<ItemPropostaResponse> Itens
}
```


### `GET /api/crm/propostas/{id}`

| | |
|---|---|
| Permissão | `CRM_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `PropostaResponse` |

**Response** (C#, `PropostaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid OportunidadeId
  int Numero
  DateTimeOffset? DataValidade
  string? Observacao
  StatusProposta StatusProposta
  decimal ValorTotal
  IReadOnlyList<ItemPropostaResponse> Itens
}
```


### `POST /api/crm/propostas/{id}/aceitar`

| | |
|---|---|
| Permissão | `CRM_PROPOSTAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PropostaResponse` |

**Response** (C#, `PropostaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid OportunidadeId
  int Numero
  DateTimeOffset? DataValidade
  string? Observacao
  StatusProposta StatusProposta
  decimal ValorTotal
  IReadOnlyList<ItemPropostaResponse> Itens
}
```


### `POST /api/crm/propostas/{id}/recusar`

| | |
|---|---|
| Permissão | `CRM_PROPOSTAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PropostaResponse` |

**Response** (C#, `PropostaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid OportunidadeId
  int Numero
  DateTimeOffset? DataValidade
  string? Observacao
  StatusProposta StatusProposta
  decimal ValorTotal
  IReadOnlyList<ItemPropostaResponse> Itens
}
```


## Recalls — 6/7 consumidos pelo frontend

### `GET /api/alimentar/recalls`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` |


### `POST /api/alimentar/recalls`

| | |
|---|---|
| Permissão | `ALIMENTAR_RECALL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RecallResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  produtoId?: uuid | null
  codigo?: string | null
  motivo?: string | null
  descricao?: string | null
  gravidade?: Erp.Domain.Alimentar.GravidadeRecall
  dataAbertura?: date-time | null
}
```

**Response** (C#, `RecallResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? ProdutoId
  string Codigo
  string Motivo
  string? Descricao
  GravidadeRecall Gravidade
  DateTimeOffset DataAbertura
  DateTimeOffset? DataEncerramento
  StatusRecall StatusRecall
}
```


### `GET /api/alimentar/recalls/{id}`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `RecallResponse` |

**Response** (C#, `RecallResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? ProdutoId
  string Codigo
  string Motivo
  string? Descricao
  GravidadeRecall Gravidade
  DateTimeOffset DataAbertura
  DateTimeOffset? DataEncerramento
  StatusRecall StatusRecall
}
```


### `POST /api/alimentar/recalls/{id}/cancelar`

| | |
|---|---|
| Permissão | `ALIMENTAR_RECALL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RecallResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `RecallResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? ProdutoId
  string Codigo
  string Motivo
  string? Descricao
  GravidadeRecall Gravidade
  DateTimeOffset DataAbertura
  DateTimeOffset? DataEncerramento
  StatusRecall StatusRecall
}
```


### `POST /api/alimentar/recalls/{id}/encerrar`

| | |
|---|---|
| Permissão | `ALIMENTAR_RECALL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RecallResponse` |

**Response** (C#, `RecallResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? ProdutoId
  string Codigo
  string Motivo
  string? Descricao
  GravidadeRecall Gravidade
  DateTimeOffset DataAbertura
  DateTimeOffset? DataEncerramento
  StatusRecall StatusRecall
}
```


### `GET /api/alimentar/recalls/{id}/lotes`

| | |
|---|---|
| Permissão | `ALIMENTAR_CONSULTAR` |
| Frontend | ✅ consome |


### `POST /api/alimentar/recalls/{id}/lotes`

| | |
|---|---|
| Permissão | `ALIMENTAR_RECALL_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RecallLoteResponse` |

**Request**
```ts
{
  loteId?: uuid
}
```

**Response** (C#, `RecallLoteResponse`)
```csharp
{
  Guid Id
  Guid RecallId
  Guid LoteId
  decimal QuantidadeAfetada
  Guid? BloqueioEstoqueId
  string? AcaoTomada
}
```


## RecebimentosCompra — 3/3 consumidos pelo frontend

### `GET /api/compras/recebimentos/{id}`

| | |
|---|---|
| Permissão | `COMPRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RecebimentoCompraDetalheResponse` |

**Response** (C#, `RecebimentoCompraDetalheResponse`)
```csharp
{
  Guid Id
  Guid PedidoCompraId
  string Documento
  DateTimeOffset DataRecebimento
  decimal ValorTotalRecebido
  string? Observacao
  IReadOnlyList<ItemRecebimentoCompraResponse> Itens
  IReadOnlyList<RecebimentoDivergenciaResponse> Divergencias
  ConferenciaFiscalEntradaResponse? ConferenciaFiscal
}
```


### `POST /api/compras/recebimentos/{id}/conferencia-fiscal`

| | |
|---|---|
| Permissão | `COMPRAS_CONFERENCIA_FISCAL_REGISTRAR` |
| Frontend | ✅ consome |
| Response DTO | `ConferenciaFiscalEntradaResponse` |

**Request**
```ts
{
  chaveAcesso?: string | null
  serie?: string | null
  numero?: string | null
  cnpjEmitente?: string | null
  dataEmissaoNota?: date-time
  valorTotalNota?: number
  observacao?: string | null
  arquivoXml?: byte | null
  nomeArquivoXml?: string | null
  arquivoPdf?: byte | null
  nomeArquivoPdf?: string | null
}
```

**Response** (C#, `ConferenciaFiscalEntradaResponse`)
```csharp
{
  Guid Id
  Guid RecebimentoCompraId
  string? ChaveAcesso
  string Serie
  string Numero
  string CnpjEmitente
  DateTimeOffset DataEmissaoNota
  decimal ValorTotalNota
  StatusConferenciaFiscalEntrada StatusConferencia
  DateTimeOffset RegistradaEm
  string? Observacao
}
```


### `GET /api/compras/recebimentos/divergencias`

| | |
|---|---|
| Permissão | `COMPRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `pedidoCompraId?` `recebimentoCompraId?` |


## RegrasContabilizacao — 3/3 consumidos pelo frontend

### `GET /api/contabil/regras`

| | |
|---|---|
| Permissão | `CONTABIL_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` |


### `POST /api/contabil/regras`

| | |
|---|---|
| Permissão | `CONTABIL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RegraContabilizacaoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  descricao?: string | null
  tipoEvento?: Erp.Domain.Contabil.TipoEventoContabil
  origemFinanceira?: Erp.Domain.Financeiro.OrigemFinanceira
  contaDebitoId?: uuid
  contaCreditoId?: uuid
}
```

**Response** (C#, `RegraContabilizacaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  TipoEventoContabil TipoEvento
  OrigemFinanceira? OrigemFinanceira
  Guid ContaDebitoId
  Guid ContaCreditoId
  StatusRegraContabilizacao StatusRegra
}
```


### `POST /api/contabil/regras/{id}/inativar`

| | |
|---|---|
| Permissão | `CONTABIL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `RegraContabilizacaoResponse` |

**Response** (C#, `RegraContabilizacaoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Descricao
  TipoEventoContabil TipoEvento
  OrigemFinanceira? OrigemFinanceira
  Guid ContaDebitoId
  Guid ContaCreditoId
  StatusRegraContabilizacao StatusRegra
}
```


## RegrasFiscais — 5/5 consumidos pelo frontend

### `GET /api/fiscal/regras`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `tipoOperacao?` `ufDestino?` `ncmId?` `cfopId?` `somenteAtivas?` `termo?` `pagina?` `tamanhoPagina?` |


### `POST /api/fiscal/regras`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  descricao?: string | null
  tipoOperacao?: Erp.Domain.Fiscal.Cadastros.TipoCfop
  ufOrigem?: string | null
  ufDestino?: string | null
  regimeEmpresa?: Erp.Domain.Administration.RegimeTributario
  indicadorContribuinte?: Erp.Domain.Pessoas.IndicadorContribuinteIcms
  consumidorFinal?: boolean | null
  ncmId?: uuid | null
  grupoProdutoId?: uuid | null
  cfopId?: uuid | null
  prioridade?: integer
  vigenciaInicio?: date
  vigenciaFim?: date | null
  icms?: Erp.Application.Fiscal.Tributacao.Regras.RegraIcmsRequest
  ipi?: Erp.Application.Fiscal.Tributacao.Regras.RegraIpiRequest
  pisCofins?: Erp.Application.Fiscal.Tributacao.Regras.RegraPisCofinsRequest
  iss?: Erp.Application.Fiscal.Tributacao.Regras.RegraIssRequest
  retencao?: Erp.Application.Fiscal.Tributacao.Regras.RegraRetencaoRequest
}
```


### `GET /api/fiscal/regras/{id}`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |


### `PUT /api/fiscal/regras/{id}`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  descricao?: string | null
  tipoOperacao?: Erp.Domain.Fiscal.Cadastros.TipoCfop
  ufOrigem?: string | null
  ufDestino?: string | null
  regimeEmpresa?: Erp.Domain.Administration.RegimeTributario
  indicadorContribuinte?: Erp.Domain.Pessoas.IndicadorContribuinteIcms
  consumidorFinal?: boolean | null
  ncmId?: uuid | null
  grupoProdutoId?: uuid | null
  cfopId?: uuid | null
  prioridade?: integer
  vigenciaInicio?: date
  vigenciaFim?: date | null
  icms?: Erp.Application.Fiscal.Tributacao.Regras.RegraIcmsRequest
  ipi?: Erp.Application.Fiscal.Tributacao.Regras.RegraIpiRequest
  pisCofins?: Erp.Application.Fiscal.Tributacao.Regras.RegraPisCofinsRequest
  iss?: Erp.Application.Fiscal.Tributacao.Regras.RegraIssRequest
  retencao?: Erp.Application.Fiscal.Tributacao.Regras.RegraRetencaoRequest
}
```


### `POST /api/fiscal/regras/{id}/inativar`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_GERENCIAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  motivo?: string | null
}
```


## RelatoriosGerenciais — 8/8 consumidos pelo frontend

### `GET /api/relatorios/gerenciais/compras`

| | |
|---|---|
| Permissão | `RELATORIOS_COMPRAS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioComprasGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioComprasGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  long TotalPedidos
  long TotalItens
  long TotalFornecedoresComPedido
  long RecebimentosRegistrados
  long PedidosComFinanceiroGerado
}
```


### `GET /api/relatorios/gerenciais/dashboard`

| | |
|---|---|
| Permissão | `RELATORIOS_DASHBOARD_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `DashboardGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `DashboardGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  RelatorioVendasGerencialResponse Vendas
  RelatorioComprasGerencialResponse Compras
  RelatorioFinanceiroGerencialResponse Financeiro
  RelatorioEstoqueGerencialResponse Estoque
  RelatorioFiscalGerencialResponse Fiscal
  RelatorioProducaoGerencialResponse Producao
}
```


### `GET /api/relatorios/gerenciais/estoque`

| | |
|---|---|
| Permissão | `RELATORIOS_ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioEstoqueGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioEstoqueGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  long InventariosAbertos
  long InventariosEmContagem
  long InventariosConcluidos
  long InventariosCancelados
  long AjustesEntrada
  long AjustesSaida
  decimal QuantidadeEntradaAjustada
  decimal QuantidadeSaidaAjustada
  long BloqueiosAtivos
  long BloqueiosLiberados
  long MovimentosRegistrados
}
```


### `GET /api/relatorios/gerenciais/exportar`

| | |
|---|---|
| Permissão | `RELATORIOS_EXPORTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioExportacao` |
| Query | `indicador?` `formato?` `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioExportacao`)
```csharp
{
  byte[] Conteudo
  string ContentType
  string NomeArquivo
}
```


### `GET /api/relatorios/gerenciais/financeiro`

| | |
|---|---|
| Permissão | `RELATORIOS_FINANCEIRO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioFinanceiroGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioFinanceiroGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  long ContasReceber
  long ContasPagar
  decimal ValorReceberOriginal
  decimal ValorPagarOriginal
  decimal SaldoReceberEmAberto
  decimal SaldoPagarEmAberto
  decimal EntradasRealizadas
  decimal SaidasRealizadas
  decimal SaldoProjetado
  decimal SaldoRealizado
}
```


### `GET /api/relatorios/gerenciais/fiscal`

| | |
|---|---|
| Permissão | `RELATORIOS_FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioFiscalGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioFiscalGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  long NotasRegistradas
  long ItensRegistrados
  long EventosRegistrados
  long CartasCorrecaoRegistradas
  long CancelamentosRegistrados
  long InutilizacoesRegistradas
  long XmlsArmazenados
}
```


### `GET /api/relatorios/gerenciais/producao`

| | |
|---|---|
| Permissão | `RELATORIOS_PRODUCAO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioProducaoGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioProducaoGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  long OrdensPlanejadas
  long OrdensLiberadas
  long OrdensEmProducao
  long OrdensEncerradas
  long OrdensCanceladas
  decimal QuantidadePlanejada
  decimal QuantidadeProduzida
  decimal QuantidadePerdas
  decimal CustoConsolidado
}
```


### `GET /api/relatorios/gerenciais/vendas`

| | |
|---|---|
| Permissão | `RELATORIOS_VENDAS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioVendasGerencialResponse` |
| Query | `empresaId?` `filialId?` `dataInicial?` `dataFinal?` |

**Response** (C#, `RelatorioVendasGerencialResponse`)
```csharp
{
  ContextoRelatorioGerencialResponse Contexto
  PeriodoRelatorioGerencialResponse Periodo
  long TotalPedidos
  long TotalItens
  long TotalClientesComPedido
  long PedidosComFinanceiroGerado
  long PedidosComEstoqueMovimentado
}
```


## RelatoriosOperacionais — 1/1 consumidos pelo frontend

### `GET /api/relatorios/operacional/geral`

| | |
|---|---|
| Permissão | `RELATORIOS_OPERACIONAIS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `RelatorioOperacionalGeralResponse` |
| Query | `empresaId?` `filialId?` `inicio?` `fim?` |

**Response** (C#, `RelatorioOperacionalGeralResponse`)
```csharp
{
  Guid EmpresaId
  Guid? FilialId
  DateTimeOffset? Inicio
  DateTimeOffset? Fim
  DateTimeOffset GeradoEm
  IndicadoresAdministrativosResponse Administracao
  IndicadoresProdutosResponse Produtos
  IndicadoresEstoqueResponse Estoque
  IndicadoresVendasResponse Vendas
  IndicadoresComprasResponse Compras
  IndicadoresFinanceiroResponse Financeiro
  IndicadoresFiscalResponse Fiscal
}
```


## ReservasEstoque — 4/4 consumidos pelo frontend

### `GET /api/estoque/reservas`

| | |
|---|---|
| Permissão | `ESTOQUE_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `produtoId?` `origemId?` |


### `POST /api/estoque/reservas`

| | |
|---|---|
| Permissão | `ESTOQUE_RESERVAR` |
| Frontend | ✅ consome |
| Response DTO | `ReservaEstoqueResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  produtoId?: uuid
  localEstoqueId?: uuid
  quantidade?: number
  origemModulo?: string | null
  origemId?: uuid | null
  observacao?: string | null
}
```

**Response** (C#, `ReservaEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  Guid LocalEstoqueId
  decimal Quantidade
  decimal QuantidadeBaixada
  decimal QuantidadeCancelada
  decimal QuantidadePendente
  StatusReservaEstoque StatusReserva
  string OrigemModulo
  Guid? OrigemId
  string? Observacao
}
```


### `POST /api/estoque/reservas/{id}/baixar`

| | |
|---|---|
| Permissão | `ESTOQUE_RESERVAR` |
| Frontend | ✅ consome |
| Response DTO | `ReservaEstoqueResponse` |

**Request**
```ts
{
  quantidade?: number
  origemModulo?: string | null
  origemId?: uuid | null
  documento?: string | null
  motivo?: string | null
}
```

**Response** (C#, `ReservaEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  Guid LocalEstoqueId
  decimal Quantidade
  decimal QuantidadeBaixada
  decimal QuantidadeCancelada
  decimal QuantidadePendente
  StatusReservaEstoque StatusReserva
  string OrigemModulo
  Guid? OrigemId
  string? Observacao
}
```


### `POST /api/estoque/reservas/{id}/cancelar`

| | |
|---|---|
| Permissão | `ESTOQUE_RESERVAR` |
| Frontend | ✅ consome |
| Response DTO | `ReservaEstoqueResponse` |

**Request**
```ts
{
  quantidade?: number | null
  motivo?: string | null
}
```

**Response** (C#, `ReservaEstoqueResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid ProdutoId
  Guid LocalEstoqueId
  decimal Quantidade
  decimal QuantidadeBaixada
  decimal QuantidadeCancelada
  decimal QuantidadePendente
  StatusReservaEstoque StatusReserva
  string OrigemModulo
  Guid? OrigemId
  string? Observacao
}
```


## Sefaz — 4/4 consumidos pelo frontend

### `POST /api/fiscal/sefaz/contingencia/avaliar`

| | |
|---|---|
| Permissão | `FISCAL_EMITIR` |
| Frontend | ✅ consome |
| Response DTO | `ContingenciaFiscalResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  ufAutorizadora?: string | null
  tipoContingencia?: Erp.Domain.Fiscal.TipoContingenciaFiscal
  motivo?: string | null
  exigirStatusServicoIndisponivelRecente?: boolean
  janelaStatusServicoMinutos?: integer
  correlationId?: string | null
}
```

**Response** (C#, `ContingenciaFiscalResponse`)
```csharp
{
  Guid? NotaFiscalId
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoAmbienteFiscal Ambiente
  string UfAutorizadora
  TipoContingenciaFiscal TipoContingencia
  bool Permitida
  bool StatusServicoIndisponivelDetectado
  string? CodigoStatusServico
  string? MotivoStatusServico
  string MotivoOperacional
  DateTimeOffset AvaliadaEm
  IReadOnlyCollection<string> Alertas
}
```


### `GET /api/fiscal/sefaz/contingencia/historico`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<LogIntegracaoFiscalResponse>` |
| Query | `empresaId?` `filialId?` `take?` |

**Response** (C#, `IReadOnlyCollection<LogIntegracaoFiscalResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? NotaFiscalId
  string Operacao
  StatusIntegracaoFiscal StatusIntegracao
  string? CorrelationId
  string? PayloadResumo
  string? Mensagem
  DateTimeOffset RegistradoEm
  bool PodeReprocessar
  bool ContemDadoSensivelOcultado
}
```


### `POST /api/fiscal/sefaz/status-servico`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `StatusServicoSefazResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  tipoDocumento?: Erp.Domain.Fiscal.TipoDocumentoFiscal
  ufAutorizadora?: string | null
  xmlStatusServico?: string | null
  validarSchemaAntesConsulta?: boolean
  schemaSetName?: string | null
  correlationId?: string | null
}
```

**Response** (C#, `StatusServicoSefazResponse`)
```csharp
{
  Guid EmpresaId
  Guid? FilialId
  TipoDocumentoFiscal TipoDocumento
  TipoAmbienteFiscal Ambiente
  string UfAutorizadora
  bool ComunicacaoOk
  bool Disponivel
  string? CodigoStatus
  string? Motivo
  bool DeveReprocessar
  DateTimeOffset ConsultadoEm
  IReadOnlyCollection<string> Alertas
}
```


### `GET /api/fiscal/sefaz/status-servico/historico`

| | |
|---|---|
| Permissão | `FISCAL_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `IReadOnlyCollection<LogIntegracaoFiscalResponse>` |
| Query | `empresaId?` `filialId?` `take?` |

**Response** (C#, `IReadOnlyCollection<LogIntegracaoFiscalResponse>`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid? NotaFiscalId
  string Operacao
  StatusIntegracaoFiscal StatusIntegracao
  string? CorrelationId
  string? PayloadResumo
  string? Mensagem
  DateTimeOffset RegistradoEm
  bool PodeReprocessar
  bool ContemDadoSensivelOcultado
}
```


## SeriesFiscais — 0/7 consumidos pelo frontend

### `GET /api/fiscal/series`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `modeloDocumentoFiscalId?` `somenteAtivas?` `pagina?` `tamanhoPagina?` |


### `POST /api/fiscal/series`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  modeloDocumentoFiscalId?: uuid
  numero?: integer
  numeroInicial?: integer
  numeroFinal?: integer
  vigenciaInicio?: date
  vigenciaFim?: date | null
}
```


### `GET /api/fiscal/series/{id}`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_CONSULTAR` |
| Frontend | ❌ **não consome** |


### `POST /api/fiscal/series/{id}/ampliar`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  novoNumeroFinal?: integer
}
```


### `GET /api/fiscal/series/{id}/buracos`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_CONSULTAR` |
| Frontend | ❌ **não consome** |


### `POST /api/fiscal/series/{id}/encerrar-vigencia`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  vigenciaFim?: date
}
```


### `POST /api/fiscal/series/{id}/inativar`

| | |
|---|---|
| Permissão | `FISCAL_SERIES_GERENCIAR` |
| Frontend | ❌ **não consome** |

**Request**
```ts
{
  motivo?: string | null
}
```


## Setores — 4/4 consumidos pelo frontend

### `GET /api/administracao/setores`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` |


### `POST /api/administracao/setores`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `SetorResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `SetorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Descricao
  EntityStatus Status
  DateTimeOffset CreatedAt
}
```


### `PUT /api/administracao/setores/{id}`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `SetorResponse` |

**Request**
```ts
{
  nome?: string | null
  descricao?: string | null
}
```

**Response** (C#, `SetorResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  string? Descricao
  EntityStatus Status
  DateTimeOffset CreatedAt
}
```


### `POST /api/administracao/setores/{id}/inativar`

| | |
|---|---|
| Permissão | `ADMINISTRACAO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## SolicitacoesCompra — 6/6 consumidos pelo frontend

### `GET /api/compras/solicitacoes`

| | |
|---|---|
| Permissão | `COMPRAS_SOLICITACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `termo?` |


### `POST /api/compras/solicitacoes`

| | |
|---|---|
| Permissão | `COMPRAS_SOLICITACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `SolicitacaoCompraResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  numero?: string | null
  dataSolicitacao?: date-time
  solicitante?: string | null
  justificativa?: string | null
}
```

**Response** (C#, `SolicitacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset DataSolicitacao
  string Solicitante
  string? Justificativa
  StatusSolicitacaoCompra StatusSolicitacao
  IReadOnlyList<SolicitacaoCompraItemResponse> Itens
}
```


### `GET /api/compras/solicitacoes/{id}`

| | |
|---|---|
| Permissão | `COMPRAS_SOLICITACOES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `SolicitacaoCompraResponse` |

**Response** (C#, `SolicitacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset DataSolicitacao
  string Solicitante
  string? Justificativa
  StatusSolicitacaoCompra StatusSolicitacao
  IReadOnlyList<SolicitacaoCompraItemResponse> Itens
}
```


### `POST /api/compras/solicitacoes/{id}/aprovar`

| | |
|---|---|
| Permissão | `COMPRAS_SOLICITACOES_APROVAR` |
| Frontend | ✅ consome |
| Response DTO | `SolicitacaoCompraResponse` |

**Response** (C#, `SolicitacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset DataSolicitacao
  string Solicitante
  string? Justificativa
  StatusSolicitacaoCompra StatusSolicitacao
  IReadOnlyList<SolicitacaoCompraItemResponse> Itens
}
```


### `POST /api/compras/solicitacoes/{id}/cancelar`

| | |
|---|---|
| Permissão | `COMPRAS_SOLICITACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `SolicitacaoCompraResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `SolicitacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset DataSolicitacao
  string Solicitante
  string? Justificativa
  StatusSolicitacaoCompra StatusSolicitacao
  IReadOnlyList<SolicitacaoCompraItemResponse> Itens
}
```


### `POST /api/compras/solicitacoes/{id}/itens`

| | |
|---|---|
| Permissão | `COMPRAS_SOLICITACOES_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `SolicitacaoCompraResponse` |

**Request**
```ts
{
  produtoId?: uuid
  quantidade?: number
  observacao?: string | null
}
```

**Response** (C#, `SolicitacaoCompraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  DateTimeOffset DataSolicitacao
  string Solicitante
  string? Justificativa
  StatusSolicitacaoCompra StatusSolicitacao
  IReadOnlyList<SolicitacaoCompraItemResponse> Itens
}
```


## TabelasPreco — 10/10 consumidos pelo frontend

### `GET /api/tabelas-preco`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `page?` `pageSize?` |


### `POST /api/tabelas-preco`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  nome?: string | null
  dataInicioVigencia?: date
  dataFimVigencia?: date | null
  padrao?: boolean
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `GET /api/tabelas-preco/{id}`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `PUT /api/tabelas-preco/{id}`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `CargoAcessoResponse` |

**Request**
```ts
{
  nome?: string | null
  dataInicioVigencia?: date
  dataFimVigencia?: date | null
  padrao?: boolean
}
```

**Response** (C#, `CargoAcessoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  EscopoAcesso Escopo
  string Nome
  string? Descricao
  int NivelHierarquico
  bool Ativo
  IReadOnlyCollection<Guid> GruposAcessoIds
}
```


### `POST /api/tabelas-preco/{id}/ativar`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_ATIVAR` |
| Frontend | ✅ consome |
| Response DTO | `TabelaPrecoResponse` |

**Response** (C#, `TabelaPrecoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  DateOnly DataInicioVigencia
  DateOnly? DataFimVigencia
  bool Padrao
  StatusTabelaPreco Status
  IReadOnlyList<TabelaPrecoItemResponse> Itens
}
```


### `POST /api/tabelas-preco/{id}/inativar`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_INATIVAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/tabelas-preco/{id}/itens`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_ITENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  produtoId?: uuid
  precoVenda?: number
  precoMinimo?: number | null
  margemPercentual?: number | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `PUT /api/tabelas-preco/{id}/itens/{itemId}`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_ITENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `PedidoVendaResponse` |

**Request**
```ts
{
  precoVenda?: number
  precoMinimo?: number | null
  margemPercentual?: number | null
}
```

**Response** (C#, `PedidoVendaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid ClienteId
  DateTimeOffset DataEmissao
  DateTimeOffset? DataPrevisaoEntrega
  TipoPedidoVenda Tipo
  StatusPedidoVenda StatusPedido
  decimal ValorProdutos
  decimal ValorDesconto
  decimal ValorTotal
  string? Observacao
  string? MotivoCancelamento
  DateTimeOffset? AprovadoEm
  DateTimeOffset? CanceladoEm
  DateTimeOffset? FaturadoEm
  IReadOnlyCollection<ItemPedidoVendaResponse> Itens
}
```


### `POST /api/tabelas-preco/{id}/itens/{itemId}/inativar`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_ITENS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `TabelaPrecoResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `TabelaPrecoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Nome
  DateOnly DataInicioVigencia
  DateOnly? DataFimVigencia
  bool Padrao
  StatusTabelaPreco Status
  IReadOnlyList<TabelaPrecoItemResponse> Itens
}
```


### `GET /api/tabelas-preco/produtos/{produtoId}/preco-vigente`

| | |
|---|---|
| Permissão | `TABELAS_PRECO_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `PrecoProdutoVigenteResponse` |
| Query | `empresaId?` `filialId?` `dataReferencia?` |

**Response** (C#, `PrecoProdutoVigenteResponse`)
```csharp
{
  Guid TabelaPrecoId
  Guid ItemId
  Guid ProdutoId
  decimal PrecoVenda
  decimal? PrecoMinimo
  DateOnly DataReferencia
}
```


## Transportadoras — 0/4 consumidos pelo frontend

### `GET /api/transportadoras`

| | |
|---|---|
| Permissão | `TRANSPORTADORAS_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/transportadoras`

| | |
|---|---|
| Permissão | `TRANSPORTADORAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `TransportadoraResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  pessoaId?: uuid
  codigo?: string | null
  tipoFretePadrao?: Erp.Domain.Pessoas.TipoFrete
  rntrc?: string | null
  observacao?: string | null
}
```

**Response** (C#, `TransportadoraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Rntrc
  TipoFrete TipoFretePadrao
  string? Observacao
  EntityStatus Status
}
```


### `PUT /api/transportadoras/{id}`

| | |
|---|---|
| Permissão | `TRANSPORTADORAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `TransportadoraResponse` |

**Request**
```ts
{
  tipoFretePadrao?: Erp.Domain.Pessoas.TipoFrete
  rntrc?: string | null
  observacao?: string | null
}
```

**Response** (C#, `TransportadoraResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  Guid PessoaId
  string Codigo
  string? Rntrc
  TipoFrete TipoFretePadrao
  string? Observacao
  EntityStatus Status
}
```


### `POST /api/transportadoras/{id}/inativar`

| | |
|---|---|
| Permissão | `TRANSPORTADORAS_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## TributacaoSimulacao — 1/1 consumidos pelo frontend

### `POST /api/fiscal/tributacao/simular`

| | |
|---|---|
| Permissão | `FISCAL_REGRAS_CONSULTAR` |
| Frontend | ✅ consome |

**Request**
```ts
{
  empresaId: uuid
  filialId?: uuid | null
  tipoOperacao: Erp.Domain.Fiscal.Cadastros.TipoCfop
  regimeEmpresa: Erp.Domain.Administration.RegimeTributario
  crtEmitente?: Erp.Domain.Administration.Crt
  ufOrigem: string | null
  ufDestino: string | null
  codigoMunicipioOrigem?: string | null
  codigoMunicipioDestino?: string | null
  indicadorContribuinteDestinatario: Erp.Domain.Pessoas.IndicadorContribuinteIcms
  consumidorFinal: boolean
  dataOperacao: date
  destinatarioContribuinteIpi?: boolean
  emitenteContribuinteIpi?: boolean | null
  finalidade?: Erp.Domain.Fiscal.Cadastros.FinalidadeNaturezaOperacao
  naturezaTomadorServico?: Erp.Domain.Fiscal.Tributacao.NaturezaTomadorServico
  valorFreteTotal?: number
  valorSeguroTotal?: number
  valorOutrasDespesasTotal?: number
  valorDescontoTotal?: number
  itens: Erp.Application.Abstractions.Fiscal.Tributacao.ItemDocumentoTributavelRequest[] | null
}
```


## UnidadesMedida — 4/4 consumidos pelo frontend

### `GET /api/produtos/unidades-medida`

| | |
|---|---|
| Permissão | `PRODUTOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` |


### `POST /api/produtos/unidades-medida`

| | |
|---|---|
| Permissão | `UNIDADES_MEDIDA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `UnidadeMedidaResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  sigla?: string | null
  descricao?: string | null
  casasDecimais?: integer
  permiteFracionado?: boolean
}
```

**Response** (C#, `UnidadeMedidaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Sigla
  string Descricao
  int CasasDecimais
  bool PermiteFracionado
  EntityStatus Status
}
```


### `PUT /api/produtos/unidades-medida/{id}`

| | |
|---|---|
| Permissão | `UNIDADES_MEDIDA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `UnidadeMedidaResponse` |

**Request**
```ts
{
  descricao?: string | null
  casasDecimais?: integer
  permiteFracionado?: boolean
}
```

**Response** (C#, `UnidadeMedidaResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Sigla
  string Descricao
  int CasasDecimais
  bool PermiteFracionado
  EntityStatus Status
}
```


### `POST /api/produtos/unidades-medida/{id}/inativar`

| | |
|---|---|
| Permissão | `UNIDADES_MEDIDA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


## Usuarios — 8/8 consumidos pelo frontend

### `GET /api/seguranca/usuarios`

| | |
|---|---|
| Permissão | `SEGURANCA_USUARIOS_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `termo?` `ativo?` |


### `POST /api/seguranca/usuarios`

| | |
|---|---|
| Permissão | `SEGURANCA_USUARIOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  nome?: string | null
  email?: string | null
  senha?: string | null
  empresaId?: uuid
  filialId?: uuid | null
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `GET /api/seguranca/usuarios/{id}`

| | |
|---|---|
| Permissão | `SEGURANCA_USUARIOS_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `POST /api/seguranca/usuarios/{id}/grupos-acesso`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  grupoAcessoId?: uuid
}
```


### `POST /api/seguranca/usuarios/{id}/grupos-acesso/{grupoAcessoId}/remover`

| | |
|---|---|
| Permissão | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/seguranca/usuarios/{id}/inativar`

| | |
|---|---|
| Permissão | `SEGURANCA_USUARIOS_INATIVAR` |
| Frontend | ✅ consome |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  motivo?: string | null
}
```


### `POST /api/seguranca/usuarios/{id}/reativar`

| | |
|---|---|
| Permissão | `SEGURANCA_USUARIOS_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `UsuarioResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `UsuarioResponse`)
```csharp
{
  Guid Id
  string Nome
  string Email
  Guid EmpresaId
  Guid? FilialId
  bool Ativo
  bool Bloqueado
  DateTimeOffset? UltimoLoginEm
}
```


### `POST /api/seguranca/usuarios/{id}/reset-senha`

| | |
|---|---|
| Permissão | `SEGURANCA_USUARIOS_RESETAR_SENHA` |
| Frontend | ✅ consome |
| Response DTO | `ResetarSenhaUsuarioResponse` |

**Request**
```ts
{
  novaSenha?: string | null
  motivo?: string | null
}
```

**Response** (C#, `ResetarSenhaUsuarioResponse`)
```csharp
{
  Guid UsuarioId
  DateTimeOffset AlteradaEm
}
```


## UsuariosCargosAcesso — 1/3 consumidos pelo frontend

### `POST /api/seguranca/usuarios/{id}/cargos-empresa`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  cargoAcessoId?: uuid
  vigenteDesde?: date
  vigenteAte?: date | null
  motivo?: string | null
}
```


### `POST /api/seguranca/usuarios/{id}/cargos-filial`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_GERENCIAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `(sem corpo)` |

**Request**
```ts
{
  cargoAcessoId?: uuid
  filialId?: uuid
  vigenteDesde?: date
  vigenteAte?: date | null
  motivo?: string | null
}
```


### `GET /api/seguranca/usuarios/{id}/permissoes-efetivas`

| | |
|---|---|
| Permissão | `SEGURANCA_PERMISSOES_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `PermissoesEfetivasUsuarioResponse` |
| Query | `empresaId?` `filialId?` |

**Response** (C#, `PermissoesEfetivasUsuarioResponse`)
```csharp
{
  Guid UsuarioId
  Guid EmpresaId
  Guid? FilialId
  IReadOnlyCollection<string> Permissoes
  IReadOnlyCollection<OrigemPermissaoEfetivaResponse> Origens
}
```


## Veiculos — 15/15 consumidos pelo frontend

### `GET /api/frota/veiculos`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `status?` `tipo?` `termo?` |


### `POST /api/frota/veiculos`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `VeiculoResponse` |

**Request**
```ts
{
  empresaId?: uuid
  filialId?: uuid | null
  placa?: string | null
  modelo?: string | null
  marca?: string | null
  ano?: integer | null
  tipo?: Erp.Domain.Frota.TipoVeiculo
  combustivel?: Erp.Domain.Frota.TipoCombustivel
  odometroInicial?: number
  renavam?: string | null
}
```

**Response** (C#, `VeiculoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Placa
  string Modelo
  string? Marca
  int? Ano
  TipoVeiculo Tipo
  TipoCombustivel Combustivel
  decimal OdometroAtual
  string? Renavam
  StatusVeiculo StatusVeiculo
}
```


### `GET /api/frota/veiculos/{id}`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `VeiculoResponse` |

**Response** (C#, `VeiculoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Placa
  string Modelo
  string? Marca
  int? Ano
  TipoVeiculo Tipo
  TipoCombustivel Combustivel
  decimal OdometroAtual
  string? Renavam
  StatusVeiculo StatusVeiculo
}
```


### `PUT /api/frota/veiculos/{id}`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `VeiculoResponse` |

**Request**
```ts
{
  modelo?: string | null
  marca?: string | null
  ano?: integer | null
  tipo?: Erp.Domain.Frota.TipoVeiculo
  combustivel?: Erp.Domain.Frota.TipoCombustivel
  renavam?: string | null
}
```

**Response** (C#, `VeiculoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Placa
  string Modelo
  string? Marca
  int? Ano
  TipoVeiculo Tipo
  TipoCombustivel Combustivel
  decimal OdometroAtual
  string? Renavam
  StatusVeiculo StatusVeiculo
}
```


### `POST /api/frota/veiculos/{id}/status`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `VeiculoResponse` |

**Request**
```ts
{
  status?: Erp.Domain.Frota.StatusVeiculo
}
```

**Response** (C#, `VeiculoResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Placa
  string Modelo
  string? Marca
  int? Ano
  TipoVeiculo Tipo
  TipoCombustivel Combustivel
  decimal OdometroAtual
  string? Renavam
  StatusVeiculo StatusVeiculo
}
```


### `GET /api/frota/veiculos/abastecimentos`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `veiculoId?` |


### `POST /api/frota/veiculos/abastecimentos`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `AbastecimentoResponse` |

**Request**
```ts
{
  veiculoId?: uuid
  motoristaId?: uuid | null
  data?: date-time | null
  odometro?: number
  litros?: number
  valorLitro?: number
  combustivel?: Erp.Domain.Frota.TipoCombustivel
  tanqueCheio?: boolean
  posto?: string | null
}
```

**Response** (C#, `AbastecimentoResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  Guid? MotoristaId
  DateTimeOffset Data
  decimal Odometro
  decimal Litros
  decimal ValorLitro
  decimal ValorTotal
  TipoCombustivel Combustivel
  bool TanqueCheio
  string? Posto
}
```


### `GET /api/frota/veiculos/despesas`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `veiculoId?` |


### `POST /api/frota/veiculos/despesas`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `DespesaVeiculoResponse` |

**Request**
```ts
{
  veiculoId?: uuid
  tipo?: Erp.Domain.Frota.TipoDespesaVeiculo
  data?: date-time | null
  valor?: number
  descricao?: string | null
  fornecedorId?: uuid | null
}
```

**Response** (C#, `DespesaVeiculoResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  TipoDespesaVeiculo Tipo
  DateTimeOffset Data
  decimal Valor
  string Descricao
  Guid? FornecedorId
}
```


### `GET /api/frota/veiculos/documentos`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `veiculoId?` |


### `POST /api/frota/veiculos/documentos`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `DocumentoVeiculoResponse` |

**Request**
```ts
{
  veiculoId?: uuid
  tipo?: Erp.Domain.Frota.TipoDocumentoVeiculo
  numero?: string | null
  dataEmissao?: date-time | null
  dataVencimento?: date-time
  valor?: number | null
}
```

**Response** (C#, `DocumentoVeiculoResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  TipoDocumentoVeiculo Tipo
  string? Numero
  DateTimeOffset? DataEmissao
  DateTimeOffset DataVencimento
  decimal? Valor
  bool Vencido
}
```


### `GET /api/frota/veiculos/manutencoes`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `veiculoId?` `status?` |


### `POST /api/frota/veiculos/manutencoes`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ManutencaoResponse` |

**Request**
```ts
{
  veiculoId?: uuid
  tipo?: Erp.Domain.Frota.TipoManutencao
  data?: date-time | null
  odometro?: number
  descricao?: string | null
  valor?: number
  fornecedorId?: uuid | null
}
```

**Response** (C#, `ManutencaoResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  TipoManutencao Tipo
  DateTimeOffset Data
  decimal Odometro
  string Descricao
  decimal Valor
  Guid? FornecedorId
  StatusManutencao StatusManutencao
  DateTimeOffset? DataConclusao
}
```


### `POST /api/frota/veiculos/manutencoes/{id}/cancelar`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ManutencaoResponse` |

**Response** (C#, `ManutencaoResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  TipoManutencao Tipo
  DateTimeOffset Data
  decimal Odometro
  string Descricao
  decimal Valor
  Guid? FornecedorId
  StatusManutencao StatusManutencao
  DateTimeOffset? DataConclusao
}
```


### `POST /api/frota/veiculos/manutencoes/{id}/concluir`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ManutencaoResponse` |

**Response** (C#, `ManutencaoResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  TipoManutencao Tipo
  DateTimeOffset Data
  decimal Odometro
  string Descricao
  decimal Valor
  Guid? FornecedorId
  StatusManutencao StatusManutencao
  DateTimeOffset? DataConclusao
}
```


## VendasPdv — 3/3 consumidos pelo frontend

### `GET /api/pdv/vendas`

| | |
|---|---|
| Permissão | `PDV_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `filialId?` `caixaId?` `status?` |


### `POST /api/pdv/vendas`

| | |
|---|---|
| Permissão | `PDV_VENDER` |
| Frontend | ✅ consome |
| Response DTO | `VendaPdvResponse` |

**Request**
```ts
{
  caixaId?: uuid
  localEstoqueId?: uuid
  clienteId?: uuid | null
  itens?: Erp.Application.Pdv.ItemVendaPdvRequest[] | null
  pagamentos?: Erp.Application.Pdv.PagamentoVendaPdvRequest[] | null
}
```

**Response** (C#, `VendaPdvResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid CaixaId
  Guid OperadorId
  Guid LocalEstoqueId
  Guid? ClienteId
  DateTimeOffset DataVenda
  StatusVendaPdv StatusVenda
  decimal ValorBruto
  decimal ValorDesconto
  decimal ValorLiquido
  decimal ValorPago
  decimal Troco
  IReadOnlyList<ItemVendaPdvResponse> Itens
  IReadOnlyList<PagamentoVendaPdvResponse> Pagamentos
}
```


### `GET /api/pdv/vendas/{id}`

| | |
|---|---|
| Permissão | `PDV_CONSULTAR` |
| Frontend | ✅ consome |
| Response DTO | `VendaPdvResponse` |

**Response** (C#, `VendaPdvResponse`)
```csharp
{
  Guid Id
  Guid EmpresaId
  Guid? FilialId
  string Numero
  Guid CaixaId
  Guid OperadorId
  Guid LocalEstoqueId
  Guid? ClienteId
  DateTimeOffset DataVenda
  StatusVendaPdv StatusVenda
  decimal ValorBruto
  decimal ValorDesconto
  decimal ValorLiquido
  decimal ValorPago
  decimal Troco
  IReadOnlyList<ItemVendaPdvResponse> Itens
  IReadOnlyList<PagamentoVendaPdvResponse> Pagamentos
}
```


## Viagens — 4/5 consumidos pelo frontend

### `GET /api/frota/viagens`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ✅ consome |
| Query | `empresaId?` `veiculoId?` `motoristaId?` `status?` |


### `POST /api/frota/viagens`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ViagemResponse` |

**Request**
```ts
{
  veiculoId?: uuid
  motoristaId?: uuid
  origem?: string | null
  destino?: string | null
  dataSaida?: date-time | null
  odometroSaida?: number
}
```

**Response** (C#, `ViagemResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  Guid MotoristaId
  string Origem
  string Destino
  DateTimeOffset DataSaida
  decimal OdometroSaida
  DateTimeOffset? DataChegada
  decimal? OdometroChegada
  decimal? Distancia
  StatusViagem StatusViagem
  string? Observacao
}
```


### `GET /api/frota/viagens/{id}`

| | |
|---|---|
| Permissão | `FROTA_CONSULTAR` |
| Frontend | ❌ **não consome** |
| Response DTO | `ViagemResponse` |

**Response** (C#, `ViagemResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  Guid MotoristaId
  string Origem
  string Destino
  DateTimeOffset DataSaida
  decimal OdometroSaida
  DateTimeOffset? DataChegada
  decimal? OdometroChegada
  decimal? Distancia
  StatusViagem StatusViagem
  string? Observacao
}
```


### `POST /api/frota/viagens/{id}/cancelar`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ViagemResponse` |

**Request**
```ts
{
  motivo?: string | null
}
```

**Response** (C#, `ViagemResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  Guid MotoristaId
  string Origem
  string Destino
  DateTimeOffset DataSaida
  decimal OdometroSaida
  DateTimeOffset? DataChegada
  decimal? OdometroChegada
  decimal? Distancia
  StatusViagem StatusViagem
  string? Observacao
}
```


### `POST /api/frota/viagens/{id}/encerrar`

| | |
|---|---|
| Permissão | `FROTA_GERENCIAR` |
| Frontend | ✅ consome |
| Response DTO | `ViagemResponse` |

**Request**
```ts
{
  odometroChegada?: number
  dataChegada?: date-time | null
  observacao?: string | null
}
```

**Response** (C#, `ViagemResponse`)
```csharp
{
  Guid Id
  Guid VeiculoId
  Guid MotoristaId
  string Origem
  string Destino
  DateTimeOffset DataSaida
  decimal OdometroSaida
  DateTimeOffset? DataChegada
  decimal? OdometroChegada
  decimal? Distancia
  StatusViagem StatusViagem
  string? Observacao
}
```
