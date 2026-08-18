# Plano de adequação do frontend ao backend atual

Data da análise: 2026-08-12

Fonte normativa principal: `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, levantada diretamente do backend na branch `feat/v1.18.0-g1-identidade-fiscal-do-item`.

Execução iniciada em `v1.11.0a8b45.c1`, preservando o `HEAD 398298d` como corte técnico auditado. A Onda 0 regularizou o contrato, a `v1.11.0a8b46` iniciou a Onda 1 com o bootstrap por `/api/auth/me`, a `v1.11.0a8b47` adicionou o contexto organizacional global e a `v1.11.0a8b47.c1` iniciou a política explícita por request com rollout restrito a Administração.

## 1. Resultado executivo

O frontend possui cobertura visual ampla, porém não está seguro iniciar novas telas sobre a camada de integração atual.

A ordem correta é:

1. tornar o contrato novo a fonte de verdade do repositório;
2. corrigir autenticação, autorização, contexto organizacional e erros;
3. corrigir rotas, payloads, permissões e enums incompatíveis;
4. estabilizar os fluxos operacionais existentes;
5. somente depois iniciar novas funcionalidades em módulos cujo backend está maduro.

O maior risco atual não é falta de tela. É uma tela existente parecer funcional enquanto envia rota, permissão, enum ou payload diferente do backend real.

## 2. Base auditada

### 2.1 Estado do workspace

| Item | Estado encontrado |
| --- | --- |
| Projeto | Next.js 13.4.8, React 18, TypeScript, React Query, Axios, Zod e PrimeReact |
| Versão declarada | `1.11.0a8b47.c1` em `package.json` e `config/app.ts` |
| Branch integrada | `codex/v1.10.15a1-login-ux-final` |
| Corte integrado | merge do PR #8, incluindo o bootstrap de autenticação B46 |
| Worktree auditada | limpa após a sincronização com o remoto |
| Contrato atual | versionado em `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` |

A inconsistência de base registrada na análise inicial foi resolvida pela integração das correções contratuais e do bootstrap B46. Os itens restantes da Onda 1 continuam obrigatórios antes de novas telas de negócio.

### 2.2 Dimensão do contrato atual

O documento do backend registra:

- 94 controllers;
- 576 endpoints;
- 712 records de contrato;
- 153 enums;
- 177 códigos de permissão.

O frontend possui mais de 90 rotas de página e 39 áreas de feature. O gate AST da Onda 0 encontrou 491 ocorrências e 466 rotas HTTP únicas, considerando constantes, templates, wrappers e definições indiretas. O gate anterior informava apenas 275 endpoints porque sua expressão regular não resolvia todas as constantes e não comparava nada com o backend quando não havia Swagger.

## 3. Diagnóstico consolidado

| Prioridade | Achado | Evidência | Impacto |
| --- | --- | --- | --- |
| P0 | O gate de contrato usa o documento B38 antigo e passa sem comparar o backend atual | `validate:backend-contract-map` terminou verde em modo apenas estrutural/documental | falso positivo de compatibilidade |
| P0 | Contexto `empresaId`/`filialId` não é global | apenas notificações derivam o escopo do usuário; as demais telas mantêm filtros próprios | `400/403`, consulta fora de escopo e UX inconsistente |
| P0 | Master não é modelado corretamente | `CurrentUser` não possui `isMaster`; o mapper não lê `empresa_id`, `filial_id` ou `is_master`; o permission helper não reconhece `*` | master pode perder ações no frontend e não há seletor de empresa global |
| P0 | Envelope de erro atual não é preservado | `mapApiError` ignora `userMessage`, `operation` e parte de `errors`; 20 clients lançam novo `Error` só com a mensagem | perde `traceId`, `code`, erros de campo e rastreabilidade |
| P0 | Segurança usa payloads incompatíveis | criação de usuário envia `login` e `gruposAcessoIds`; grupo envia códigos em `permissoes` | usuário/grupo parecem salvos, mas vínculos e permissões não persistem |
| P0 | Há 26 rotas sem correspondência de método+caminho no backend atual | Estoque 9, Financeiro 6, RH 6, Bancos 4 e Relatórios 1 | `404/405` e fluxos bloqueados |
| P1 | Catálogo de permissões está defasado | faltam 45 códigos e sobram 3 códigos removidos | telas e botões são escondidos ou liberados incorretamente |
| P1 | Enums estão defasados | 37 enums compartilhados divergem em nomes/valores; 36 enums do backend não estão declarados no frontend | estado gravado ou filtrado incorretamente |
| P1 | Lista vazia é apresentada como ausência definitiva | 8 arquivos usam textos como “Nenhum registro” | confunde falta de acesso com falta de dados por causa da dívida D10 |
| P1 | Módulos imaturos são expostos como produto pronto | Contábil, RH e vários andaimes estão no menu; Documento Fiscal é crítico | expectativa funcional incorreta e risco operacional/fiscal |
| P2 | Cadastros sólidos do backend ainda não têm superfície completa | Segurança avançada, Pessoas vinculadas e Cadastros Fiscais | oportunidade de novas implementações após estabilização |

## 4. Divergências de rota que devem ser corrigidas primeiro

### 4.1 Estoque

Chamadas atuais sem rota correspondente:

```text
POST /api/estoque/bloqueios
POST /api/estoque/bloqueios/{id}/liberar
POST /api/estoque/bloqueios/{id}/cancelar
GET  /api/estoque/inventarios/{id}
POST /api/estoque/inventarios/{id}/iniciar-contagem
POST /api/estoque/inventarios/{id}/concluir
GET  /api/estoque/entradas
GET  /api/estoque/saidas
GET  /api/estoque/ajustes
```

As três consultas adicionais são indiretas: o `resourceClient` materializa `GET` a partir de `features/shared/config/erpFeatureCatalog.ts`, mas o backend expõe essas rotas somente para `POST`. O gate anterior não as enxergava.

Contrato atual:

```text
/api/estoque/avancado/bloqueios/*
/api/estoque/avancado/inventarios/*
```

Há dois modelos de inventário no backend: legado em `/api/estoque/inventarios` e avançado em `/api/estoque/avancado/inventarios`. O frontend também possui duas implementações. A correção deve escolher explicitamente uma experiência para cada rota de tela; não basta prefixar chamadas isoladas.

Decisão recomendada:

- manter o inventário simples somente com as ações realmente existentes: listar, abrir, adicionar item, fechar e cancelar;
- usar o módulo avançado para detalhe, iniciar contagem e concluir;
- remover a duplicidade visual ou redirecionar a tela antiga para a implementação avançada;
- padronizar `origemModulo` em constantes únicas do frontend.

### 4.2 Financeiro

Chamadas atuais sem rota correspondente no módulo simples:

```text
POST /api/financeiro/contas-receber/{id}/baixar
POST /api/financeiro/contas-receber/{id}/estornar
POST /api/financeiro/contas-pagar/{id}/baixar
POST /api/financeiro/contas-pagar/{id}/estornar
GET  /api/financeiro/contas/{id}
GET  /api/financeiro/fluxo-caixa
```

Contrato correto:

```text
simples:  /contas-receber/{id}/receber
simples:  /contas-receber/{id}/estornar-recebimento
simples:  /contas-pagar/{id}/pagar
simples:  /contas-pagar/{id}/estornar-pagamento
avançado: /api/financeiro/avancado/contas/*
avançado: /api/financeiro/avancado/fluxo-caixa
```

O frontend já possui `features/financeiro-avancado`, com base correta. A correção deve separar definitivamente os dois contratos e impedir que a tela simples use ações do modelo avançado sem o prefixo correspondente.

### 4.3 RH

O frontend usa:

```text
/api/rh/ausencias/ferias
/api/rh/ausencias/afastamentos
```

O backend atual expõe:

```text
/api/rh/ferias
/api/rh/afastamentos
```

São seis chamadas afetadas entre listagem, criação e transições de estado.

### 4.4 Bancos

O frontend executa quatro consultas inexistentes:

```text
GET /api/bancos
GET /api/bancos/contas-bancarias
GET /api/bancos/convenios
GET /api/bancos/carteiras
```

O backend atual possui apenas os `POST` correspondentes para esses quatro cadastros. Não existe contrato de leitura. A tela não deve continuar chamando endpoints que retornam `405`.

Decisão recomendada:

- bloquear as dependências de consulta com mensagem explícita;
- manter criação apenas se o fluxo puder ser concluído sem consulta posterior;
- solicitar ao backend os quatro `GET` antes de considerar Bancos/Boletos/CNAB pronto;
- manter o alerta de maturidade porque há dívida conhecida no cálculo do boleto.

### 4.5 Relatórios

O frontend usa `GET /api/relatorios/operacionais`; o backend expõe `GET /api/relatorios/operacional/geral`.

Além da rota, as permissões foram divididas por relatório. A tela não pode depender do código genérico antigo `RELATORIOS_CONSULTAR`.

## 5. Correção obrigatória do módulo Segurança

### 5.1 Usuário

Contrato real de criação:

```json
{
  "nome": "...",
  "email": "...",
  "senha": "...",
  "empresaId": "guid",
  "filialId": null
}
```

O frontend atual envia também `login` e `gruposAcessoIds`. Esses campos não existem no request atual.

Implementação recomendada:

1. criar o usuário apenas com o contrato real;
2. guardar o `usuarioId` retornado;
3. atribuir grupos em chamadas separadas;
4. atribuir cargo de acesso em chamada separada, com escopo e vigência;
5. consultar `/permissoes-efetivas` e confirmar o resultado na tela;
6. se uma etapa falhar, manter estado retomável em vez de fingir rollback.

### 5.2 Grupo de acesso

O request de criação aceita `permissoesIds`, isto é, GUIDs de permissões cadastradas. O frontend atual envia códigos textuais em `permissoes`.

O update de grupo altera apenas nome e descrição. Permissões são mantidas por:

- adicionar/remover permissão; ou
- matriz estruturada em `/{id}/matriz-permissoes`.

A matriz estruturada é o caminho recomendado para a tela porque preserva módulo, recurso, ação, escopo e motivo em um único contrato auditável.

### 5.3 Permissões e master

Correções necessárias:

- substituir os três códigos antigos:
  - `ATIVIDADES_GERENCIAR`;
  - `RELATORIOS_CONSULTAR`;
  - `PORTARIA_PRE_AUTORIZAR`;
- incorporar os 45 códigos novos do catálogo;
- reconhecer `isMaster` e wildcard `*` na UX;
- ler claims reais `empresa_id`, `filial_id` e `is_master`;
- usar `/me` como fonte de verdade da sessão;
- não recalcular permissões efetivas no cliente.

## 6. Arquitetura alvo da integração

```text
Login / Refresh / Me
        ↓
AuthSession tipada
        ↓
OrganizationalContextProvider
  ├─ usuário comum: empresa/filial travadas pelas claims
  └─ master: empresa selecionável e filial dependente
        ↓
httpClient com política de contexto por request
        ↓
adapter tipado da feature
        ↓
schema Zod de request + normalizador de response
        ↓
hook React Query
        ↓
tela com loading, vazio neutro, erro, permissão e máquina de estado
```

### 6.1 Sessão

- login continua aceitando `email` e `password`; `codigoEmpresa` é opcional no backend e só deve entrar se houver uma etapa formal de identificação da empresa;
- programar refresh proativo antes dos 15 minutos;
- manter single-flight para chamadas concorrentes;
- em `401`, tentar refresh uma vez e encerrar a sessão se falhar;
- logout deve enviar o refresh token antes de limpar a sessão local;
- refresh deve substituir access e refresh token, sem reaproveitar silenciosamente token antigo quando a rotação deveria ocorrer.

### 6.2 Contexto organizacional

Criar um provider global com:

```ts
type OrganizationalContext = {
  empresaId: string | null;
  filialId: string | null;
  isGlobal: boolean;
};
```

Regras:

- usuário comum recebe contexto de `/me` e não pode trocá-lo;
- usuário preso a filial não pode selecionar outra filial;
- master inicia com contexto global e deve selecionar empresa antes de uma operação escopada;
- o cliente HTTP deve aplicar contexto por política explícita, não adicionar campos desconhecidos a qualquer body;
- endpoints globais devem usar `skipOrganizationalContext`;
- mudança de contexto deve invalidar queries dependentes.

### 6.3 Erros

O tipo central deve preservar:

```text
status
code
message
userMessage
operation
traceId
errors por campo
```

Regras:

- toast usa `userMessage` quando disponível;
- `code` decide comportamento;
- `traceId` aparece em painel/toast expansível;
- `errors` alimenta o formulário;
- erro de negócio sem `errors` aparece no topo do formulário;
- adapters não podem converter `ApiError` em `new Error(message)`.

### 6.4 Paginação

Criar normalizador único que aceite somente os formatos formalmente suportados:

```text
array cru
{ resultado: PagedResult<T> }
```

Não espalhar normalizadores diferentes por feature. `PagedResult` deve incluir `hasPreviousPage` e `hasNextPage`.

## 7. Plano de execução por ondas

### Onda 0 — regularizar base e contrato

Objetivo: impedir desenvolvimento sobre uma base ambígua.

Entregas:

- confirmar o commit aprovado que serve de base;
- decidir se a entrega é B45 corretiva `.cN`;
- versionar o contrato novo;
- marcar B38 e documentos operacionais antigos como substituídos quando houver divergência;
- substituir a allowlist antiga por divergências do contrato atual;
- evoluir o gate para resolver constantes de rota e comparar o método + caminho;
- permitir OpenAPI versionado, mas não depender de sua presença para validar o catálogo Markdown atual;
- gerar relatório de cobertura por módulo, sem exigir que todo endpoint tenha tela.

Critério de aceite:

- o gate deve falhar para as 26 rotas incompatíveis atuais;
- a allowlist não pode manter afirmações já contraditas pelo backend;
- versão, branch e documentação devem representar o mesmo corte.

### Onda 1 — correção transversal de autenticação, contexto, autorização e erros

Arquivos centrais previstos:

```text
types/erp.ts
features/auth/api/authResponseMapper.ts
features/auth/api/authApi.ts
providers/AuthProvider.tsx
lib/auth/sessionStorage.ts
lib/http/httpClient.ts
lib/http/apiError.ts
lib/permissions/permissions.ts
lib/security/routePermissions.ts
providers/OrganizationalContextProvider.tsx       (novo)
hooks/useOrganizationalContext.ts                  (novo)
components/feedback/ApiErrorPanel.tsx
components/feedback/EmptyState.tsx
layout/AppTopbar.tsx
```

Critérios de aceite:

- claims snake_case e `isMaster` cobertas por teste;
- wildcard `*` coberto por teste;
- master consegue selecionar empresa; usuário comum não;
- `userMessage`, `code`, `traceId` e erros de campo chegam intactos à UI;
- refresh rotacionado e logout real cobertos por teste;
- lista vazia usa texto neutro.

### Onda 2 — correção de rotas e separação de contratos duplicados

Escopo:

```text
features/estoque/api/estoqueApi.ts
features/estoque-avancado/api/estoqueAvancadoApi.ts
features/financeiro/api/financeiroApi.ts
features/financeiro-avancado/api/financeiroAvancadoApi.ts
features/rh/api/rhApi.ts
features/bancos/api/bancosApi.ts
features/relatorios/api/relatoriosApi.ts
rotas e componentes associados
```

Critérios de aceite:

- nenhuma chamada produtiva aponta para rota ausente no catálogo atual;
- telas simples e avançadas não misturam contratos;
- Bancos não executa os quatro `GET` inexistentes;
- testes de contrato cobrem método, caminho e formato de data.

### Onda 3 — reconciliação de permissões, enums e payloads

Escopo:

- gerar catálogo TypeScript a partir de snapshot versionado ou validar automaticamente contra ele;
- corrigir os 37 enums divergentes;
- adicionar os enums realmente usados entre os 36 ausentes;
- não criar enum sem consumidor apenas para aumentar cobertura;
- corrigir `CriarUsuarioRequest`, `CriarGrupoAcessoRequest` e responses de Segurança;
- revisar schemas Zod de cada feature afetada;
- padronizar datas `DateTimeOffset` e `DateOnly`;
- manter enums numéricos no JSON.

Módulos com risco maior de enum incorreto:

```text
RH
Bancos
Frota
Portaria
Produção
Qualidade
Alimentar
CRM
Estoque
Fiscal
```

Critério de aceite:

- teste de contrato compara nome e valor dos enums usados;
- nenhum código antigo de permissão permanece em rota, menu ou botão;
- payloads críticos têm teste unitário de serialização.

### Onda 4 — Segurança avançada e vínculo operacional RH ↔ acesso

Novas implementações recomendadas:

1. catálogo real de permissões;
2. matriz de permissões do grupo;
3. cargos de acesso por empresa e filial, com vigência;
4. painel de permissões efetivas do usuário;
5. criação de usuário em etapas retomáveis;
6. fluxo assistido “admitir colaborador e criar acesso”.

Dependência de backend para vínculo definitivo:

- `Usuario.colaboradorId` único e opcional;
- filtro `semUsuario=true` em colaboradores;
- ações vincular/desvincular com motivo.

Enquanto isso não existir, o frontend pode orquestrar a criação, mas deve informar que colaborador e usuário continuam sem vínculo persistido. E-mail não pode ser usado como chave funcional.

### Onda 5 — estabilização dos fluxos ERP

#### Order-to-cash

- usar Faturamento orquestrado como caminho padrão;
- reservar o caminho manual para correção operacional;
- usar histórico e ocorrências no stepper;
- tratar `StatusFaturamento.Erro(7)` como retomável;
- não duplicar faturamento entre pedido e módulo orquestrador.

#### Purchase-to-pay

- preservar recebimento parcial por item;
- exibir divergências antes da conferência fiscal;
- confirmar impacto em estoque e financeiro;
- manter condição de pagamento derivada do pedido de compra.

#### Financeiro

- baixa, estorno e cancelamento com motivo;
- nunca editar diretamente conta quitada;
- exibir origem e trilha auditável;
- validar lançamento contábil produzido pela baixa.

#### Estoque

- qualquer alteração deve gerar movimento;
- transferência deve manter saída e entrada;
- `origemModulo` deve vir de catálogo de constantes;
- não prometer custo, CMV ou margem.

#### Fiscal

- continuar usando resumo e workflow do backend;
- não apresentar imposto da nota como cálculo automático;
- simulação tributária é informativa enquanto o documento não consumir o motor;
- a fatia v1.18.0/G1 deve ser confirmada como entregue antes de integrar identidade fiscal do item;
- emissão fiscal real permanece bloqueada para aprovação de produção enquanto o backend estiver classificado como vermelho.

### Onda 6 — novas telas em contratos maduros

Ordem recomendada:

1. Pessoas: endereços, contatos, classificação, bloqueio e dados fiscais;
2. Administração: endereço fiscal e município IBGE de empresa/filial;
3. Fiscal: séries, modelos, naturezas de operação e cadastros auxiliares;
4. Segurança: parâmetros, cargos de acesso e permissões efetivas;
5. Integrações/Infraestrutura: somente como console operacional, com escopo e auditoria.

Não priorizar Transportadoras como nova tela de negócio, embora o CRUD exista: o cadastro ainda não é consumido por NF-e ou outro processo.

## 8. Funcionalidades que não devem ser construídas agora

```text
cálculo automático de imposto na nota fiscal
precificação automática por tabela de preço
controle de limite de crédito por saldo em aberto
transporte/frete integrado à NF-e
CMV, margem e valoração de estoque
balancete, DRE e demonstrações completas
rastreabilidade de lote até a nota fiscal
comissão e painel de vendedor
nota fiscal de entrada integrada à apuração
```

Esses itens dependem de regra ou vínculo ausente no backend. Implementá-los no frontend criaria comportamento fictício.

## 9. Estratégia de testes

### 9.1 Unitários

- mapper de login, refresh e `/me`;
- claims `empresa_id`, `filial_id`, `is_master` e wildcard;
- normalização do envelope de erro;
- injeção/omissão de contexto organizacional;
- catálogo de permissões;
- valores de enums usados;
- payloads de Segurança, Financeiro, Estoque, RH e Fiscal;
- normalização de paginação.

### 9.2 Componentes

- seletor de contexto do master;
- contexto travado para usuário comum;
- erro com `userMessage`, `code` e `traceId`;
- erros de campo do backend;
- vazio neutro;
- ações habilitadas por permissão e estado;
- fluxo parcial de criação de usuário/grupos/cargos.

### 9.3 Contrato

- método + rota de cada client;
- payload obrigatório e nomes camelCase;
- enum numérico;
- `DateTimeOffset` com offset;
- `DateOnly` sem hora;
- `{ resultado: PagedResult }` apenas nos endpoints catalogados;
- nenhuma rota frontend ausente no snapshot do backend.

### 9.4 E2E real

Executar somente em ambiente descartável e preparado:

```text
login → refresh → logout
usuário → grupo → cargo → permissões efetivas
pedido de venda → faturamento → fiscal → estoque → financeiro
solicitação → cotação → pedido → recebimento parcial → conferência
conta → baixa → estorno → lançamento contábil
inventário → contagem → conclusão
```

Testes fiscais contra mock ou homologação não aprovam produção.

## 10. Gates obrigatórios por onda

Sem impacto fiscal:

```bash
npm run validate:source
npm run validate:skills
npm run validate:mocks-isolation
npm run validate:backend-contract-map
npm run validate:guid-references
npm run typecheck
npm run lint
npm run test:unit
git diff --check
```

Com impacto fiscal:

```bash
npm run validate:fiscal:production
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
```

Com backend descartável disponível:

```bash
npm run validate:backend-controlled
npm run validate:controlled-seeds
npm run validate:integrated-runbook
npm run validate:backend-seed-reset
npm run test:e2e:integrated:backend
```

## 11. Critérios de bloqueio

Bloquear a entrega se ocorrer qualquer item:

- rota frontend sem correspondência no contrato atual;
- permissão inexistente no catálogo do backend;
- enum divergente em request ou filtro;
- perda de `traceId`, `code`, `userMessage` ou erros de campo;
- usuário comum capaz de trocar empresa/filial fora das claims;
- master sem contexto selecionado executando mutação escopada;
- grupo criado sem permissões persistidas;
- fluxo parcial apresentado como concluído;
- lista vazia apresentada como certeza de ausência;
- módulo laranja/vermelho apresentado como pronto;
- regra fiscal, financeira ou de estoque criada exclusivamente no frontend;
- GUID de relacionamento digitado manualmente;
- build/teste verde usado como prova de correção fiscal do backend.

## 12. Sequência recomendada de entregas

```text
Base regularizada
  ↓
Correção contratual/transversal
  ↓
Correção das 26 rotas incompatíveis
  ↓
Permissões + enums + payloads
  ↓
Segurança avançada e RH/acesso
  ↓
Fluxos críticos integrados
  ↓
Novas telas de Pessoas/Administração/Fiscal
```

Cada onda deve ser pequena, revisável e aprovada antes da seguinte. Não juntar a correção transversal com novas telas de negócio na mesma versão.

## 13. Próxima ação objetiva

Continuar a Onda 1 pela expansão controlada da política explícita de contexto por request iniciada na `v1.11.0a8b47.c1`:

1. ampliar metadata explícita para endpoints globais, escopados e incompatíveis com injeção automática;
2. aplicar empresa e filial apenas nos locais aceitos formalmente pelo contrato; a fatia c1 ativou somente empresas e filiais administrativas;
3. incluir o contexto nas query keys dependentes para impedir reuso de cache entre empresas;
4. bloquear mutações escopadas de master enquanto nenhuma empresa estiver selecionada;
5. cobrir injeção, omissão, troca de contexto e isolamento de cache com testes.

Não adicionar `empresaId` ou `filialId` genericamente a qualquer body: cada endpoint deve declarar onde o contexto é aceito.
