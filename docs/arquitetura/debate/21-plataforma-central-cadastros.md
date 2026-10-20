# Debate 21 — centralização de Cadastros — posição do `arquiteto-plataforma-frontend`

Assunto: `central-cadastros`. Insumo comum da rodada:
`docs/arquitetura/debate/21-inventario-central-cadastros.md`. Viés declarado: preservar contratos,
permissões, deep links, cache e custo de reversão. Esta posição propõe; a síntese da rodada decide.

## 1. Evidência que condiciona o desenho

O inventário encontrou **34** rotas exibidas com comportamento de cadastro, configuração ou misto;
somente **8** estão hoje no grupo visual `Cadastros`, e as outras **26** estão distribuídas por onze
grupos (`21-inventario-central-cadastros.md`, seções 2 e 7). Não existe `/cadastros`, componente
central ou guard próprio. A mudança é, portanto, de navegação e composição; os endpoints, schemas e
payloads dos componentes filhos não precisam mudar.

Há duas limitações técnicas que impedem tratar isto como simples rearranjo visual:

1. O precedente da rodada 04 mediu que um terceiro nível de menu — grupo → categoria → item — não é
   coberto de ponta a ponta pelo gate atual: a recursão de `guard-permission-map` carrega apenas o
   `parentGroup` imediato (`04-plataforma-cadastros-fiscais.md:115-128,309-317`). `D44`-`D46`
   corrigiram a checagem para a hierarquia praticada, mas a fixture de três níveis continua sendo o
   gatilho explícito antes de adotar subgrupos (`DECISOES.md:1326-1382`).
2. Montar todas as telas em uma página central dispara consultas que hoje pertencem a cada feature.
   Exemplos: Administração executa a lista ao montar, exceto Filiais quando o contexto bloqueia
   (`useAdministracaoResources.ts:52-55`); Condições de pagamento usa `enabled=true` por padrão
   (`useFinanceiroResources.ts:61-69`); Locais de estoque também (`useEstoqueResources.ts:19`).
   Séries fiscais é corretamente condicionada por empresa e mantém query keys próprias
   (`useSeriesFiscais.ts:10-26`). Uma central que monte 34 filhos mistura volume, estados de loading e
   invalidações sem necessidade funcional.

## 2. Alternativas de plataforma

| Alternativa | Sustentabilidade | Reversão | Posição |
|---|---|---|---|
| Um único grupo `Cadastros` com categorias aninhadas no menu | Não cria rota nova, mas introduz terceiro nível sem cobertura estrutural; as categorias não conseguem explicar dependências além da ordem dos links | barata no código, arriscada na permissão enquanto o gate for cego | não adotar antes de fixture e prova vermelha de três níveis |
| Nova rota `/cadastros` como índice categorizado, com links para as rotas atuais | adiciona uma superfície pequena e deixa cada feature dona do contrato, query key, contexto e mutação | barata: remove-se a rota e restauram-se os itens nos grupos antigos | recomendada |
| Nova rota `/cadastros` embutindo os 34 CRUDs como abas | cria adapters, estados e guards duplicados; se os filhos forem montados juntos, multiplica consultas; se as rotas forem migradas, quebra links | cara: desfazer shell, adapters, URLs e testes de todas as features | rejeitada para a primeira entrega |

### P21-PLAT-1 — `/cadastros` é índice de navegação, não um mega-componente de CRUD

A central deve renderizar categorias, ordem sugerida e dependências, e cada item deve navegar para a
rota canônica já existente. No mesmo navegador o usuário continua no aplicativo, mas o componente de
Pessoas, Filiais, Séries ou qualquer outro só monta depois do clique. A central não consulta os 17
clients da seção 4 do inventário e não ganha query key própria.

Isto preserva:

- contratos e schemas atuais, sem tocar backend;
- query keys e invalidações no feature dono;
- contexto organizacional, especialmente Filiais e Séries;
- bookmarks, favoritos, links de auditoria e E2E que já usam as rotas atuais;
- possibilidade de um item aparecer também no módulo de origem se a síntese entender que a operação
  precisa de atalho duplicado.

Se, no futuro, o produto exigir CRUD dentro da própria central, o shell deve montar **somente um**
filho ativo e cada feature precisa expor explicitamente um modo embutido. Isso é outra fatia, pois
exige inventário de `PageHeader`, breadcrumbs, estados e `enabled` de cada filho; não deve ser inferido
como extensão desta navegação.

**Ponto de não-retorno evitado:** migrar as 34 URLs para `/cadastros/<recurso>` ou
`/cadastros?aba=<recurso>`. Depois de publicado, isso cobra redirects, compatibilidade com favoritos,
regravação de testes e duas famílias de guards. Manter as URLs atuais custa apenas um link.

**O que eu abro mão:** aceito um clique entre a visão da cadeia e a tela de manutenção. O sinal para
revisitar é medição de uso mostrando abandono recorrente entre a central e o destino, não preferência
estética.

### P21-PLAT-2 — um único item de menu aponta para a central; as categorias vivem no conteúdo

O menu lateral ganha uma entrada navegável `Cadastros` → `/cadastros`. As categorias — Organização,
Pessoas, Produtos, Comercial, Financeiro, Fiscal e as demais que a síntese admitir — ficam na página,
onde podem ter texto de dependência, estado e ordem sem criar o terceiro nível do parser de menu.

Os itens cadastrais deixam de ficar espalhados nos grupos operacionais somente depois que a central
estiver protegida e testada. As rotas antigas continuam registradas; removê-las do menu não autoriza
removê-las de `routePermissions.ts`.

O guard de `/cadastros` precisa de `anyOf` igual à união das permissões de **visibilidade** dos itens
admitidos na central. A página filtra cada cartão com a permissão do próprio item. Ter uma permissão de
cadastro abre a central, mas não torna visíveis os outros cartões e não concede acesso aos destinos.
O filtro da página é navegação; o guard da rota filha e o `PermissionGuard` da ação continuam sendo a
barreira efetiva.

Não recomendo uma permissão nova `CADASTROS_CONSULTAR`: ela não existe no backend, obrigaria catálogo,
grupos e migração operacional, e ainda não substituiria as permissões específicas das 34 telas. A
central deve compor as permissões publicadas, não criar uma superpermissão.

**Custo aceito:** o `anyOf` de `/cadastros` será grande. É mais barato conter essa duplicação por gate
do que publicar uma permissão agregadora ou dinamizar o parser antes de provar que ele lê imports e
spreads. O gatilho para extrair uma fonte compartilhada é o gate atual conseguir analisar essa fonte
sem perder C2/C3.

### P21-PLAT-3 — o registro da central é dado de navegação, não contrato de domínio

A implementação precisa de um registro declarativo com, no mínimo:

```text
id, categoria, ordem, label, descricao, to, anyPermissions, dependencias, classificacao
```

`classificacao` distingue `cadastro`, `configuracao` e `misto`; ela não habilita ação de domínio.
`dependencias` é texto/ligação de orientação — por exemplo Empresa → Filial → Setor/Cargo — e nunca
vira bloqueio frontend sem regra publicada pelo backend.

O registro não deve importar componentes das 34 features. Ele guarda links e permissões, o que evita
um bundle/shell acoplado a todos os módulos e permite reordenar categorias sem tocar API, hook ou
schema. IDs devem ser estáveis; posição e texto são reversíveis.

Cadastros bancários da DIV-4 ficam fora do registro navegável enquanto os quatro GETs não existirem.
Publicar um cartão que leva a um placeholder bloqueado aumenta a superfície sem capacidade real. As
cinco telas mistas da DIV-5 podem ser incluídas como links sem risco de cache, mas a decisão funcional
de pertencimento cabe à síntese; a central não deve duplicar as transições operacionais.

## 3. Permissões e divergências do inventário

### DIV-2 — Classificações de pessoa

`CLASSIFICACOES_PESSOA_GERENCIAR` protege as ações, mas não abre o item nem a rota; hoje só
`PESSOAS_CONSULTAR` concede acesso (`21-inventario-central-cadastros.md`, DIV-2). A central não pode
mascarar isso incluindo o cartão para quem tem apenas `_GERENCIAR`: o clique terminaria bloqueado.

Há duas respostas seguras, a serem arbitradas:

1. corrigir menu/rota para reconhecer `_GERENCIAR` na mesma fatia de navegação; isso é mudança de
   acesso e exige sessões nominais e CHANGELOG operacional; ou
2. preservar o acesso atual e registrar a dívida, deixando `_GERENCIAR` fora da visibilidade até a
   fatia própria.

A plataforma prefere a primeira porque a central torna a divergência visível, mas não decide uma
ampliação de acesso sem a rodada.

### DIV-3 — guards amplos em cinco famílias

A central deve copiar a permissão de visibilidade do item vigente, não o catch-all amplo de Produtos,
RH, Produção, Contábil ou Patrimônio. Corrigir todos os catch-alls junto com a central seria misturar
mudança de navegação com possível perda de acesso (`ACCESS_LOSS_UNDECLARED`). Preservar as regras
filhas mantém a reversão barata; as divergências seguem como correções independentes.

## 4. Cache, volume e contrato

- A central recomendada faz **zero** chamada de domínio ao abrir. Seus dados são estáticos e locais.
- Nenhuma query key existente muda. Mutações e invalidações continuam nos features atuais.
- Nenhum schema Zod ou payload muda; `validate:backend-contract-map` deve permanecer sem diferença
  funcional.
- A página não deve pré-carregar as 34 rotas na inicialização. Se o roteador fizer prefetch automático
  de código, isso não pode executar queries antes do mount do destino.
- Busca da central, se houver, filtra apenas os descritores locais; não é busca nos dados cadastrais.

Esta separação é a razão principal para preferir índice com links. “Tudo na mesma aba” vira uma
cadeia única de navegação, sem transformar 34 listas independentes numa consulta agregada que o
backend nunca publicou.

## 5. Gates e testes exigidos

### Gate G21-1 — coerência do registro de Cadastros

Classe de defeito: cartão órfão, rota inexistente, permissão de visibilidade que não abre o destino,
ID duplicado ou item admitido sem categoria/ordem.

Sinal vermelho obrigatório:

- fixture com `to` inexistente acusa o item nominal;
- fixture com permissão não contida na regra que casa com a rota acusa o par nominal;
- fixture com IDs ou `categoria+ordem` duplicados acusa ambos;
- a união de permissões do registro diverge do `anyOf` de `/cadastros` ou do item de menu.

Custo aproximado: médio, pois exige analisar o registro novo e reutilizar `findRoutePermissionRule`.
É o gate que contém a duplicação aceita em P21-PLAT-2.

### Gate G21-2 — `guard-permission-map` continua verde para menu de dois níveis

`menuHierarquia`, `menuSemRegra` e `menuForaDaRegra` devem permanecer em zero para a nova entrada. O
teste unitário de rota deve provar `findRoutePermissionRule('/cadastros')` com a união nominal, sem
aceitar `arrayContaining` frouxo.

Se a síntese rejeitar P21-PLAT-2 e escolher categorias aninhadas, entra antes uma fixture de três
níveis com prova vermelha: retirar do avô a permissão de um neto deve acusar exatamente aquele par.
Sem essa prova, a alternativa de menu aninhado fica bloqueada por `GATE_VACUO`.

### Testes de comportamento

- componente: sessão sem permissão não vê cartão; sessão com uma permissão vê apenas seus itens;
  categoria sem itens visíveis não aparece; estado sem nenhum cadastro acessível é explícito;
- navegação: cada cartão usa a rota canônica já existente e preserva deep link;
- E2E de permissão: pelo menos uma sessão nominal de Administração, uma de Fiscal e uma permissão
  específica sem `*_CONSULTAR`; validar central, destino e ausência de cartões alheios;
- E2E de regressão: bookmarks diretos de Filiais, Pessoas e Séries continuam funcionando;
- rede: abrir `/cadastros` não dispara chamadas aos endpoints das telas filhas;
- `validate:source`, `typecheck`, `lint`, `validate:backend-permissions`,
  `validate:guard-permission-map`, gate G21-1 e E2E isolado duas vezes, conforme o grafo para
  `navigationChange=true` e `permissionChange=true`.

## 6. Custo de reversão

| Decisão | Custo de desfazer |
|---|---|
| ordem, rótulo ou categoria no registro | barato |
| restaurar itens antigos nos grupos do menu e retirar `/cadastros` | barato; rotas nunca mudaram |
| incluir/excluir tela mista como link | barato; nenhum componente ou contrato muda |
| nova permissão agregadora | caro; exige backend, grupos, catálogo e migração — não proposta |
| migrar rotas canônicas para baixo de `/cadastros` | caro; redirects, guards, favoritos e testes — não proposta |
| embutir 34 componentes no shell | caro; adapters, estados, cache e revisão por feature — não proposta |

## 7. Posição final

Recomendo uma única entrada `Cadastros` apontando para `/cadastros`, com categorias e cadeia no
conteúdo, e links para as rotas atuais. Não recomendo categorias como terceiro nível do menu antes
de o gate provar essa hierarquia, nem uma página que monte todos os CRUDs. A primeira opção entrega
o objetivo de orientação com o menor acoplamento e mantém a reversão quase toda em navegação.

**O que eu abro mão:** aceito uma central que unifica descoberta e sequência, mas não unifica ainda
o código interno dos 34 CRUDs nem mantém todos montados na mesma URL. Aceito também o `anyOf` grande
da rota central enquanto G21-1 impedir drift. Reviso essa posição se houver medição de abandono pelo
clique adicional ou se um fluxo real precisar alternar repetidamente entre três ou mais cadastros
preservando estado não salvo.

```json
{
  "status": "completed_with_warnings",
  "agent": "arquiteto-plataforma-frontend",
  "slice": "rodada-21",
  "node": "projeto",
  "changedFiles": [
    "docs/arquitetura/debate/21-plataforma-central-cadastros.md"
  ],
  "acceptanceCriteria": {
    "comparar_menu_aninhado_e_nova_rota": "atendido",
    "avaliar_permissoes_deep_links_cache_reversao": "atendido",
    "propor_gates_e_testes": "atendido"
  },
  "decisionsApplied": [],
  "gates": {
    "validate:source": "not_run",
    "typecheck": "not_run",
    "lint": "not_run",
    "validate:guard-permission-map": "not_run",
    "G21-1": "proposed",
    "G21-2": "proposed"
  },
  "measurements": [
    {
      "o_que": "rotas exibidas classificadas como cadastro, configuracao ou mista",
      "valor": 34,
      "como": "inventario da rodada 21, secao 2"
    },
    {
      "o_que": "rotas hoje dentro do grupo visual Cadastros",
      "valor": 8,
      "como": "inventario da rodada 21, secao 2"
    }
  ],
  "risks": [
    "Categorias aninhadas criam terceiro nivel de menu sem prova estrutural do gate atual.",
    "Montar todos os componentes filhos pode disparar consultas e misturar estados de 34 telas.",
    "DIV-2 precisa de arbitragem antes de expor CLASSIFICACOES_PESSOA_GERENCIAR na central.",
    "DIV-3 nao deve ser corrigida incidentalmente, pois pode retirar acesso existente.",
    "O conjunto exato das cinco telas mistas ainda depende da sintese da rodada."
  ],
  "blockers": [],
  "handoff": {
    "testsRequired": true,
    "e2eRequired": true,
    "qaReviewRequired": true,
    "notes": "Sintese deve arbitrar escopo das telas mistas e DIV-2. Se escolher subgrupos no menu, G21-2 com prova vermelha de tres niveis vira pre-requisito."
  },
  "nextRecommendedAgent": "orquestrador"
}
```
