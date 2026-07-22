# Espec. backend — Vínculo Usuário ↔ Colaborador / papel de Vendedor

> Levantamento para o time de backend. O frontend implementa **depois** que o contrato existir.
> Objetivo: dar rastreabilidade ao usuário — saber se é um colaborador (RH) e/ou atua como
> vendedor, para não perder atribuição em pedidos, comissões e auditoria cruzada com o RH.

## 1. Estado atual (o que já existe)

- **Segurança / Usuário** (`CriarUsuarioRequest`, `UsuarioResponse`): tem `nome, email, login, senha,
  empresaId, filialId, gruposAcessoIds`. **Não** tem `colaboradorId`, `pessoaId` nem `tipo/papel`.
- **RH / Colaborador** (`ColaboradorResponse`): `id, matricula, nome, cpf, cargoId, setorId?,
  pessoaId?, regime, salarioBase, dataAdmissao, status…`. **Não** referencia Usuário.
- **Vendas / CRM / Serviços**: **não** existe campo `vendedorId` em Pedido de Venda, Oportunidade ou OS.
- **Auditoria**: já grava `usuarioId` por evento (única amarração usuário↔ação hoje).

Conclusão: não há como marcar/rastrear "colaborador" ou "vendedor" sem novo contrato.

## 2. Proposta de contrato (recomendada)

Vínculo **opcional** Usuário → Colaborador + lista de **papéis** do usuário.

### 2.1 Campos novos

`CriarUsuarioRequest` / `AtualizarUsuarioRequest`:
| Campo | Tipo | Regras |
|---|---|---|
| `colaboradorId` | `Guid?` | Opcional. Colaborador do RH da mesma empresa. |
| `papeis` | `TipoPapelUsuario[]` | Opcional; default `[Interno]`. |

`UsuarioResponse` (adicionar, além dos campos acima já ecoados):
| Campo | Tipo | Observação |
|---|---|---|
| `colaboradorId` | `Guid \| null` | |
| `colaboradorNome` | `string \| null` | conveniência para exibir sem novo fetch |
| `colaboradorMatricula` | `string \| null` | idem |
| `papeis` | `TipoPapelUsuario[]` | |

### 2.2 Enum `TipoPapelUsuario`
`Interno=1, Vendedor=2, TecnicoServico=3, Comprador=4, Gestor=5, Externo=6, Sistema=7`
(multi-seleção — um usuário pode ser Interno **e** Vendedor).

### 2.3 Endpoints
| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| POST/PUT | `/api/seguranca/usuarios` `/{id}` | (existentes) | + `colaboradorId?`, `papeis?` |
| POST | `/api/seguranca/usuarios/{id}/vincular-colaborador` | SegurancaUsuariosGerenciar | `{ colaboradorId, motivo }` |
| POST | `/api/seguranca/usuarios/{id}/desvincular-colaborador` | SegurancaUsuariosGerenciar | `{ motivo }` |
| GET | `/api/rh/colaboradores?semUsuario=true&empresaId=` | RhConsultar | filtro p/ o seletor só oferecer colaboradores ainda sem usuário |

As ações dedicadas de vincular/desvincular seguem o padrão auditável das demais (exigem `motivo`).

### 2.4 Regras de negócio
- **Unicidade**: um `colaboradorId` só pode estar em **um** usuário (rejeitar duplicidade).
- **Escopo**: colaborador precisa pertencer à mesma `empresaId` do usuário.
- Ao vincular, o backend pode espelhar `pessoaId`/nome do colaborador para o usuário.

## 3. Rastreamento de "vendedor" (impacto fora de Segurança)

Marcar o papel `Vendedor` no usuário é o **primeiro** passo, mas para efetivamente atribuir vendas é
preciso um campo no pedido:

- **Vendas** — `CriarPedidoVendaRequest` + `PedidoVendaResponse`: adicionar `vendedorUsuarioId?: Guid`
  (ou `vendedorColaboradorId`). Validação: só aceitar usuário que tenha o papel `Vendedor`.
- (Opcional) Mesmo padrão em **CRM** (responsável já existe como `responsavelId`) e **Serviços**
  (`tecnicoResponsavelId` já existe) — aqui o gap é só Vendas.

Assim, relatórios/comissões conseguem agrupar por vendedor e a auditoria cruza `usuarioId` ↔
colaborador.

## 4. O que o frontend fará depois (quando o contrato existir)

1. **`UsuarioFormDialog`** (novo usuário): campo **"Colaborador (RH)"** — `EntitySelect` consumindo
   `/api/rh/colaboradores?semUsuario=true&empresaId={empresa}` — e **multiselect "Papéis"**.
2. **Modal "Gerenciar usuário"** (já criada nesta tela): exibir o colaborador vinculado e botões
   **Vincular / Desvincular colaborador** (com motivo), além dos papéis.
3. **Coluna/Tag** na listagem indicando papéis (ex.: badge "Vendedor").
4. **Pedido de Venda**: dropdown de **Vendedor** filtrando usuários com papel `Vendedor`.

## 5. Alternativa mais simples (se preferir enxugar)

Se não quiser papéis múltiplos agora: só `colaboradorId?` no usuário + um booleano `vendedor` (ou um
`tipoUsuario` único). Cobre o essencial (rastreio colaborador + flag vendedor) com menos superfície —
mas perde flexibilidade para outros papéis (comprador, técnico, gestor).
