# 21 — Operação: central de cadastros

Agente: `arquiteto-operacao-erp`. Rodada de arquitetura 21, assunto
`central-cadastros`, nó `arquitetura` do `graph_arquitetura`. Insumo:
`docs/arquitetura/debate/21-inventario-central-cadastros.md` (citado como
"inventário" abaixo) e decisões anteriores relacionadas em
`docs/arquitetura/DECISOES.md`. Proponho; não decido — a síntese e a decisão
travada pertencem ao orquestrador.

Meu viés declarado: a central deve ensinar **a preparação do ERP para operar**.
Ela não deve transformar toda tela que grava um registro em cadastro nem copiar
operações diárias para um segundo lugar.

## 1. Posição resumida

As **34 rotas** classificadas pelo inventário como cadastro, configuração ou
mistas devem aparecer na central, organizadas numa cadeia de implantação. A
medição e a lista nominal estão no inventário §2: hoje somente 8 dessas rotas
estão no grupo visual `Cadastros`, enquanto 26 ficam distribuídas por onze
grupos (`21-inventario-central-cadastros.md:53-93`).

Das 34:

- **29** entram integralmente como cadastro ou configuração reutilizável;
- **5** entram na central somente pela sua parte cadastral: Veículos,
  Colaboradores, Benefícios, Períodos contábeis e Bens;
- as transições operacionais dessas cinco continuam nos módulos de origem. A
  separação é necessária porque os próprios clients misturam CRUD com alteração
  de status/manutenção (`features/frota/api/frotaApi.ts:68-95`), desligamento e
  concessão (`features/rh/api/rhApi.ts:72-74,140-159`), fechamento/reabertura
  (`features/contabil/api/contabilApi.ts:62-68`) e transferência, bloqueio e
  baixa (`features/patrimonio/api/patrimonioApi.ts:53-66`).

Isto significa: o cadastro de um veículo é parte da preparação; concluir uma
manutenção não é. Cadastrar um colaborador é preparação; desligá-lo é uma
operação de RH. Definir um benefício é configuração; concedê-lo a alguém é uma
operação. Criar um período é preparação; fechar ou reabrir é fechamento
contábil. Cadastrar um bem é preparação; transferir, bloquear ou baixar é
operação patrimonial.

## 2. Fluxo do operador

### Fluxo A — implantar uma empresa nova

```text
0. Administrador prepara acesso: Grupos de acesso -> Usuários.
1. Implanta a estrutura: Empresas -> Filiais -> Setores -> Cargos -> Centros de custo.
2. Prepara os atores: Classificações de pessoa -> Pessoas -> Clientes -> Fornecedores.
3. Prepara o catálogo: Unidades de medida -> Categorias -> Marcas -> Produtos -> Locais de estoque.
4. Prepara a venda e o financeiro: Formas de pagamento -> Condições de pagamento -> Tabelas de preço.
5. Prepara a emissão fiscal: Naturezas de operação -> Séries fiscais -> Regras fiscais ->
   Exceções e benefícios -> Exceções por NCM.
6. Prepara capacidades específicas: Jornadas -> Benefícios -> Colaboradores; Veículos ->
   Motoristas; Fichas técnicas.
7. Prepara contabilidade e patrimônio: Plano de contas -> Períodos -> Regras de
   contabilização -> Bens.
8. Sai da central e executa a operação no módulo correspondente: pedido, nota,
   movimento de estoque, baixa, fechamento, viagem, ordem ou inventário.
```

A ordem acima é **orientação operacional**, não regra de validação. O inventário
não verificou dependências do backend nem os campos internos dos 34 formulários
(`21-inventario-central-cadastros.md:12-18,128-152`). Portanto o frontend não
pode bloquear uma etapa porque a anterior parece incompleta, nem concluir que
uma empresa está "100% configurada" pela mera existência de registros. Se o
backend rejeitar um cadastro por dependência, a central deve mostrar o erro que
ele devolveu e oferecer retorno ao passo correspondente; não deve reproduzir a
regra no navegador.

### Fluxo B — manutenção diária de um cadastro

```text
1. O operador abre /cadastros.
2. Vê somente os grupos e recursos que suas permissões atuais permitem consultar.
3. Escolhe um domínio ou busca pelo nome do cadastro.
4. A central monta somente o recurso ativo e preserva o comportamento da tela filha.
5. O operador lista, cria ou edita conforme a permissão específica já existente.
6. Ao salvar, recebe o sucesso ou erro da tela filha; a central não troca payload,
   endpoint, schema, regra de inativação nem contexto organizacional.
7. Ao terminar, volta à cadeia no mesmo grupo e passo, sem procurar o recurso em
   outro módulo do menu.
```

Os 34 componentes já têm famílias próprias de endpoints e schemas; a central
não precisa de endpoint de gravação próprio (`21-inventario-central-cadastros.md:128-152`).
Ela compõe acesso e orientação. Também não pode montar as 34 telas de uma vez,
porque isso dispararia consultas que o operador não abriu e misturaria erros de
domínios diferentes; somente a tela ativa participa do fluxo.

### Fluxo C — erro e correção

```text
1. Uma operação ou cadastro é recusado pelo backend.
2. A tela mantém os dados digitados e apresenta código/mensagem/campos retornados.
3. Se o erro identificar um cadastro faltante e existir mapa explícito por código,
   o operador abre o passo da central em nova navegação preservando o contexto.
4. Corrige o cadastro com a permissão própria daquele recurso.
5. Retorna manualmente à operação original e repete a ação.
```

Não proponho inferir destino pelo texto do erro nem criar uma tabela genérica de
"pré-requisitos" no frontend. O precedente D50 já determinou, para erros
fiscais, mapeamento por `Error.Code`, nunca pela mensagem
(`docs/arquitetura/DECISOES.md:1443-1450`). Esse é o limite seguro para atalhos
de correção em outros módulos também.

## 3. Cadeia que a central precisa mostrar

| Etapa | Cadastros/configurações na central | Destino operacional posterior |
|---|---|---|
| Acesso | Grupos de acesso; Usuários | autenticação e autorização em todos os módulos |
| Estrutura organizacional | Empresas; Filiais; Setores; Cargos; Centros de custo | contexto de empresa/filial e alocação organizacional |
| Pessoas e parceiros | Classificações; Pessoas; Clientes; Fornecedores | Vendas, Compras, Financeiro e Fiscal |
| Produtos e estoque | Unidades; Categorias; Marcas; Produtos; Locais de estoque | Estoque, Compras, Vendas, Produção e Fiscal |
| Comercial e financeiro | Formas; Condições; Tabelas de preço | Pedido, faturamento e títulos |
| Fiscal | Naturezas; Séries; Regras; Exceções gerais; Exceções por NCM | Nota, faturamento e escrituração |
| Recursos operacionais | Jornadas; Benefícios; Colaboradores; Veículos; Motoristas; Fichas técnicas | RH, Frota e Produção |
| Contábil e patrimonial | Plano de contas; Períodos; Regras de contabilização; Bens | Lançamento, fechamento, depreciação, transferência e baixa |

As 34 entradas acima correspondem exatamente às linhas do inventário
(`21-inventario-central-cadastros.md:55-88`). As 48 rotas operacionais da seção
3 do inventário ficam fora: criar pedido, emitir nota, movimentar estoque,
processar CNAB, fechar caixa, apontar produção, fazer inventário ou consultar
auditoria são trabalho diário, não preparação (`21-inventario-central-cadastros.md:95-126`).

## 4. Tratamento das cinco superfícies mistas

| Rota | Entra na central | Fica no módulo de origem |
|---|---|---|
| `/frota/veiculos` | listar, criar e editar veículo | alterar estado e registrar/concluir/cancelar manutenção |
| `/rh/colaboradores` | listar, criar e editar o vínculo cadastral | desligar colaborador e demais eventos trabalhistas |
| `/rh/beneficios` | definir e manter o catálogo de benefícios | conceder benefício a colaborador |
| `/contabil/periodos` | cadastrar/consultar período | fechar e reabrir período |
| `/patrimonio/bens` | listar, criar e editar bem | transferir, bloquear, desbloquear e baixar |

Minha preferência operacional é que a mesma rota possa ser alcançada pelos dois
contextos, mas abra no modo correto: `cadastro` quando veio da central e
`operacao` quando veio do módulo. A permissão e o backend continuam decidindo
quais ações existem. Se separar as ações for tecnicamente caro, a alternativa
aceitável é a central abrir a tela existente inteira e manter também o atalho no
módulo; o custo é o usuário ainda enxergar ações operacionais dentro de
Cadastros, mas nenhuma capacidade é perdida.

Não aceito mover as ações operacionais exclusivamente para a central. Isso faria
o operador de RH sair do fluxo de RH para desligar alguém, o contador sair do
fechamento para reabrir período e a Frota sair da manutenção para concluir uma
ordem.

## 5. Onde o fluxo quebra hoje

1. Não há rota `/cadastros`, componente central nem guard; “Cadastros” é somente
   um grupo com oito links (`21-inventario-central-cadastros.md:173-182`). O
   operador não enxerga a cadeia dos passos 1 a 7.
2. Empresas, filiais, setores e cargos ficam em Administração; séries e
   naturezas ficam em Fiscal; os demais cadastros ficam espalhados. Esta é a
   divergência DIV-1 medida no inventário (`21-inventario-central-cadastros.md:186-190`).
3. A permissão de gerenciar Classificações protege as mutações, mas não concede
   sozinha visibilidade nem acesso à tela; o `GET` depende de consulta. A central
   deve preservar a exigência de consulta e não prometer uma tela utilizável a
   quem só pode gerenciar (`21-inventario-central-cadastros.md`, DIV-2; decisão
   D68 em `docs/arquitetura/DECISOES.md:1934-1967`).
4. Produtos, RH, Produção, Contábil e Patrimônio têm guards de rota mais amplos
   que os itens específicos. A central deve filtrar cada entrada pela permissão
   nominal do recurso, não pelo catch-all do módulo (inventário DIV-3).
5. Cadastros bancários possuem página placeholder, mas faltam quatro consultas
   de backend e não há item no menu. Eles não entram como uma 35ª tela utilizável
   nesta rodada (`21-inventario-central-cadastros.md`, DIV-4). A cadeia deve
   registrar “Configuração bancária — indisponível” somente se Segurança e
   Produto aceitarem revelar capacidade sem contrato; não deve oferecer um link
   que termina em bloqueio.

## 6. O que a central precisa permitir

1. **Encontrar por cadeia e por nome.** Destrava os Fluxos A e B sem depender de
   o operador conhecer o módulo técnico dono do endpoint.
2. **Preservar permissões por recurso.** Destrava acesso legítimo sem ampliar
   capacidade: ver a central não autoriza consultar ou gravar todos os filhos.
3. **Preservar contexto organizacional.** Empresa e filial ativas continuam nas
   consultas dos componentes filhos; a central deve deixar esse contexto
   visível antes do operador gravar algo que o usa.
4. **Montar somente o recurso ativo.** Destrava a navegação sem disparar 34
   consultas nem misturar estados de loading/erro.
5. **Manter endereço direto e retorno.** Bookmark, link de erro e atalhos de
   módulos precisam abrir o mesmo cadastro e permitir voltar ao mesmo ponto da
   cadeia; as rotas atuais não podem simplesmente deixar de existir.
6. **Distinguir consulta de gestão.** Quem só consulta pode percorrer e ler; os
   botões de criar/editar/inativar continuam desabilitados ou ausentes conforme
   a permissão já usada pela tela filha.
7. **Explicar indisponibilidade sem inventar regra.** Falha de permissão, contrato
   inexistente ou erro do backend têm mensagens diferentes; cadastro bancário
   não pode parecer “etapa concluída” ou “lista vazia”.
8. **Não aceitar identificador técnico digitado.** Todo vínculo entre os passos
   continua por seletor com rótulo e busca; a central não cria campos de GUID.
9. **Manter ações operacionais junto da rotina.** Destrava o trabalho diário das
   cinco superfícies mistas sem obrigar o operador a voltar à implantação.

## 7. Impacto em módulos vizinhos

- **Vendas, Compras, Financeiro, Estoque e Fiscal:** passam a ter um caminho
  único para corrigir dados mestres, mas seus documentos, validações e efeitos
  permanecem nos módulos. Não há mudança de regra de geração de título, saldo,
  imposto ou nota.
- **RH, Frota, Contábil e Patrimônio:** ganham uma entrada cadastral na central,
  mas preservam as transições de ciclo de vida nos módulos, conforme §4.
- **Segurança:** a central agrega links sujeitos a permissões heterogêneas. Uma
  permissão para um filho não pode abrir outro filho nem ampliar o guard da rota
  original.
- **Backend:** nenhum payload, enum, validação, transação ou workflow muda. A
  central apenas reutiliza as famílias de API já inventariadas; respostas reais
  do backend não foram verificadas nesta rodada.
- **Bancos:** permanece um buraco operacional de implantação. Boletos e CNAB são
  operações expostas, enquanto bancos/contas/convênios/carteiras não têm
  consultas utilizáveis na página existente (inventário DIV-4).

## 8. O que eu abro mão

1. Não exijo um assistente linear que obrigue o operador a completar a etapa
   anterior. Aceito uma cadeia orientativa e navegável; sem endpoint de
   prontidão, progresso seria regra inventada no frontend.
2. Não exijo unificar os 34 formulários, payloads ou componentes. Aceito que
   cada recurso preserve seu padrão atual nesta rodada; a unificação inicial é
   de localização, linguagem de estados e retorno à cadeia.
3. Não exijo retorno automático à operação que originou a correção. Aceito que
   o operador volte manualmente ao documento, desde que o cadastro correto seja
   alcançável e o contexto da central seja preservado.
4. Aceito que as cinco telas mistas apareçam inteiras na primeira entrega se a
   separação de modo for grande demais, desde que continuem também nos módulos
   de origem e nenhuma operação migre exclusivamente para Cadastros.
5. Aceito que cadastro bancário fique fora da contagem utilizável enquanto os
   quatro GETs não existirem; não aceito esconder a pendência do roteiro de
   implantação do produto.
6. Não determino abas, cards, menu lateral, responsividade nem componente. A
   posição de design decide a forma, desde que a cadeia, busca, permissão e
   retorno acima sobrevivam.

## 9. Perguntas externas

1. **[cliente]** A cadeia deve ser apenas recomendada ou existe uma ordem
   obrigatória de implantação por perfil de cliente? Decide se a central é guia
   navegável ou se precisa de bloqueios — estes só podem existir com regra
   confirmada no backend.
2. **[backend/produto]** Existe ou será criado um endpoint que informe prontidão
   de configuração por empresa/filial? Decide se a central pode mostrar
   “pendente/concluído”; sem ele, deve mostrar somente disponibilidade e acesso.
3. **[cliente]** Nas cinco telas mistas, o usuário aceita ver ações operacionais
   quando entra por Cadastros, ou exige modo cadastral sem essas ações? Decide o
   custo de separar a superfície na primeira entrega.
4. **[segurança/cliente]** Usuário sem permissão deve ver o nome da etapa
   bloqueada para entender a cadeia, ou o recurso deve continuar totalmente
   oculto como no menu atual? Decide a política de divulgação da estrutura do
   ERP; até a resposta, preserva-se ocultação por permissão.
5. **[backend/produto]** Qual é a previsão e a permissão de consulta dos quatro
   cadastros bancários hoje sem GET? Decide quando Bancos, Contas, Convênios e
   Carteiras entram como etapas utilizáveis da central.

## 10. Divergências para a síntese

- Se Escopo propuser centralizar somente as 15 telas hoje em Cadastros,
  Administração e Fiscal, discordo: Locais, Tabelas de preço, Formas/Condições,
  RH, Produção, Contábil e Patrimônio continuam pré-requisitos espalhados, e o
  cliente não enxerga “toda a cadeia” que pediu. Aceito fatiar a implementação,
  mas a navegação só deve ser apresentada como central completa quando as 34
  entradas estiverem indexadas.
- Se Plataforma propuser remover as rotas antigas, discordo: links, favoritos e
  correções contextuais precisam continuar chegando ao recurso. Centralização
  do acesso não justifica quebrar endereço público existente.
- Se Design propuser uma única fileira de 34 abas, discordo pelo fluxo: o
  operador precisa primeiro escolher a etapa da cadeia e então o recurso, sem
  varrer dezenas de rótulos.

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "projeto",
  "assunto": "central-cadastros",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/21-operacao-central-cadastros.md",
  "decisoesPropostas": [
    {
      "id": "P21-OP-1",
      "titulo": "As 34 rotas entram na cadeia de cadastros",
      "reversivel": true,
      "gatilho": "inventário identificar nova rota de dado mestre ou reclassificar uma das 34 como operação"
    },
    {
      "id": "P21-OP-2",
      "titulo": "Cinco superfícies mistas preservam as transições operacionais nos módulos de origem",
      "reversivel": true,
      "gatilho": "backend separar CRUD e workflow em recursos e permissões independentes"
    },
    {
      "id": "P21-OP-3",
      "titulo": "A sequência é orientação; prontidão e dependência não são calculadas no frontend sem contrato",
      "reversivel": true,
      "gatilho": "endpoint de prontidão por empresa e filial ser publicado"
    },
    {
      "id": "P21-OP-4",
      "titulo": "Rotas e permissões atuais são preservadas; a central compõe sem ampliar acesso",
      "reversivel": true,
      "gatilho": "migração de rota com redirecionamento e equivalência de permissão comprovados"
    }
  ],
  "discordancias": [
    {
      "de": "arquiteto-escopo-entrega",
      "ponto": "uma central definitiva com apenas o subconjunto Administração/Cadastros/Fiscal não atende a cadeia pedida",
      "impacto": "alto"
    },
    {
      "de": "arquiteto-plataforma-frontend",
      "ponto": "remover rotas antigas quebra retorno, favoritos e links de correção",
      "impacto": "alto"
    }
  ],
  "pendencias": [
    {
      "tipo": "cliente",
      "pergunta": "A ordem da cadeia é recomendação ou obrigação por perfil de cliente?",
      "decide": "se há bloqueio de etapa ou apenas navegação orientada"
    },
    {
      "tipo": "backend",
      "pergunta": "Existe contrato de prontidão de configuração por empresa e filial?",
      "decide": "se a central pode exibir progresso real"
    },
    {
      "tipo": "cliente",
      "pergunta": "As cinco telas mistas precisam ocultar ações operacionais quando abertas pela central?",
      "decide": "se a primeira entrega precisa de modo cadastral separado"
    },
    {
      "tipo": "cliente",
      "pergunta": "Recursos sem permissão ficam ocultos ou visíveis como bloqueados?",
      "decide": "política de divulgação da cadeia completa"
    },
    {
      "tipo": "backend",
      "pergunta": "Quando e com qual permissão os quatro cadastros bancários terão consulta?",
      "decide": "entrada da configuração bancária na central utilizável"
    }
  ],
  "riscos": [
    "Sem contrato de prontidão, o fluxo de implantação não acomoda progresso concluído/pendente; qualquer percentual seria inferência do frontend.",
    "A configuração bancária continua fora do fluxo utilizável enquanto quatro consultas do backend permanecem ausentes.",
    "As cinco superfícies mistas podem continuar exibindo ações operacionais na central se não houver modo cadastral na primeira entrega.",
    "O operador sem permissão não enxerga a cadeia completa enquanto vigorar a política atual de ocultação.",
    "A ordem fina entre cadastros é orientação não verificada no backend e não pode virar bloqueio de gravação.",
    "O retorno automático da correção ao documento operacional ficou fora; o operador precisa voltar e repetir a ação manualmente."
  ]
}
```
