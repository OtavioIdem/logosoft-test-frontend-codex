# Escopo e entrega — central de Cadastros

Agente: `arquiteto-escopo-entrega`. Rodada de arquitetura 21, assunto
`central-cadastros`. Insumo: `docs/arquitetura/debate/21-inventario-central-cadastros.md`.
Esta é uma posição de escopo; não arbitra a rodada e não autoriza implementação.

## Base fixada e marco

```text
$ node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
1.11.0-a.8.b76
1.11.0a8b76
```

O plano da `b76` está em `release` e registra o terceiro QA como `APROVADO`
(`docs/fatias/v1.11.0a8b76-fiscal-v124-validacoes.md:103-108`). Portanto, a próxima
entrega funcional pode ser `b77`; não proponho uma corretiva da `b76` para misturar navegação
de Cadastros com dívida fiscal.

O marco desta rodada, extraído do pedido do usuário, é objetivo e não de calendário:

> Todo dado mestre ou configuração hoje exibido no menu deve ser alcançável pela única entrada
> visual **Cadastros**, em ordem que mostre a cadeia de preparação do ERP, sem perda de acesso e
> sem alterar contrato de negócio das telas filhas.

Não foi informada data-limite. A sequência abaixo otimiza risco e capacidade de prova, não prazo
de calendário.

## Posição resumida

**Não migrar os 34 itens em uma única versão.** O inventário mediu 34 rotas de cadastro,
configuração ou natureza mista, das quais somente 8 estão hoje sob o grupo visual `Cadastros` e
26 estão espalhadas por outros onze grupos (inventário §2). Uma única fatia teria, ao mesmo tempo,
um padrão de tela novo, mudança de navegação, matriz de permissões de onze domínios e cinco telas
com ações operacionais. O custo de provar acesso e regressão ficaria concentrado num diff que não
tem corte seguro para correção.

Minha posição é uma migração em **quatro versões funcionais consecutivas**, `b77` a `b80`. Cada
versão entrega itens reais na central, retira do menu antigo apenas os itens já provados naquela
onda e conserva as URLs atuais como deep links. O destino final continua contendo os 34 itens; o
fatiamento não reduz o pedido do usuário.

“Unificar comportamentos”, nesta rodada, significa unificar os comportamentos da **superfície de
acesso**:

- uma única entrada `Cadastros`;
- agrupamento e ordem por cadeia de preparação;
- seleção representável na URL e deep link preservado;
- mesma regra de visibilidade por permissão do recurso;
- só a tela ativa monta e consulta dados;
- mesmos estados de carregamento, vazio da central, erro recuperável, permissão negada, sucesso e
  ação indisponível com motivo na moldura da central.

Não significa reescrever, numa só rodada, CRUD, payload, validação ou regra de negócio dos 34
componentes. Os componentes filhos continuam donos de seus contratos e ações.

## Linha de corte

### Dentro

1. Uma rota/tela central de Cadastros e uma única entrada correspondente no menu.
2. Os **34 itens** inventariados, distribuídos nas quatro ondas abaixo; nenhum item exibido de
   cadastro/configuração fica fora do destino final.
3. Registro único dos itens da central com rótulo, grupo, ordem, rota existente e permissões
   existentes. A central aparece para quem puder ver ao menos um item e mostra somente os itens
   que essa pessoa pode acessar.
4. Preservação das rotas existentes. Link salvo, favorito, notificação ou integração que aponta
   para uma URL antiga continua funcionando.
5. Retirada progressiva dos atalhos duplicados dos grupos antigos somente quando o mesmo item já
   estiver navegável e provado na central. Rota não é removida.
6. Correção de `DIV-2` na onda de Pessoas: `CLASSIFICACOES_PESSOA_GERENCIAR` precisa conceder
   visibilidade e acesso ao cadastro que já protege, além de `PESSOAS_CONSULTAR`.
7. Prova estrutural nominal por item e por onda: item no registro, rota existente, permissão
   declarada e ausência de duplicidade no menu após a migração.
8. Teste de componente da central e E2E de navegação/permissão em cada versão. Como há
   `navigationChange` e `permissionChange`, o E2E não é opcional pelo grafo de execução.
9. Entrada descritiva no `CHANGELOG.md` por versão, incluindo eventual mudança de acesso. A regra
   específica atual do projeto substitui a criação de novos `docs/IMPLEMENTACAO_*.md`.

### Fora

1. **Cadastros bancários ocultos** (`/bancos`: bancos, contas, convênios e carteiras).
   Motivo: a própria tela está bloqueada e os quatro `GET`s não existem no contrato utilizável
   (`DIV-4`). Exibir placeholder na cadeia faria a central prometer cadastro que não funciona.
   **Gatilho de volta:** os quatro contratos de consulta existirem, com permissão e estados de
   tela verificáveis.
2. **As 48 rotas operacionais/ferramentas** da seção 3 do inventário. Criar registro não torna
   pedido, nota, baixa, inventário, viagem ou lançamento contábil um cadastro mestre.
   **Gatilho de volta:** inventário novo provar que uma dessas rotas mantém uma entidade mestre
   consumida por outros fluxos, e não um documento/evento operacional.
3. **Mudança de endpoint, payload, schema ou regra de negócio** dos componentes filhos.
   Motivo: a central é composição/navegação; não há contrato de backend novo no inventário.
   **Gatilho de volta:** divergência de contrato encontrada por uma onda específica, tratada em
   fatia própria antes de essa tela migrar.
4. **Permissão global nova** como `CADASTROS_ACESSAR`.
   Motivo: ela duplicaria as permissões de domínio e criaria risco de alguém ver a central, mas
   não o recurso — ou o contrário.
   **Gatilho de volta:** requisito explícito de auditoria/administração provar que a entrada da
   central precisa ser concedida separadamente dos recursos.
5. **Reescrita visual e funcional completa dos 34 CRUDs.**
   Motivo: sem baseline de diferenças, a rodada misturaria navegação, UX e regra de negócio em
   onze domínios.
   **Gatilho de volta:** central fechada em `b80`, inventário de comportamento por família e pelo
   menos dois consumidores comprovados para cada abstração proposta.
6. **Remoção das rotas antigas.**
   Motivo: quebra favoritos, links enviados e integrações; não é necessária para obter um único
   ponto no menu.
   **Gatilho de volta:** telemetria ou busca no repositório provar ausência de consumidores e
   existir plano de redirect compatível. Sem isso, o corte não é seguro.

### Depois

1. Normalização interna dos CRUDs por família (listagem, diálogo, ativar/inativar, vigência,
   conflito e auditoria), depois da `b80` e baseada em inventário próprio. Isso é parte válida da
   visão de “unificar comportamentos”, mas não é pré-requisito para centralizar o acesso.
2. Cadastros bancários quando o backend fechar os quatro contratos de leitura.
3. Eventual endurecimento dos guards catch-all de Produtos, RH, Produção, Contábil e Patrimônio
   (`DIV-3`). A central não deve copiar esses catch-alls; porém restringir as URLs antigas pode
   retirar acesso existente e exige versão com plano operacional próprio.
4. Busca global/favoritos/recentes dentro da central, depois de medir que a navegação por cadeia
   não basta. São conforto, não condição para o operador encontrar o cadastro.

## Sequência de versões

### `b77` — fundação da central e organização/acesso (7 itens)

Entra: Usuários, Grupos de acesso, Empresas, Filiais, Setores, Cargos e Centros de custo.

Dependência que justifica vir primeiro: empresa, filial, setor, cargo e centro de custo formam o
contexto organizacional que outras famílias referenciam. Usuários e grupos determinam quem pode
executar as ondas seguintes. A própria central ganha chamadores no mesmo dia: os sete itens; não
existe shell sem conteúdo.

Entrega observável: entrada única `Cadastros`, cadeia “Acesso → Organização” e retirada dos sete
atalhos antigos após prova. URLs antigas continuam válidas.

Gates mínimos:

- teste estrutural nominal dos 7 itens, rotas e permissões;
- componente: filtro por permissão, estado vazio/negado, troca de item e montagem apenas do ativo;
- E2E com ao menos perfil de consulta, perfil de gestão e perfil sem acesso, duas execuções no
  servidor isolado definido pelo grafo;
- `validate:source`, `typecheck`, `lint`, `validate:ci`, build e QA.

### `b78` — pessoas e catálogo comercial (8 itens; acumulado 15)

Entra: Pessoas, Clientes, Fornecedores, Classificações de pessoa, Produtos, Categorias, Unidades
de medida e Marcas.

Dependência: pessoas e catálogo são mestres consumidos por vendas, compras, estoque, fiscal e
financeiro. Eles vêm depois da organização porque cadastros empresariais e de acesso já precisam
estar localizáveis antes de os operadores montarem o catálogo de negócio.

Entrega observável: cadeia “Pessoas → Parceiros → Catálogo”, correção de `DIV-2` e retirada dos
oito atalhos antigos após prova.

Gates adicionais: matriz nominal das permissões de catálogo, teste do usuário com somente
`CLASSIFICACOES_PESSOA_GERENCIAR`, teste de deep link e registro operacional no `CHANGELOG` para
a expansão de acesso de `DIV-2`.

### `b79` — fundamentos transacionais (9 itens; acumulado 24)

Entra: Locais de estoque, Tabelas de preço, Formas de pagamento, Condições de pagamento, Séries
fiscais, Naturezas de operação, Regras fiscais, Exceções e benefícios e Exceções por NCM.

Dependência: esses parâmetros só têm chamador útil depois de organização, pessoas e produtos.
Uma série fiscal sem filial ou uma tabela de preço sem catálogo seria o “motor sem chamador” que
a régua de fatiamento proíbe.

Entrega observável: cadeia “Estoque → Comercial/Financeiro → Fiscal”, com os nove atalhos antigos
retirados após prova.

Gates adicionais: cada item fiscal/financeiro invisível sem sua permissão, nenhuma consulta das
oito telas inativas ao abrir a central e E2E cobrindo troca entre domínios sem vazar estado.

### `b80` — cadastros de domínio e telas mistas (10 itens; acumulado 34)

Entra: Veículos, Motoristas, Colaboradores, Jornadas, Benefícios, Fichas técnicas, Plano de
contas, Períodos, Regras de contabilização e Bens.

Dependência: as famílias de Frota, RH, Produção, Contábil e Patrimônio dependem de organização,
centro de custo, pessoas ou produtos já centralizados. Ficam por último porque cinco superfícies
misturam cadastro com transição operacional (`DIV-5`) e exigem prova de regressão maior.

Entrega observável: os 34 itens inventariados estão na central e os grupos antigos não exibem mais
atalhos cadastrais. Nas cinco telas mistas, a central abre a tela inteira; desligar colaborador,
fechar período, transferir/baixar bem e demais ações existentes continuam protegidos e não são
extraídos nem reinterpretados.

Gates adicionais: regressão nominal das ações mistas, contagem estrutural final `34/34`, ausência
de duplicidade no menu, deep links antigos funcionais e E2E dos onze domínios representados.

## Regra de promoção entre ondas

Uma onda só permite iniciar a seguinte quando:

1. todos os itens da onda estão acessíveis pela central para os mesmos usuários que viam o item
   antigo;
2. nenhum item sem permissão aparece ou monta consulta;
3. as URLs antigas continuam funcionais;
4. o item antigo foi retirado do menu apenas depois da prova do novo caminho;
5. testes do recorte, gates, E2E e QA fecharam;
6. o `CHANGELOG` explica qualquer expansão ou perda de acesso antes do deploy.

Se uma onda falhar, corrige-se com `.cN`; não se inicia a próxima `bNN` com a anterior bloqueada.

## Trade-offs aceitos

| Corte | O que se perde | Quando dói | Reversível? |
|---|---|---|---|
| Quatro versões, não uma | O cliente convive temporariamente com uma central parcial | Entre `b77` e `b79`, ao procurar um item de onda ainda não migrada | Sim; a próxima onda completa a cadeia e as rotas antigas continuam disponíveis |
| Retirar atalhos por onda | Durante a transição, alguns grupos ainda têm cadastros e outros já não | Treinamento/documentação durante a implantação gradual | Sim; ordem e itens de menu são restauráveis sem mudar dados |
| Não reescrever os 34 CRUDs | Diferenças internas de diálogo, listagem e ações permanecem após entrar na central | Depois que o usuário abre a tela filha e compara módulos | Sim; normalização entra depois, com inventário próprio |
| Manter deep links antigos | Tecnicamente ainda existem 34 URLs, embora haja uma entrada visual | Auditoria que interprete “uma aba” como uma única URL física | Não há corte seguro; remover agora quebraria consumidores desconhecidos |
| Telas mistas entram inteiras | A central também expõe ações operacionais dentro dessas telas | Se o usuário esperar uma área estritamente só de inclusão/edição | Sim; uma rodada futura pode separar a entrada cadastral sem alterar dados |
| Banco fora | A cadeia não cobre banco/conta/convênio/carteira | Implantação financeira continua dependente de meio externo/backend | Sim; volta quando os quatro GETs existirem |

## O que eu abro mão

1. **Abro mão da entrega “tudo em uma única versão”.** O custo é pagar quatro vezes o ritual de
   versão, E2E e QA. Aceito porque cortar prova em uma mudança de navegação/permissão apenas adia
   o custo, e um diff com 34 destinos de onze domínios dificulta isolar qualquer perda de acesso.
2. **Abro mão de uniformizar o CRUD interno agora.** Isso deixa dívida visual/comportamental
   visível dentro das telas filhas. O corte é reversível porque nenhum payload, query key ou dado
   digitado muda; a central cria uma moldura comum sem duplicar regra de negócio.
3. **Abro mão de exibir cadastros bancários como “em breve”.** A central fica menos completa para
   a implantação financeira, mas não cria um botão sem chamador/contrato. Retorno com gatilho
   objetivo, não por desejo.
4. **Não abro mão de teste, gate estrutural ou E2E de permissão.** São parte do custo de cada onda,
   não conforto. Também não abro mão dos sete estados de tela obrigatórios na central.
5. **Não abro mão dos 34 itens finais.** O fatiamento altera a ordem de entrada, não o destino do
   pedido explícito. Qualquer proposta que encerre em `b77`, `b78` ou `b79` é entrega parcial, não
   conclusão da centralização.

## Riscos e pendências para a síntese

- `DIV-3`: guards catch-all mais amplos que os itens de menu. Minha posição preserva as URLs e
  não usa o catch-all para decidir visibilidade da central. Endurecer os guards antigos é outra
  decisão, pois pode produzir perda de acesso.
- `DIV-5`: telas mistas entram inteiras nesta posição. Se Operação ou Design provar que isso torna
  a cadeia enganosa, a alternativa segura é manter o item na central como destino e rotular as
  ações operacionais; não cortar o cadastro dos 34.
- Não há prazo de calendário. Se houver uma data que comporte menos de quatro versões, o corte
  deve reduzir ondas temporariamente, nunca gates; o marco final permanece `34/34`.
- O backend e o runtime das telas filhas não foram revalidados nesta posição. A mudança proposta
  reutiliza seus contratos, mas cada onda continua responsável pelos testes de regressão do
  recorte.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "central-cadastros",
  "slice": "v1.11.0a8b77..v1.11.0a8b80",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/21-escopo-central-cadastros.md",
  "changedFiles": [
    "docs/arquitetura/debate/21-escopo-central-cadastros.md"
  ],
  "decisoesPropostas": [
    {
      "id": "D-CAD-ESC-1",
      "titulo": "Migrar os 34 cadastros em quatro versões funcionais b77-b80, sem reduzir o destino final",
      "reversivel": true,
      "gatilho": "cada onda remove somente atalhos já provados; URLs antigas permanecem"
    },
    {
      "id": "D-CAD-ESC-2",
      "titulo": "Unificar nesta rodada a superfície de acesso, não os contratos e regras de negócio dos 34 CRUDs",
      "reversivel": true,
      "gatilho": "após b80, inventário de comportamento por família autoriza normalização interna"
    },
    {
      "id": "D-CAD-ESC-3",
      "titulo": "Usar permissões existentes por item e não criar uma permissão global de Cadastros",
      "reversivel": false,
      "gatilho": "não cortar sem requisito explícito de administração e plano de migração de acesso"
    },
    {
      "id": "D-CAD-ESC-4",
      "titulo": "Incluir as cinco telas mistas como destinos completos na b80, preservando suas ações e guards",
      "reversivel": true,
      "gatilho": "inventário futuro provar necessidade de separar cadastro e transição operacional"
    },
    {
      "id": "D-CAD-ESC-5",
      "titulo": "Manter cadastros bancários fora até existirem quatro contratos GET utilizáveis",
      "reversivel": true,
      "gatilho": "bancos, contas, convênios e carteiras com consultas, permissões e estados verificáveis"
    }
  ],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "MISSING_REQUIREMENT",
      "pergunta": "Existe data-limite que obrigue menos de quatro versões?",
      "decide": "somente o agrupamento das ondas; não autoriza cortar gates nem reduzir o destino final de 34 itens"
    },
    {
      "tipo": "PERMISSION_MISMATCH",
      "pergunta": "DIV-3 deve endurecer os guards antigos ou apenas impedir que a central copie o catch-all amplo?",
      "decide": "se haverá uma fatia própria de migração de acesso depois da centralização"
    }
  ],
  "measurements": [
    {
      "o_que": "rotas cadastrais/configuráveis no menu",
      "valor": 34,
      "como": "contagem fechada na seção 2 do inventário 21"
    },
    {
      "o_que": "itens já no grupo Cadastros versus itens dispersos",
      "valor": "8/34 no grupo; 26/34 dispersos",
      "como": "medição declarada no inventário 21, seção 2"
    },
    {
      "o_que": "fatiamento proposto",
      "valor": "7 + 8 + 9 + 10 = 34",
      "como": "enumeração nominal nas versões b77, b78, b79 e b80 deste documento"
    }
  ],
  "gates": {
    "inventario_34_itens": "passed",
    "conta_do_fatiamento": "passed",
    "testes": "not_run",
    "e2e": "not_run",
    "build": "not_run"
  },
  "blockers": [],
  "riscos": [
    "Sem prazo de calendário, a sequência prioriza reversibilidade e prova; uma data-limite pode exigir reagrupar ondas.",
    "DIV-3 permanece decisão de acesso separada: restringir guards antigos pode retirar acesso existente.",
    "Cinco telas mistas exigem regressão das ações operacionais na b80.",
    "Cadastros bancários continuam fora enquanto quatro contratos GET estiverem ausentes."
  ],
  "handoff": {
    "testsRequired": true,
    "e2eRequired": true,
    "qaReviewRequired": true,
    "notes": "Orquestrador deve arbitrar com Operação, Plataforma e Design e registrar a decisão; esta posição não autoriza código."
  },
  "nextRecommendedAgent": "orquestrador-sintese"
}
```
