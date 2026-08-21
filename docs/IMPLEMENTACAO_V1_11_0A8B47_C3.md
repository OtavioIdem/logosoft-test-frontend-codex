# Implementação v1.11.0a8b47.c3

Versão corretiva sobre `v1.11.0a8b47.c2`. Origem: quatro defeitos reportados em uso real. Os dois
primeiros tinham a mesma causa raiz.

## 1. Contexto organizacional inacessível (defeitos 1 e 2)

### Sintoma

`/administracao/filiais` nunca carregava, exibindo permanentemente "Selecione uma empresa no contexto
organizacional antes de consultar filiais". Nas demais telas escopadas (Setores, Cargos, Locais de
estoque), os dropdowns "Buscar empresa" e "Buscar filial" ficavam `disabled`, com aviso apontando para
um botão "Selecionar contexto" que o usuário não encontrava.

### Causa raiz

`styles/layout/_topbar.scss` tinha, dentro de `.layout-topbar-button`, uma regra com **seletor de
elemento**:

```scss
span {
    font-size: 1rem;
    display: none;
}
```

O `<Button>` do PrimeReact renderiza tanto o ícone quanto o rótulo como `<span>` — `IconUtils.getJSXIcon`
faz `React.createElement("span", …)` para ícone declarado como string. O botão de contexto em
`components/organizational/OrganizationalContextSelector.tsx` era exatamente isso: `<Button icon="pi pi-building"
label={…} className="p-link layout-topbar-button …" text />`. Resultado: **ícone e rótulo ocultos, sobrando
um círculo de 3rem vazio e invisível, presente no DOM e clicável apenas por acidente**.

Os demais botões do topbar escapavam porque usam `<button>` nativo com `<i>`, coberto pela regra
irmã `i { font-size: 1.5rem }`.

Consequência em cadeia: o master nunca abria o `OrganizationalContextDialog` →
`providers/OrganizationalContextProvider.tsx` mantinha `empresaId = null` indefinidamente →
`useAdministracaoResources` deixava a query de filiais `enabled: false` e `blocked: true`, e
`EmpresaFilialFilter` / `EmpresaFilialFields` mantinham os selects travados.

**Efeito colateral da mesma regra:** o `<Badge>` de notificações não lidas em `NotificacoesBell` também
é um `<span>` filho direto de `.layout-topbar-button` — estava invisível no desktop e voltou a aparecer.

### Correção

- A ocultação do rótulo passou de seletor de elemento para a classe `.layout-topbar-button-label`,
  aplicada explicitamente aos `<span>` de rótulo em `AppTopbar` e `NotificacoesBell` (conjunto fechado
  de 7 usos, auditado). A regra deixa de engolir `.p-button-icon`, `.p-button-label` e `.p-badge`.
- O botão de contexto virou `<button>` nativo com `<i className="pi pi-building">`, `aria-haspopup="dialog"`
  e `aria-label` dinâmico, alinhado ao padrão dos irmãos e sem depender de detalhe interno do PrimeReact.
- Novo `components/organizational/SelecionarContextoButton.tsx`, com variantes `topbar` e `inline`,
  encapsulando o diálogo como estado local. `OrganizationalContextSelector` virou wrapper fino dele.
- O CTA `inline` foi acrescentado ao estado bloqueado de Filiais e ao lado dos filtros Empresa/Filial
  travados, eliminando o beco sem saída.

### O que foi deliberadamente preservado

`empresaLocked = true` em `EmpresaFilialFilter`/`EmpresaFilialFields`, o escopo `lookup`, o
`contextMatches` de `useAdministracaoResources` e o snapshot imutável por request. Destravar o
`EmpresaSelect` local reintroduziria a divergência filtro × contexto que a `.c2` fechou. A correção
torna o contexto **alcançável**, não duplicado.

## 2. Banners informativos estáticos (defeito 3)

A explicação de cada tela já é servida pelo tooltip do título no topbar (`AppTopbar`, alimentado por
`PageHeader` → `pageheadercontext`), com fallback no cabeçalho compacto abaixo de 992px. Os banners
`Message severity="info"` no topo do corpo eram duplicação.

Critério de remoção, aplicado mecanicamente: `Message severity="info"` com **texto literal**,
**incondicional**, irmão imediato de um `<PageHeader …/>`. Das 63 ocorrências de `severity="info"` no
repositório, saíram 21.

Removidos também: o campo `listDescription` de `administracaoPageConfig` (tipo + 5 entradas) e o
`pageText.info` de `MovimentoOperacionalPage`, junto com o `<Card>` que existia só para envolvê-lo.

Frases que carregavam **regra de negócio** migraram para a `description` do `PageHeader`, sem perda de
conteúdo: bloqueio por status em Produtos, Pedidos de venda, Pedidos de compra e Contas financeiras;
LGPD em Eventos de auditoria; não recálculo de indicadores em Relatórios; registro transacional em
Transferências de estoque.

Mantidas, por não serem explicação de tela: mensagens condicionais de estado, workflow dirigido pelo
backend, compliance fiscal dentro de abas de detalhe, explicações de card/diálogo sem `PageHeader`,
todos os `<Tag severity="info">` e as telas-stub cujo `Message` é o corpo inteiro
(`BloqueiosEstoquePage`, `FluxoCaixaPage` — removê-lo deixaria a tela em branco).

## 3. Vínculo de grupo de acesso invisível (defeito 4)

### Causa raiz

São duas, somadas:

1. **De contrato, e é a dominante.** `UsuarioResponse` do backend é
   `(Id, Nome, Email, EmpresaId, FilialId?, Ativo, Bloqueado, UltimoLoginEm)` — **não tem `gruposAcesso`**,
   nem em `GET /` nem em `GET /{id}`. O campo opcional no tipo do frontend era especulativo, então
   `gruposLabel()` devolvia `'-'` sempre. Pelo mesmo motivo, `groupToRemoveFor()` devolvia `null`
   sempre e **"Remover grupo" estava permanentemente desabilitado, sem motivo visível**.
2. **De estado.** A página guardava `UsuarioResponse` congelado em `useState`, então mesmo após a
   invalidação o diálogo seguia exibindo o objeto antigo.

### Correção

- `selectedUsuario` deixou de ser objeto em state: guardamos o id e derivamos o usuário da listagem,
  eliminando o snapshot velho por construção.
- Novo consumo de `GET /api/seguranca/usuarios/{id}/permissoes-efetivas?empresaId=&filialId=` — o único
  endpoint do contrato que relaciona grupo a usuário, e o recomendado pela documentação de backend para
  esta tela. Os grupos vinculados são derivados de `origens[].grupoAcessoId`, deduplicados e resolvidos
  por nome contra a listagem de grupos. GUID não vai para a tela.
- Após vincular, o diálogo de gestão reabre com o acesso efetivo recarregado, em vez de fechar com um
  toast.
- "Remover grupo" ganhou diálogo próprio, com escolha entre os grupos realmente vinculados e motivo.
  Quando indisponível, **o motivo é escrito na tela**.
- Coluna "Grupos" removida da listagem: com o contrato atual seria sempre `-`.
- Registrada a permissão `SEGURANCA_PERMISSOES_CONSULTAR`, que já existia no snapshot do backend e
  faltava no union `PermissionCode` e no catálogo. Não altera permissão de rota.

### Até onde o defeito fica resolvido

O sintoma "sucesso sem efeito visível" acabou: a tela ou mostra os grupos, ou diz por que não consegue
mostrá-los. Mas **o vínculo só aparece nomeado se o backend devolver a origem por grupo**.
`OrigemPermissaoEfetivaResponse.CargoAcessoId` é não anulável, o que sugere que apenas o caminho
cargo → grupo entra em `origens`. Se o grupo atribuído direto por `POST /{id}/grupos-acesso` não entrar
ali, a tela exibirá o estado "origem indisponível" com a contagem de permissões efetivas — honesto, mas
ainda não é o nome do grupo.

## 4. Pendências que dependem do backend

| # | Item | Efeito hoje |
| --- | --- | --- |
| 1 | `UsuarioResponse` não expõe `GruposAcesso` | Grupos dependem de `origens` de `permissoes-efetivas`. O frontend já prefere o campo automaticamente caso ele passe a existir. |
| 2 | `OrigemPermissaoEfetivaResponse.CargoAcessoId` não anulável | Vínculo direto pode não aparecer em `origens`; a tela trata como "origem indisponível". |
| 3 | `AtribuirGrupoUsuarioRequest` não tem `Motivo`, mas `RemoverGrupoUsuarioRequest` tem | O frontend coleta e envia motivo no vínculo; o backend descarta. Nesta versão apenas se deixou de prometer a auditoria no texto. Payload não alterado. |
| 4 | `buildCriarUsuarioPayload` envia `login` e `gruposAcessoIds`, ausentes do contrato | Provável segunda ocorrência do mesmo defeito: "Novo usuário" com grupos pode criar usuário sem grupo. Não alterado — `tests/unit/segurancaUsuarioPayload.test.ts` cristaliza o payload atual. Precisa de confirmação. |

## 5. Validação executada

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run build
```

Testes por módulo (política do projeto: escopo por módulo, nunca a suíte completa):

```bash
npx vitest run tests/components/empresaFilialContextControlsB47C2.test.tsx tests/components/filialSelectB47C2.test.tsx tests/unit/organizationalContextTopbarStructure.test.ts tests/unit/filiaisContextControlsB47C2.test.ts tests/unit/organizationalContextPolicy.test.ts tests/unit/administracaoFiliaisTransport.test.ts
npx vitest run tests/unit/relatoriosB44Structure.test.ts tests/unit/auditoriaB45Structure.test.ts tests/unit/atividadesB43Structure.test.ts tests/unit/estoqueB41Structure.test.ts tests/unit/estoqueUxRules.test.ts tests/unit/financeiroB42Structure.test.ts tests/unit/administracaoReferenceUx.test.ts tests/unit/comprasUxRules.test.ts
npx vitest run tests/unit/segurancaB39Structure.test.ts tests/unit/permissions.test.ts tests/unit/routePermissions.test.ts tests/unit/backendContractMap.test.ts
```

## 6. Gate de regressão do defeito de CSS

O defeito 1 era **CSS**, e jsdom não aplica SCSS. Os testes estruturais existentes eram `toContain` de
string sobre o fonte e **passavam com o botão invisível** — nenhum deles poderia ter pego o bug.

Foi criado `tests/unit/topbarButtonCssContract.test.ts`, que lê o SCSS e o markup e falha se:

- houver regra aninhada com seletor de elemento `span` dentro de `.layout-topbar-button` (a condição
  exata que originou o defeito);
- a ocultação do rótulo deixar de usar `.layout-topbar-button-label`;
- algum `<span>` dentro de um `<button class="… layout-topbar-button …">` não carregar essa classe;
- o botão de contexto deixar de usar `<i>` nativo para o ícone.

O gate foi validado por negação: reintroduzindo a regra `span { … }` no SCSS, o primeiro caso falha; com
o SCSS correto, os quatro passam.

### Verificação em navegador

Login não foi executado (não digito credenciais). O efeito real do CSS compilado foi medido
diretamente no preview, injetando o markup do topbar e lendo `getComputedStyle`:

| Medida | Desktop | Mobile (375px) |
| --- | --- | --- |
| Ícone `<i class="pi pi-building">` | `display: block`, 21×21px | `display: block` |
| Rótulo `.layout-topbar-button-label` | `display: none` (correto) | `display: block`, visível |
| `<span class="pi … p-button-icon">` do PrimeReact | `display: block` — deixou de ser engolido | — |
| Botão de contexto | 42×42px | — |

Falta apenas a confirmação visual autenticada das telas de Filiais, Setores, Cargos e Usuários.
