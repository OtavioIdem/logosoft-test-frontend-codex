# Relatorio de teste visual assistido - frontend v1.11.0a8b45

Data da analise: 2026-06-19 12:26:22 -03:00

Repositorio: `OtavioIdem/logosoft-test-frontend-codex`

Branch local: `codex/v1.11.0a5-sidebar-search`

Commit base analisado: `83a34f2 feat: release frontend v1.11.0a8b45`

Frontend validado: `http://localhost:3000`

Backend validado: `http://localhost:8080`

Imagem/container frontend informado no ciclo: `logosoft-frontend:1.11.0a8b45`

## Status geral

Resultado da revisao visual assistida: **reprovado para commit adicional ou aprovacao final sem correcao**.

Motivo: foram identificados bloqueadores funcionais em frontend, falhas reais de backend que afetam o dashboard e modulos operacionais, alem de ajustes visuais/UX nao bloqueantes.

Nenhuma correcao foi aplicada nesta etapa. A analise foi executada em modo nao destrutivo, sem salvar registros, sem confirmar operacoes mutaveis e sem alterar o codigo produtivo.

## Escopo executado

Foram verificados:

- Login real no frontend.
- Dashboard inicial.
- Rotas produtivas de seguranca, produtos, tabelas de preco, financeiro, estoque, atividades, relatorios e auditoria.
- Comportamento visual em viewport desktop e mobile.
- Abertura de modais sem submissao valida.
- Validacoes locais em formularios sem criar ou alterar registros.
- Erros exibidos na interface.
- Retornos diretos de endpoints backend relevantes.
- Logs do container backend para confirmar causa de falhas.
- Permissoes efetivas do usuario autenticado, sem registrar credenciais no relatorio.

## Observacao de seguranca

Credenciais nao foram registradas neste arquivo.

A autenticacao foi usada apenas para validar comportamento da UI e chamadas locais ao backend. O token nao foi impresso nem gravado.

## Matriz resumida de rotas

| Rota | Resultado visual | Resultado funcional | Diagnostico |
| --- | --- | --- | --- |
| `/login` | Aprovado | Aprovado | Login real funcionou e redirecionou para dashboard. |
| `/dashboard` | Aprovado com alertas | Reprovado por backend | Cards financeiros e auditoria exibem erros reais de API. |
| `/seguranca/grupos-acesso` | Parcial | Aprovado funcionalmente | Endpoint 200, mas estado vazio duplicado. |
| `/seguranca/usuarios` | Aprovado | Aprovado com permissoes | Modais criticos abrem corretamente e exigem motivo onde aplicavel. |
| `/produtos` | Parcial | Aprovado basico | Listagem vazia ok; modal novo produto tem leve overflow mobile. |
| `/tabelas-preco` | Reprovado | Reprovado | Pagina quebra com `Application error`. |
| `/financeiro/contas-receber` | Parcial | Reprovado por backend | Endpoint retorna 500 por rota ambigua. |
| `/financeiro/contas-pagar` | Parcial | Reprovado por backend | Endpoint retorna 500 por rota ambigua. |
| `/financeiro/fluxo-caixa` | Parcial | Reprovado por frontend/backend contract | Frontend envia datetime ISO, backend aceita data simples. |
| `/estoque/transferencias` | Aprovado | Nao mutavel | Formulario e layout ok; nenhuma submissao foi executada. |
| `/estoque/bloqueios` | Aprovado | Nao mutavel | Formulario e layout ok; texto operacional coerente. |
| `/atividades` | Aprovado | Parcial por permissao | Consulta permitida; criar atividade desabilitado corretamente por falta de permissao. |
| `/relatorios` | Aprovado | Bloqueado por permissao | Tela mostra acesso negado porque usuario nao possui permissao requerida. |
| `/auditoria/operacional` | Aprovado com alertas | Reprovado por backend | UI exibe erro defensivo; backend falha na consulta EF. |

## Bloqueador 1 - Tabelas de preco quebra a pagina

### Sintoma

Ao acessar `/tabelas-preco`, a pagina renderiza:

`Application error: a client-side exception has occurred`

No console foi observado:

`TypeError: e.slice is not a function`

### Impacto

O modulo de tabelas de preco fica inutilizavel. A tela nao consegue renderizar a listagem.

Esse erro bloqueia a aprovacao da versao porque afeta uma funcionalidade criada em B40 e mantida ate B45.

### Evidencia do backend

Chamada direta para:

`GET http://localhost:8080/api/tabelas-preco`

Retorno resumido observado:

```json
{
  "resultado": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

### Causa provavel

O frontend espera que `response.data` seja um array direto, mas o backend retorna um envelope com `resultado.items`.

Em seguida, a tela trata o objeto retornado como array e repassa para `DataTableServer`. A tabela/PrimeReact tenta executar comportamento de array, gerando `slice is not a function`.

### Locais relacionados

- `features/tabelas-preco/api/tabelasPrecoApi.ts:45-50`
- `features/tabelas-preco/components/TabelasPrecoPage.tsx:57-64`
- `features/tabelas-preco/components/TabelasPrecoPage.tsx:123-126`
- `components/data/DataTableServer.tsx:7-9`
- `components/data/DataTableServer.tsx:28-42`

### Correcao recomendada

Normalizar a resposta da listagem de tabelas de preco antes de devolver para a tela.

A normalizacao deve aceitar:

- array direto: `TabelaPrecoResponse[]`
- paginado direto: `{ items: TabelaPrecoResponse[] }`
- envelope backend: `{ resultado: { items: TabelaPrecoResponse[] } }`

Tambem recomenda-se adicionar teste unitario especifico para `tabelasPrecoApi.listar` ou helper equivalente garantindo que uma resposta com `resultado.items` nao quebre a UI.

## Bloqueador 2 - Fluxo de caixa envia datas em formato rejeitado pelo backend

### Sintoma

Ao acessar `/financeiro/fluxo-caixa`, a tela mostra erro de validacao retornado pelo backend:

`The value '2026-07-01T02:59:59.000Z' is not valid. The value '2026-06-01T03:00:00.000Z' is not valid.`

### Impacto

O relatorio de fluxo de caixa nao carrega com os filtros padrao. O usuario ve uma tela funcionalmente bloqueada mesmo com backend ativo.

### Evidencia objetiva

Foram testados dois formatos diretamente contra o endpoint:

| Caso | Query | Resultado |
| --- | --- | --- |
| ISO datetime | `dataInicial=2026-06-01T03:00:00.000Z&dataFinal=2026-07-01T02:59:59.000Z` | HTTP 400 |
| Date-only | `dataInicial=2026-06-01&dataFinal=2026-06-30` | HTTP 200 |

### Causa provavel

O schema converte `Date` para `toISOString()`, mas o endpoint espera data simples no formato `yyyy-MM-dd`.

### Locais relacionados

- `features/financeiro/schemas/financeiroSchemas.ts:10-14`
- `features/financeiro/api/financeiroApi.ts:67`
- `features/financeiro/api/financeiroApi.ts:215-218`
- `features/financeiro/components/FluxoCaixaPage.tsx`

### Correcao recomendada

Alterar a query de fluxo de caixa para enviar datas em formato date-only.

Opcoes tecnicas:

- Usar um helper `dateOnly` para `FluxoCaixaQuery`.
- Trocar input datetime por input de data simples, se o contrato do backend for exclusivamente data.
- Atualizar testes unitarios que atualmente validem ISO datetime para fluxo de caixa.

## Bloqueador 3 - Dashboard exibe falhas por endpoints financeiros e auditoria

### Sintoma no dashboard

A rota `/dashboard` renderiza, mas exibe mensagens:

- `Contas a receber: Nao foi possivel conectar a API. Verifique a URL configurada e tente novamente.`
- `Contas a pagar: Nao foi possivel conectar a API. Verifique a URL configurada e tente novamente.`
- `Auditoria: Ocorreu um erro inesperado. Tente novamente ou acione o suporte.`

### Impacto

O dashboard nao consegue exibir informacoes financeiras nem eventos de auditoria. Visualmente a pagina nao quebra, mas operacionalmente fica incompleta.

### Evidencia de endpoints

Chamadas reais com usuario autenticado:

| Endpoint | Status observado |
| --- | --- |
| `/api/health` | 200 |
| `/api/vendas/pedidos` | 200 |
| `/api/estoque/saldos` | 200 |
| `/api/compras/pedidos` | 200 |
| `/api/financeiro/contas-receber` | 500 |
| `/api/financeiro/contas-pagar` | 500 |
| `/api/auditoria/eventos` | 500 |
| `/api/seguranca/grupos-acesso` | 200 |
| `/swagger/v1/swagger.json` | 500 |

### Diagnostico

As mensagens do dashboard sao coerentes com falhas reais do backend. Nao foi diagnosticada quebra de layout no dashboard.

## Backend - Rotas financeiras ambiguas

### Sintoma

Os endpoints abaixo retornam erro 500:

- `GET /api/financeiro/contas-receber`
- `GET /api/financeiro/contas-pagar`

### Evidencia dos logs

Para contas a pagar:

```text
Microsoft.AspNetCore.Routing.Matching.AmbiguousMatchException:
The request matched multiple endpoints.

Erp.Api.Controllers.Financeiro.ContasPagarController.Listar
Erp.Api.Controllers.Financeiro.FinanceiroAvancadoController.ListarPagar
```

Para contas a receber:

```text
Microsoft.AspNetCore.Routing.Matching.AmbiguousMatchException:
The request matched multiple endpoints.

Erp.Api.Controllers.Financeiro.ContasReceberController.Listar
Erp.Api.Controllers.Financeiro.FinanceiroAvancadoController.ListarReceber
```

### Impacto

Afeta:

- Dashboard.
- `/financeiro/contas-receber`.
- `/financeiro/contas-pagar`.
- Swagger/OpenAPI.
- Qualquer contrato automatizado que dependa desses endpoints.

### Correcao recomendada no backend

Garantir combinacao unica de metodo e path.

Possiveis abordagens:

- Remover ou renomear rotas duplicadas no controller avancado.
- Alterar prefixo do controller avancado para rotas distintas.
- Consolidar listagens em apenas um controller.
- Manter Swagger apenas como consequencia da rota correta, nao como workaround principal.

## Backend - Swagger fora por conflito de path

### Sintoma

`http://localhost:8080/swagger/index.html` apresenta:

`Failed to load API definition`

Erro informado:

`Internal Server Error http://localhost:8080/swagger/v1/swagger.json`

### Causa confirmada

O Swagger falha porque ha combinacao duplicada:

`GET api/financeiro/contas-pagar`

Actions em conflito:

- `Erp.Api.Controllers.Financeiro.ContasPagarController.Listar`
- `Erp.Api.Controllers.Financeiro.FinanceiroAvancadoController.ListarPagar`

### Impacto

Sem Swagger ativo, a reconciliacao real frontend/backend fica prejudicada e os proximos ciclos de contrato perdem fonte de verdade automatica.

## Backend - Auditoria falha por LINQ nao traduzivel

### Sintoma

As rotas abaixo retornam erro 500:

- `GET /api/auditoria/eventos`
- `GET /api/auditoria/eventos-recentes`
- `GET /api/auditoria/operacional`

### Evidencia dos logs

Trecho essencial:

```text
System.InvalidOperationException:
The LINQ expression 'DbSet<AuditoriaEvento>()
    .OrderByDescending(a => new AuditoriaEventoResumo(...).CriadoEm)'
could not be translated.
```

Pontos citados no log:

- `Erp.Infrastructure/Auditoria/AuditoriaConsultaRepository.cs:line 87`
- `Erp.Application/Auditoria/AuditoriaConsultaService.cs:line 36`
- `Erp.Application/Auditoria/AuditoriaConsultaService.cs:line 56`
- `Erp.Api/Controllers/AuditoriaController.cs:line 26`
- `Erp.Api/Controllers/AuditoriaController.cs:line 47`
- `Erp.Api/Controllers/AuditoriaController.cs:line 69`

### Impacto

Afeta:

- Dashboard.
- `/auditoria/operacional`.
- Eventos recentes.
- Auditoria operacional avancada B45.

### Correcao recomendada no backend

Ordenar e filtrar usando propriedades da entidade antes da projecao para DTO/record.

Exemplo conceitual:

1. Aplicar filtros em `IQueryable<AuditoriaEvento>`.
2. Aplicar `OrderByDescending(a => a.CriadoEm)` ainda sobre a entidade.
3. Aplicar paginacao.
4. Projetar para `AuditoriaEventoResumo`.

Evitar `OrderByDescending` sobre `new AuditoriaEventoResumo(...).CriadoEm`, pois essa construcao nao foi traduzida pelo provider EF.

## UX - Grupos de acesso mostra estado vazio duplicado

### Sintoma

Em `/seguranca/grupos-acesso`, quando nao ha grupos, a tela mostra:

- Empty message da tabela: `Nenhum grupo encontrado.`
- EmptyState abaixo: `Nenhum grupo`

### Impacto

Nao bloqueia fluxo funcional, mas cria duplicidade visual e reduz clareza da tela.

### Locais relacionados

- `features/seguranca/components/GruposAcessoPage.tsx:91-111`
- `components/data/DataTableServer.tsx:31-42`

### Correcao recomendada

Escolher apenas uma estrategia de estado vazio:

- manter apenas `emptyMessage` da tabela; ou
- ocultar a tabela quando vazia e renderizar apenas `EmptyState`; ou
- permitir que `DataTableServer` receba flag para desabilitar paginator/emptyMessage quando uma pagina usar `EmptyState` externo.

Tambem foi observado que o paginator aparece mesmo em tabela vazia, por comportamento padrao do componente compartilhado.

## UX - Modal Novo produto tem overflow leve em mobile

### Sintoma

Em viewport mobile aproximada de 460px, o modal `Novo produto` apresentou:

- viewport width: 460
- dialog width: 466
- x: -3
- `overflowViewport: true`

No desktop, o mesmo modal ficou alinhado corretamente.

### Local relacionado

- `features/produtos/components/ProdutoFormDialog.tsx:144`

Codigo atual observado:

```tsx
<Dialog ... style={{ width: 'min(72rem, 98vw)' }} ...>
```

### Impacto

Nao bloqueia uso em desktop, mas em mobile o modal passa levemente da viewport. Isso pode causar corte visual, scroll horizontal ou aparencia desalinhada.

### Correcao recomendada

Ajustar largura responsiva do dialog, por exemplo:

- usar `width: 'min(72rem, calc(100vw - 2rem))'`
- ou usar `breakpoints` do PrimeReact para larguras menores
- validar novamente em mobile apos ajuste

## Permissoes - Atividades

### Sintoma

Em `/atividades`, o botao `Nova atividade` aparece desabilitado.

### Diagnostico

Foi confirmada a permissao efetiva do usuario autenticado:

| Permissao | Presente |
| --- | --- |
| `ATIVIDADES_CONSULTAR` | Sim |
| `ATIVIDADES_GERENCIAR` | Nao |

### Conclusao

O comportamento esta correto no frontend.

A pagina permite consulta porque possui `ATIVIDADES_CONSULTAR`, mas bloqueia criacao porque o botao esta protegido por `ATIVIDADES_GERENCIAR`.

### Local relacionado

- `features/atividades/components/AtividadesPage.tsx:106-107`
- `features/atividades/components/AtividadesPage.tsx:166-167`

## Permissoes - Relatorios

### Sintoma

Em `/relatorios`, a tela mostra `Acesso negado`.

### Diagnostico

Foi confirmada a permissao efetiva do usuario autenticado:

| Permissao | Presente |
| --- | --- |
| `RELATORIOS_CONSULTAR` | Nao |

### Conclusao

O comportamento esta correto no frontend, assumindo que o usuario atual realmente nao deve acessar relatorios.

Se o perfil manager deveria acessar relatorios, a correcao fica no seed/permissao do backend, nao na tela.

## Seguranca - Usuarios

### Resultado visual

Rota: `/seguranca/usuarios`

Resultado: aprovado visualmente.

### Modais testados sem executar operacao final

- `Novo usuario`
- `Resetar senha`
- `Vincular grupo ao usuario`
- `Inativar usuario`

### Observacoes

- Modal `Novo usuario` abre com campos:
  - Nome
  - E-mail
  - Login
  - Senha inicial
  - Empresa
  - Filial
  - Grupos de acesso
- Modal `Resetar senha` exige nova senha, confirmacao e motivo.
- Modal `Vincular grupo` exige grupo e motivo.
- Modal `Inativar usuario` exige motivo obrigatorio.
- Nao houve overflow no desktop.
- No mobile, os modais de seguranca permaneceram dentro da viewport.

## Produtos

### Resultado visual

Rota: `/produtos`

Resultado: aprovado parcialmente.

### Pontos positivos

- Pagina renderiza.
- Listagem vazia nao quebra.
- Card de governanca renderiza.
- Modal `Novo produto` abre no desktop sem overflow.
- Campos operacionais usam componentes de selecao para referencias principais.

### Pendencia

Modal `Novo produto` passa levemente da viewport no mobile, conforme descrito em secao propria.

## Estoque - Transferencias

### Resultado visual

Rota: `/estoque/transferencias`

Resultado: aprovado em validacao nao mutavel.

### Campos visiveis

- Empresa
- Filial origem
- Filial destino
- Local origem
- Local destino
- Produto
- Quantidade
- Motivo

### Observacao

Nao foi executada submissao para evitar operacao mutavel em estoque.

## Estoque - Bloqueios

### Resultado visual

Rota: `/estoque/bloqueios`

Resultado: aprovado em validacao nao mutavel.

### Campos visiveis

- Empresa
- Filial
- Local
- Produto
- Quantidade
- Motivo
- ID do bloqueio

### Observacao

A tela informa que, sem endpoint de listagem confirmado, liberacao/cancelamento exige ID operacional do bloqueio gerado pelo backend ou por evidencia operacional.

Esse texto e coerente com uma tela operacional controlada, embora ainda dependa de processo externo para obter o ID.

## Auditoria operacional

### Resultado visual

Rota: `/auditoria/operacional`

Resultado: aprovado visualmente, reprovado funcionalmente por backend.

### Observacoes de UI

- A tela nao quebra.
- Nao ha exposicao visual de GUID bruto como informacao principal.
- Filtros e botao `Limpar filtros` funcionam visualmente.
- Ao limpar filtros, foi exibida mensagem:
  - `Filtros limpos`
  - `A auditoria operacional voltou para o periodo padrao.`

### Problema funcional

Backend retorna erro inesperado para eventos recentes e consulta operacional.

## Validacao mobile

Foram avaliadas rotas em viewport mobile aproximada:

- `/dashboard`
- `/seguranca/grupos-acesso`
- `/auditoria/operacional`
- `/tabelas-preco`

### Resultado

- Dashboard: sem overflow horizontal do body.
- Grupos de acesso: sem overflow do body; tabela usa rolagem interna.
- Auditoria operacional: sem overflow do body; tabela usa rolagem interna.
- Tabelas de preco: quebra funcional permanece.

### Observacao tecnica

As tabelas largas usam `responsiveLayout="scroll"`, portanto overflow interno em tabela foi tratado como comportamento esperado quando nao causa overflow do body.

## Console do navegador

Foi observado `TypeError: e.slice is not a function` apos acessar `/tabelas-preco`.

Observacao importante: o console do navegador manteve historico do erro ao navegar para outras rotas. Portanto, o erro foi tratado como confirmado especificamente em `/tabelas-preco`, e nao como evidencia isolada de que todas as rotas posteriores possuem o mesmo bug.

## Gaps que ainda precisam de validacao depois das correcoes

Depois de corrigir os bloqueadores, recomenda-se repetir:

1. Acesso a `/tabelas-preco`.
2. Listagem vazia de tabelas de preco.
3. Criacao/edicao de tabela em ambiente controlado, se autorizado.
4. Consulta de preco vigente.
5. `/financeiro/fluxo-caixa` com datas padrao.
6. Dashboard completo.
7. `/financeiro/contas-receber`.
8. `/financeiro/contas-pagar`.
9. `/auditoria/operacional`.
10. Swagger em `http://localhost:8080/swagger/index.html`.
11. Mobile do modal `Novo produto`.
12. Estado vazio de grupos de acesso.

## Priorizacao sugerida

### Prioridade P0

1. Corrigir rota duplicada no backend financeiro.
2. Corrigir query EF de auditoria no backend.
3. Corrigir normalizacao da resposta de `/api/tabelas-preco` no frontend.

### Prioridade P1

1. Corrigir formato de data em `/financeiro/fluxo-caixa`.
2. Revalidar dashboard apos backend financeiro/auditoria.
3. Revalidar Swagger real.

### Prioridade P2

1. Remover estado vazio duplicado em grupos de acesso.
2. Ajustar largura mobile do modal `Novo produto`.

## Criterio de aceite recomendado para proxima versao

A proxima correcao deve ser considerada aprovada apenas se:

- `/tabelas-preco` renderizar sem `Application error`.
- `/financeiro/fluxo-caixa` carregar com filtros padrao sem 400.
- `/dashboard` nao exibir falhas de contas a receber, contas a pagar e auditoria em ambiente backend saudavel.
- `/swagger/v1/swagger.json` retornar 200.
- `/api/financeiro/contas-receber` e `/api/financeiro/contas-pagar` nao tiverem ambiguidade de rota.
- `/api/auditoria/eventos` e `/api/auditoria/operacional` retornarem sucesso.
- O modal `Novo produto` nao ultrapassar a viewport mobile.
- Grupos de acesso exibir apenas um estado vazio.
- Gates estruturais e testes unitarios relevantes passarem.

## Conclusao

A versao B45 esta instalada e acessivel, mas a validacao assistida encontrou problemas que impedem aprovacao final sem correcao.

Os principais problemas nao sao apenas esteticos:

- Tabelas de preco quebra a aplicacao no frontend por contrato de resposta nao normalizado.
- Fluxo de caixa envia formato de data incompativel com o backend.
- Financeiro e auditoria possuem falhas reais no backend que afetam dashboard e paginas operacionais.

Enquanto esses pontos permanecerem, a recomendacao e nao commitar nova aprovacao, nao marcar a rotina como concluida e nao substituir a ultima versao aprovada por uma correcao parcial.
