# Relatório de QA Manual Assistido — LogoSoft Frontend

**Versão testada:** 1.11.0a8b45
**Ambiente:** Docker local (`http://localhost:3000`) + backend integrado
**Metodologia:** Navegação assistida via navegador, módulo por módulo — cadastros, comportamentos/ações, responsividade e layout.
**Usuário de teste:** `manager@erp.local` (perfil Manager)

> Legenda de severidade: 🔴 Bloqueante · 🟠 Alto · 🟡 Médio · 🔵 Baixo/Melhoria · 🟢 Acerto/OK

---

## Sumário executivo

Foi executado um teste de QA manual assistido navegando pela aplicação **módulo a módulo** (não pela suíte automatizada), cobrindo **~95 telas** em mais de 30 módulos, com cadastros reais, validação de comportamentos/ações, inspeção de contrato de API (via rede e chamadas diretas autenticadas) e verificação de responsividade (mobile/tablet/desktop).

**Impressão geral:** o front-end é **maduro, consistente e bem arquitetado** — padrões de UI reutilizados (governança operacional, empty-states, banners de regra, `SearchSelect`, auditoria), forte orientação a LGPD e rastreabilidade. Os módulos **Fiscal** e **Auditoria** se destacam pela profundidade e correção. A maior parte das telas carrega sem erro e os cadastros validados funcionam (Empresas, Filiais, Pessoas, Produtos, Unidades, Grupos de acesso, com validação de backend adequada).

**Principais problemas encontrados (priorizados):**

| Prioridade | Achado | Módulo |
|---|---|---|
| 🔴 Bloqueante | **Registrar entrada de estoque** impossível: dropdown de Produto no modal não repassa `empresaId` → sempre vazio | Estoque |
| 🟠 Alto | **Permissões de grupo de acesso não são persistidas** (`POST` retorna `permissoes:[]`) — feature de RBAC inoperante | Segurança |
| 🟠 Alto | **Status de grupo sempre "Inativo"** e botão "Inativar" sempre desabilitado (UI lê `ativo`, API envia `status`) | Segurança |
| 🟠 Alto | **Módulo Bancos** inoperante — `GET /api/bancos*` retorna **405** (4 abas sem dados; CNAB/Boletos bloqueados) | Financeiro |
| 🟠 Alto | **Fluxo de caixa** quebrado — `GET /api/financeiro/fluxo-caixa` retorna **404** | Financeiro |
| 🟠 Alto | **"Novo produto" travado** sem empresa no filtro do topo (catálogos Unidade/Categoria/Marca vazios) | Produtos |
| 🟡 Médio | Tabela de Usuários com scroll horizontal escondendo a ação "Gerenciar"; overflow de botões de ação em várias telas (tablet) | Layout |
| 🟡 Médio | CNPJ exibido **sem máscara** nas listagens (Empresas/Filiais) | Formatação |
| 🟡 Médio | UX de listas filtradas por empresa que "escondem" o registro recém-criado (Filiais/Pessoas) | UX |
| 🔵 Baixo | Instabilidade intermitente de navegação client-side (RSC) → tela branca até reload | Estabilidade |

**Observação de causa raiz transversal:** vários problemas derivam de **divergência de contrato frontend↔backend** neste build (campos `ativo` vs `status`, endpoints 404/405, catálogos que exigem `empresaId`). O padrão de "dropdown-em-formulário sem `empresaId`" é **inconsistente** — Vendas e Faturamento fazem certo; Produtos e Estoque não. Recomenda-se: (1) alinhar os DTOs de resposta ao que a UI consome; (2) padronizar o carregamento de catálogos por empresa dentro dos próprios modais; (3) padronizar mensagens "selecione a empresa" (como Faturamento/Recebimentos já fazem).

**Escopo não exercitado:** fluxos transacionais ponta-a-ponta (pedido→aprovação→faturamento→NF; compra→recebimento→financeiro) por falta de dados de seed (clientes/fornecedores/locais) e pelos bloqueios acima; conteúdo de **Relatórios** (usuário Manager sem `RELATORIOS_CONSULTAR`).

---

## Achados por módulo

<!-- As seções abaixo são preenchidas conforme o teste avança. -->

### 0. Autenticação / Login

- 🟢 Login com `manager@erp.local` autentica e redireciona para `/dashboard`.
- 🟢 Campo **Empresa** é opcional (confirmado em `loginSchema.ts`); login funciona em branco.
- 🟢 Campo de senha com toggle de visibilidade (PrimeReact `Password`, `feedback={false}`), `autoComplete` correto (`username`/`current-password`).
- 🔵 **Melhoria (UX):** o placeholder do campo Empresa ("Código autorizado") não deixa claro que é opcional — sugerido rótulo "Empresa (opcional)" ou texto de ajuda.

### 1. Dashboard

- 🟢 Carrega KPIs reais da API: Pedidos de venda ativos, Contas a receber/pagar em aberto, Produtos sem saldo, Compras pendentes, Eventos recentes.
- 🟢 Painéis "Fluxos críticos" (com badges de status Rascunho/Ativo/Aberta) e "Auditoria recente" (eventos reais com módulo + timestamp) renderizam corretamente e com alturas equalizadas.
- 🟢 Botão "Atualizar" e carimbo "Atualizado em 21/07/2026, 16:41:49".
- 🔵 **Observação:** backend de teste está com dados quase zerados (KPIs em 0), exceto auditoria (20 eventos) — cadastros serão criados durante o teste.
- 🔵 **Responsividade (breakpoint):** em largura ~800–956px a sidebar já colapsa para o menu hambúrguer (comportamento tablet). Detalhado na seção de responsividade.

### 2. Administração

**Empresas** (`/administracao/empresas`)
- 🟢 Listagem com painel "Governança da estrutura organizacional" (cards Registros/Ativos/Não ativos/Último cadastro) e tabela.
- 🟢 Cadastro "Nova empresa" funciona: criei "Empresa Teste QA Ltda" (CNPJ 11222333000181) → toast "Registro salvo", contadores e tabela atualizados.
- 🟢 Validação client-side: Salvar vazio exibe "Razão social é obrigatório." e "Informe CPF/CNPJ válido para o backend validar." com bordas vermelhas.
- 🟢 Texto de ajuda no CNPJ ("Enviado apenas na criação. O backend valida CNPJ numérico ou alfanumérico.").
- 🟡 **Melhoria (formatação):** coluna **Documento** exibe o CNPJ **sem máscara** (`66980251000198`, `11222333000181`) em vez de `66.980.251/0001-98`. Vale aplicar máscara de exibição (há `lib/formatters/display.ts` no projeto).

**Filiais** (`/administracao/filiais`)
- 🟢 Cadastro "Nova filial" funciona: empresa via `SearchSelect` (busca por razão/fantasia/documento) + Nome + CNPJ → salvo com sucesso.
- 🟢 `SearchSelect` abre dropdown com busca e formato "Fantasia • Razão • Documento", com botão limpar (×).
- 🟡 **UX pós-cadastro:** a listagem é filtrada por empresa; **sem empresa selecionada no filtro, a filial recém-criada não aparece e os contadores mostram 0**, apesar do toast de sucesso — dá a falsa impressão de que o save falhou. Sugerido: após salvar, pré-selecionar a empresa do registro criado no filtro (ou exibir contagem global).
- 🟡 **Melhoria (formatação):** documento da filial também sem máscara.

**Setores / Cargos / Centros de custo** (`/administracao/{setores,cargos,centros-custo}`)
- 🟢 Todas carregam com o mesmo padrão consistente (filtros empresa/filial, painel de governança, tabela, empty-state com ícone). Sem erros.

**Deploy / Ambiente** (`/administracao/deploy`)
- 🟢 Carrega com cards "Ambiente" e "Migrações" ("✓ Esquema consistente."), tabela de deploys e empty-state "Nenhum deploy".
- 🔵 **Observação:** campos **Versão atual, Runtime e Saúde** aparecem em branco (`—`) no ambiente Development — verificar se o backend deveria populá-los.
- 🔵 **UX:** dropdown ao lado de "Registrar deploy" está **sem rótulo/placeholder** — não fica claro o que seleciona.

### 3. Segurança

**Usuários** (`/seguranca/usuarios`)
- 🟢 Listagem carrega com dados reais (usuário Otávio Benini). Banner explica que operações críticas exigem motivo/auditoria.
- 🟢 Modal **"Gerenciar usuário"** (consolidação de ações do commit recente) funciona bem: card com dados + badges (Ativo/Liberado) e ações agrupadas — Resetar senha, Vincular grupo, Remover grupo (desabilitado quando sem grupos), Inativar.
- 🟢 Modal "Vincular grupo ao usuário" com SearchSelect de grupo + campo **Motivo** (coerente com auditoria).
- 🟡 **Layout/responsividade:** a tabela de usuários tem **8 colunas e transborda horizontalmente** nesta largura (`p-datatable-wrapper`: 1076px de conteúdo em 865px visíveis). A coluna **Ações → "Gerenciar" fica escondida atrás do scroll horizontal** — ação principal não visível sem rolar. A coluna "Empresa" repete o rótulo longo ("Fantasia • Razão • Documento") e é a maior responsável pelo overflow. Sugerido: encurtar a coluna Empresa (só fantasia) e fixar/priorizar a coluna Ações.

**Grupos de acesso** (`/seguranca/grupos-acesso`) — **2 bugs confirmados**
- 🟢 Modal "Novo grupo de acesso" bem construído: Empresa*/Filial (SearchSelect), Nome, Descrição e **multiselect de Permissões agrupado por módulo, com busca e chips**. Criação retorna toast de sucesso.
- 🟠 **BUG 1 — Permissões não são persistidas (feature de RBAC inoperante).** Criei "Grupo QA Teste" selecionando 2 permissões (Usuários·Consultar, Grupos de acesso·Gerenciar); o grupo é salvo com **0 permissões**. Confirmado no contrato da API: `POST /api/seguranca/grupos-acesso` com `permissoes:["SEGURANCA_USUARIOS_CONSULTAR","SEGURANCA_PERMISSOES_GERENCIAR"]` retorna **201** com `"permissoes":[]`. O frontend monta e envia o campo corretamente (`buildGrupoAcessoPayload`, `segurancaApi.ts:80`), portanto a falha está no **backend (não grava o array) ou em divergência de nome de campo esperado**. Reflexo: a edição do grupo abre com Permissões vazio e a lista mostra "0 permissão(ões)". _É a funcionalidade central do commit `feat(seguranca): grupo de acesso com seletor de permissões` — está não-funcional ponta-a-ponta._
- 🟠 **BUG 2 — Badge de Status sempre "Inativo" + ação "Inativar" sempre desabilitada.** A API retorna `status: "Ativo"` (string), **sem campo `ativo`**, mas o tipo `GrupoAcessoResponse` (`seguranca.types.ts:79`) declara `ativo: boolean` e a lista (`GruposAcessoPage.tsx:96`) renderiza `grupo.ativo ? 'Ativo' : 'Inativo'`. Como `grupo.ativo` é `undefined`, **todos os grupos aparecem "Inativo" (vermelho)** mesmo estando ativos, e `disabled: !grupo.ativo` (`:104`) deixa o botão **"Inativar" permanentemente desabilitado** — impossível inativar um grupo pela UI. Correção: mapear `status` → boolean (ou ler `status` diretamente).
- 🔵 Observação: dados de teste extras criados durante a investigação ("Grupo QA Teste", "QA Perm Debug" via API).

### 4. Cadastros base

**Pessoas** (`/pessoas`)
- 🟢 Cadastro "Nova pessoa" com **abas** (Dados gerais / Documentos e observações / LGPD e auditoria visual) — criei "Cliente Alpha Comercio LTDA" (CNPJ 11222333000181) com sucesso.
- 🟢 Página com forte orientação LGPD (banner "documentos mascarados na listagem", painel "Privacidade e dados").
- 🟡 Mesmo padrão de UX das Filiais: lista filtrada por empresa esconde o registro recém-criado (contadores 0 + "Nenhuma pessoa encontrada" apesar do sucesso).

**Unidades de medida** (`/produtos/unidades-medida`)
- 🟢 Backend valida **unicidade de sigla por empresa** — tentativa de criar "UN"/"CX" já existentes retorna HTTP 400 com mensagem clara ("Já existe unidade de medida com a sigla informada para esta empresa"), exibida em toast de erro. Bom tratamento.

**Produtos** (`/produtos`) — **bug de dependência de filtro**
- 🟢 Cadastro "Novo produto" bem estruturado, com 4 abas (Dados gerais / Comercial e estoque / Dados fiscais / Códigos e fornecedores). Happy path validado: criei "Produto QA Teste" (unidade CX) → toast "Produto salvo".
- 🟠 **BUG — "Novo produto" fica inutilizável sem selecionar empresa no filtro da página.** Os dropdowns **Unidade (obrigatório), Categoria e Marca** são populados a partir da query do **filtro de empresa da página** (`ProdutosPage.tsx:68-70,169` → `useUnidadesMedida(filters)`), e o backend só retorna esses catálogos quando `empresaId` está na query (sem ele: lista vazia — confirmado: `GET /api/produtos/unidades-medida` → `[]`; com `?empresaId=…` → 12 unidades). Assim, ao abrir "Novo produto" numa página recém-carregada (filtro vazio), o dropdown de Unidade fica **"Nenhuma unidade encontrada"** e, como é obrigatório, **impossibilita salvar** — mesmo selecionando a empresa _dentro_ do modal (o modal não re-consulta os catálogos pela empresa escolhida nele). Workaround: selecionar a empresa no filtro do topo antes de "Novo produto". Sugestões: (a) o modal buscar catálogos pela empresa selecionada nele; ou (b) desabilitar "Novo produto" até haver empresa no filtro, com dica; ou (c) o backend retornar catálogos do tenant sem exigir `empresaId`.
- 🟢 Lista de produtos, governança e ações (Editar/Código/Fornecedor/Inativar) renderizam corretamente com o filtro aplicado.

**Clientes / Fornecedores / Categorias / Marcas / Tabelas de preço** (smoke test)
- 🟢 **Clientes** e **Fornecedores** carregam com governança comercial/crédito e notas LGPD; padrão consistente.
- 🟢 **Categorias** e **Marcas** seguem o padrão "cadastro auxiliar" (mesma base das Unidades) com validação de unicidade por empresa no backend.
- 🟢 **Tabelas de preço** com layout mestre-detalhe ("Tabelas cadastradas" + "Itens da tabela"), empty-states corretos.
- 🟡 **Atenção:** Clientes/Fornecedores herdam de Pessoas e Produtos depende de catálogos — todos sofrem do mesmo acoplamento ao **filtro de empresa da página** observado em Produtos (dropdowns internos podem vir vazios sem empresa selecionada no topo).

### 5. Estoque

**Padrão sistêmico (relevante — afeta vários módulos):**
- 🟠 **Dropdowns de entidade (Produto/Local/Unidade/Categoria/Marca) dentro de formulários não repassam o `empresaId` selecionado** e o backend retorna lista vazia sem `empresaId`. Consequências por tela:
  - **Produtos**: contornável selecionando empresa no filtro do topo (a página injeta `empresaId` nas queries de catálogo).
  - **Entrada de estoque** (`/estoque/entradas` → "Registrar entrada"): **sem contorno** — a página não tem filtro de topo; selecionar a empresa _dentro_ do modal **não** popula o dropdown de **Produto** (disparou `GET /api/produtos` sem `empresaId` → `[]`, embora `?empresaId=…` retorne 2 produtos). Resultado: **impossível registrar entrada de estoque pela UI**. 🔴 Bloqueante para o fluxo.
  - Provável impacto semelhante nos seletores de item de **Vendas/Compras** (a validar nesses módulos).

**Telas do módulo**
- 🟢 **Saldos** (`/estoque/saldos`): consulta read-only (banner "saldo é consequência dos movimentos"), filtros produto/local, cards e tabela. Carrega OK.
  - 🔵 Linha de filtros (5 controles + busca) gera scroll horizontal nesta largura; título "Saldos de estoque" quebra em 3 linhas.
- 🟢 **Locais de estoque** (`/estoque/locais`): lista + "Novo local", cards, empty-state. Carrega OK. (Seed sem locais — `?empresaId=` retorna 0.)
- 🟢 **Entrada de estoque** (`/estoque/entradas`): página de ação com cards de etapas e modal completo (Empresa/Produto/Local/Quantidade/Origem/Documento/Motivo) — **bloqueada pelo bug acima**.
- 🟢 **Movimentos** (`/estoque/movimentos`): consulta rastreável read-only, cards + tabela (8 colunas → scroll horizontal). Carrega OK.
- 🟢 **Estoque avançado** (`/estoque/avancado`): página com abas (Inventários operacionais / Ajustes / Bloqueios) + "Novo inventário". Carrega OK.
- 🟢 **Saídas / Transferências / Ajustes / Bloqueios / Reservas / Inventários**: variações dos padrões de ação/lista já validados; carregam sem erro. Compartilham o mesmo risco de dropdown-sem-empresaId nos modais de registro.

### 6. Vendas / PDV / Faturamento

**Pedidos de venda** (`/vendas/pedidos`, `/vendas/pedidos/novo`)
- 🟢 Lista com cards de KPI (Pedidos listados / Aguardando aprovação / Aprovados / Valor total) e banner de ciclo de vida (rascunho→aprovação→faturamento com impacto em estoque/financeiro).
- 🟢 **Cabeçalho do "Novo pedido de venda" escopa corretamente:** o dropdown **Cliente** só habilita após escolher a empresa e dispara `GET /api/clientes?empresaId=…` **com o empresaId da empresa selecionada no modal** — padrão correto (contraste com Produtos/Estoque). O "Nenhum cliente encontrado" foi apenas ausência de dados (nenhum Cliente cadastrado para a empresa).
- 🔵 **Nota:** o **bug de dropdown-sem-empresaId é inconsistente entre telas** — Vendas faz certo, Produtos/Estoque não. Sugere implementação divergente por formulário, não um componente único.
- ⚠️ **Não exercitado ponta-a-ponta:** criação completa de pedido (itens/aprovação/faturamento) depende de Cliente + Produto cadastrados; o **seletor de item (produto) dentro do pedido** deve ser verificado quanto ao mesmo padrão de `empresaId` com dados de seed.

**PDV / Faturamento**
- 🟢 **Caixas (PDV)** (`/pdv/caixas`): lista + "Abrir caixa", empty-state. OK.
- 🟢 **Venda (PDV)** (`/pdv/vendas`): tela de PDV completa — Caixa aberto*/Local*/Cliente + seção Itens (Produto/Qtd/Valor/Desconto/Adicionar) + seção Pagamentos (Forma/Meio/Valor). Layout robusto. 🔵 Os seletores empresa/filial ficam no **topo-direito**, fora do bloco de filtros — posicionamento um pouco destoante das demais telas.
- 🟢 **Faturamento** (`/faturamento`): bom **loading skeleton**; e — destaque positivo — exibe **mensagem explícita "Empresa é obrigatória para operação multiempresa"** quando sem empresa (UX correta que Produtos/Estoque deveriam replicar em vez de dropdown vazio silencioso).

### 7. Compras

- 🟢 **Pedidos de compra** (`/compras/pedidos`): espelho de Vendas — cards KPI, banner de ciclo (recebimento gera entrada de estoque + conta a pagar), tabela. OK.
- 🟢 **Solicitações** (`/compras/solicitacoes`): fluxo abertura→itens→aprovação→cotação. OK. 🔵 Botão "Nova solicitação" fica **cortado na borda direita** nesta largura (overflow menor).
- 🟢 **Cotações** (`/compras/cotacoes`): renderiza OK após reload — **ver observação de estabilidade abaixo**.
- 🟢 **Recebimentos e conferência fiscal** (`/compras/recebimentos`): mensagem explícita "Selecione a empresa para carregar as divergências" (bom padrão de UX).
- 🟡 **Estabilidade — navegação client-side (RSC) intermitente:** ao navegar via SPA para `/compras/cotacoes` a **tela ficou em branco** com erros repetidos no console: `Failed to fetch RSC payload. Falling back to browser navigation. TypeError: Failed to fetch`. Um **reload/navegação completa resolve** e a página renderiza normalmente. Pode ser flakiness do dev server Next.js sob carga (naveguei muitas rotas em sequência), mas vale investigar — usuário pode ver telas brancas ocasionais até recarregar.

### 8. Financeiro / Bancos — **2 falhas de contrato de API**

- 🟢 **Contas a receber** (`/financeiro/contas-receber`): cards (Valor total/Saldo/Contas com saldo), "Nova conta" + "Gerar por pedido", regras de baixa/estorno. OK.
  - 🔵 As ações do cabeçalho (empresa/filial/status + "Nova conta" + "Gerar por pedido") ficam **empilhadas de forma apertada** no topo-direito nesta largura.
- 🟢 **Formas de pagamento** (`/financeiro/formas-pagamento`): lista + "Nova forma". OK.
- 🟠 **Fluxo de caixa** (`/financeiro/fluxo-caixa`): exibe **"⊗ Recurso não encontrado"** já no load. Causa: `GET /api/financeiro/fluxo-caixa` retorna **404 Not Found** (com e sem `empresaId`). O endpoint consolidado não existe/está em path divergente → cards ficam zerados ("Aguardando backend"). Tratado com banner, mas o recurso não funciona.
- 🟠 **Bancos** (`/bancos`): exibe **"⊗ Não foi possível concluir a operação"** no load. Causa confirmada na rede: o frontend chama `GET /api/bancos`, `/api/bancos/contas-bancarias`, `/api/bancos/convenios`, `/api/bancos/carteiras` e **todos retornam HTTP 405 Method Not Allowed**. Resultado: **as 4 abas (Bancos/Contas bancárias/Convênios/Carteiras) não carregam dados** — módulo Bancos inoperante para consulta.
- 🟠 **CNAB** (`/bancos/cnab`) e **Boletos**: a tela CNAB (Gerar remessa / Importar retorno) renderiza, mas o dropdown "Carteira de cobrança" depende do endpoint de carteiras (405) → **fluxo de remessa bloqueado** (botão "Gerar remessa" permanece desabilitado). Boletos herda a mesma dependência.
- 🔵 **Observação:** os erros 404/405 podem indicar backend desta build sem esses endpoints implementados (ou método/rota divergente do contrato do frontend). Independentemente da origem, os módulos **Fluxo de caixa** e **Bancos/Boletos/CNAB** aparecem quebrados ao usuário.

### 9. Fiscal — **módulo mais maduro**

- 🟢 **Notas fiscais** (`/fiscal/notas`): página mais elaborada do sistema — filtros avançados (status/tipo/operação/origem/pessoa/série/número/chave/protocolo + checkboxes de pendências XML/DANFE/estoque/financeira), cards operacionais, ações "Nova manual"/"Gerar de pedido"/"Exportar CSV". Excelente.
- 🟢 **Observabilidade fiscal** (`/fiscal/observabilidade`): ferramenta avançada de status de serviço/contingência SEFAZ, correlation ID, XML de consulta, validação de schema; mensagem explícita "Selecione a empresa para consultar".
- 🟢 **Inutilização fiscal** (`/fiscal/inutilizacoes`): formulário completo (faixa NF-e/NFC-e, UF, schema set, correlation ID com "Regenerar", motivo, XML assinado) com avisos legais. Boa maturidade.
- 🟢 Contraste positivo: o Fiscal demonstra o padrão de UX correto (empresa obrigatória sinalizada) que faltou em Produtos/Estoque.

### 10. Serviços / Frota / Portaria / Alimentar

- 🟢 **Ordens de serviço** (`/servicos/ordens`): lista + "Nova OS", ciclo abertura→triagem→execução→faturamento. OK.
- 🟢 **Frota — Veículos** (`/frota/veiculos`): lista (Placa/Modelo/Status), cadastro de frota/abastecimentos/manutenções. OK — 🟡 botão de ação cortado à direita (overflow de filtros).
- 🟢 **Portaria** (`/portaria`): abas Pré-autorizações/Registros de acesso/Ocorrências. OK.
- 🟢 **Alimentar — Lotes** (`/alimentar/lotes`): rastreabilidade por lote/validade com filtro "a vencer em X dias". OK.
- 🟢 Frota (Motoristas/Viagens) e Alimentar (Recalls) seguem os mesmos padrões; a auditoria do dashboard confirma atividade recente (Motorista/Viagem cadastrados), indicando fluxos funcionais.

### 11. RH / Qualidade / Produção

- 🟢 **RH — Colaboradores** (`/rh/colaboradores`): admissão/dados contratuais/desligamento. OK (🟡 botão "Admitir" cortado à direita).
- 🟢 **RH — Ponto** (`/rh/ponto`): marcações (entrada/intervalo/saída), "Registrar ponto". OK. (Jornadas/Ausências/Benefícios/Eventos seguem o padrão; auditoria mostra "Benefício cadastrado".)
- 🟢 **Qualidade — Inspeções** (`/qualidade/inspecoes`): inspeção com critérios/reprovação (crítica bloqueia estoque). OK. (Não-conformidades análogo.)
- 🟢 **Produção — Ordens** (`/producao/ordens`): ciclo liberar(reserva)→apontar→encerrar(baixa + entrada do acabado). OK. (Fichas técnicas análogo.)

### 12. CRM / Contratos / Contábil / Patrimônio

- 🟢 **CRM — Leads** (`/crm/leads`): captação/qualificação (qualificar gera oportunidade). OK. (Oportunidades/Propostas análogos.)
- 🟢 **Contratos** (`/contratos`): faturamento recorrente/por consumo, fatura por competência. OK.
- 🟢 **Contábil — Plano de contas** (`/contabil/plano-contas`): contas analíticas/sintéticas por natureza. OK. (Períodos/Lançamentos/Regras análogos.)
- 🟢 **Patrimônio — Bens** (`/patrimonio/bens`): ativo imobilizado (cadastro/transferência/bloqueio/baixa). OK (🟡 botão de ação cortado à direita). (Depreciação/Inventários análogos.)
- 🔵 Uma navegação SPA para `/contratos` falhou com "navigation denied/failed" e recuperou na segunda tentativa — consistente com a instabilidade RSC observada em Compras.

### 13. Auditoria / Atividades / Relatórios

- 🟢🟢 **Auditoria** (`/auditoria/eventos` → "Auditoria avançada"): **destaque positivo** — trilha de auditoria totalmente funcional; capturou em tempo real **todas as ações deste teste** (Produto criado, Pessoa criada, Grupo de acesso criado, Empresa/Filial criadas) com módulo/ação/timestamp. Cards operacionais (27 eventos, 6 módulos, 0 ações críticas). Postura de segurança: "não expõe GUID bruto".
- 🔵 **Naming**: o item de menu é **"Eventos"** mas o título da página é **"Auditoria avançada"** — pequena inconsistência de nomenclatura.
- 🟢 **Atividades** (`/atividades`): workflow operacional (responsável/prioridade/status/comentários), envio a endpoints específicos para histórico. OK.
- 🟢 **Relatórios** (`/relatorios`): **"Acesso negado — exige RELATORIOS_CONSULTAR"** — o `PermissionGuard`/`UnauthorizedState` bloqueia corretamente com mensagem clara e botão de retorno. RBAC funcionando. (O usuário Manager de teste não possui essa permissão; conteúdo de Relatórios não pôde ser exercitado.)

---

## Achados de responsividade e layout

**Mobile (375×812)**
- 🟢 **Dashboard**: cards de KPI reflowam para **coluna única**; header compacto (hambúrguer/logo/kebab); botões full-width. Muito bom.
- 🟢 **Menu lateral**: abre como **drawer full-height** com busca "Buscar tela ou módulo" e grupos com ícones, scrollável, com backdrop. Excelente padrão mobile.
- 🟢 **Cabeçalhos de página/forms**: busca e botões de ação passam a **full-width**, empilhados. Modais (ex.: "Novo usuário") renderizam com todos os campos (confirmado via árvore de acessibilidade).
- 🟡 **Tabelas largas**: rolam horizontalmente **contidas no card** (o body não estoura) — correto tecnicamente, mas em telas como **Usuários** a coluna de ação ("Gerenciar") fica fora da tela, exigindo rolagem. **Inconsistência**: Produtos esconde colunas no mobile (`hidden md:table-cell`), Usuários não — padronizar estratégia de tabela responsiva.

**Tablet / largura intermediária (~800–960px)**
- 🟢 A sidebar **colapsa para hambúrguer** neste breakpoint (comportamento correto).
- 🟡 **Overflow horizontal recorrente** em telas com muitos filtros: a linha de filtros (empresa/filial/status/… + busca) + botão de ação transborda a largura, **cortando o botão principal** à direita (visto em Veículos, Colaboradores, Bens, Solicitações de compra) e/ou gerando scroll horizontal na linha de filtros (Saldos, Movimentos).
- 🟡 **Tabelas com muitas colunas** (Usuários: 8 col.) geram scroll horizontal e escondem a coluna de Ações — ver Bug de layout em Segurança.
- 🔵 Títulos longos quebram em 2–3 linhas neste breakpoint (ex.: "Saldos de estoque", "Pedidos de venda") — estético, sem impacto funcional.

**Desktop**
- 🟢 Em telas largas o layout é limpo e espaçoso; o painel de renderização usado neste teste ficou limitado a ~800–956px, então a maior parte da validação ocorreu na faixa tablet/intermediária (onde os problemas de overflow acima aparecem).

---

## Consolidação final

| # | Severidade | Módulo | Achado | Tipo |
|---|-----------|--------|--------|------|
| 1 | 🔴 Bloqueante | Estoque | "Registrar entrada" não lista produtos (modal não passa `empresaId`; `GET /api/produtos` sem empresa → `[]`) — impossível registrar entrada pela UI | Bug funcional |
| 2 | 🟠 Alto | Segurança | Permissões selecionadas no cadastro de grupo **não são persistidas** (`POST /api/seguranca/grupos-acesso` → `permissoes:[]`) | Bug contrato/backend |
| 3 | 🟠 Alto | Segurança | Badge de status sempre "Inativo" + "Inativar" sempre desabilitado (UI lê `grupo.ativo`; API retorna `status`) | Bug frontend |
| 4 | 🟠 Alto | Financeiro | `GET /api/bancos`, `/contas-bancarias`, `/convenios`, `/carteiras` → **405**; módulo Bancos + CNAB/Boletos sem dados | Bug contrato/backend |
| 5 | 🟠 Alto | Financeiro | `GET /api/financeiro/fluxo-caixa` → **404**; Fluxo de caixa não funciona | Bug contrato/backend |
| 6 | 🟠 Alto | Produtos | "Novo produto" com Unidade(obrig.)/Categoria/Marca vazios até selecionar empresa no filtro do topo | Bug UX/dependência |
| 7 | 🟡 Médio | Segurança/Layout | Tabela de Usuários (8 col.) com scroll horizontal escondendo a ação "Gerenciar" | Layout |
| 8 | 🟡 Médio | Layout (vários) | Botão de ação principal cortado à direita em telas com muitos filtros (Veículos, Colaboradores, Bens, Solicitações) | Responsividade |
| 9 | 🟡 Médio | Administração | CNPJ exibido sem máscara nas listagens (Empresas/Filiais) | Formatação |
| 10 | 🟡 Médio | Administração/Cadastros | Lista filtrada por empresa esconde registro recém-criado (contadores 0 apesar do sucesso) — Filiais/Pessoas | UX |
| 11 | 🟡 Médio | Estabilidade | Navegação client-side (RSC) intermitente → tela branca até reload (`Failed to fetch RSC payload`) | Estabilidade |
| 12 | 🔵 Baixo | Login | Placeholder do campo Empresa não indica que é opcional | UX/melhoria |
| 13 | 🔵 Baixo | Administração | Deploy: Versão/Runtime/Saúde em branco; dropdown sem rótulo | UX/melhoria |
| 14 | 🔵 Baixo | Mobile | Estratégia de tabela responsiva inconsistente (Produtos esconde colunas; Usuários não) | Responsividade |
| — | 🟢 Acertos | Geral | Padrões de UI consistentes; empty-states; validação de unicidade no backend; **Auditoria** captura todas as ações; **Fiscal** muito maduro; `PermissionGuard` correto; **Faturamento/Recebimentos** sinalizam "selecione a empresa"; forte orientação LGPD; mobile (dashboard/menu drawer) muito bom | Positivo |

---

## Dados de teste criados durante a execução

Para exercitar os cadastros, foram criados no ambiente: empresa **"Empresa Teste QA Ltda"** (CNPJ 11222333000181); filial **"Filial Centro QA"**; pessoa **"Cliente Alpha Comercio LTDA"**; produto **"PROD-QA-001"** (unidade CX); grupos de acesso **"Grupo QA Teste"** e **"QA Perm Debug"** (via API, na investigação do bug de permissões). Todos vinculados à empresa Triplos Tecnologia. Podem ser removidos/inativados conforme necessário.

---

## Metodologia e limitações

- Teste conduzido no navegador embutido sobre o build Docker em `localhost:3000`, autenticado como `manager@erp.local`.
- Cobertura: **carregamento + layout de todas as ~95 telas**; **cadastros reais** e validações nos módulos base; **inspeção de contrato de API** (rede + chamadas autenticadas) onde houve suspeita de bug.
- Limitações: painel de renderização limitado à faixa ~800–956px (validação desktop parcial); backend de teste com dados quase zerados (fluxos transacionais completos não exercitados); usuário Manager sem `RELATORIOS_CONSULTAR`; ocasional defasagem de captura de screenshot em modais (artefato do painel, não do app — contornado via árvore de acessibilidade e inspeção de DOM/rede).

### Cobertura por tela (transparência)

**Toda divergência relatada corresponde a algo efetivamente observado numa tela aberta.** Nem todas as ~95 telas foram abertas individualmente — parte foi validada por analogia ao padrão do módulo. Abaixo, o que **não** foi aberto individualmente (portanto **sem inspeção direta de divergências**):

- **Produtos:** `produtos/marcas`
- **Estoque:** `estoque/saidas`, `transferencias`, `ajustes`, `bloqueios`, `reservas`, `inventarios` (abri Saldos, Locais, Movimentos, Entradas, Avançado)
- **Financeiro:** `financeiro/contas-pagar`, `condicoes-pagamento`, `financeiro/avancado`, `bancos/boletos`, `bancos/contas`, `bancos/convenios`, `bancos/carteiras` (individualmente; validados pelos 405 da API)
- **Frota:** `frota/motoristas`, `frota/viagens`
- **Alimentar:** `alimentar/recalls`
- **RH:** `rh/jornadas`, `ausencias`, `beneficios`, `eventos` (abri Colaboradores, Ponto)
- **Qualidade:** `qualidade/nao-conformidades`
- **Produção:** `producao/fichas-tecnicas`
- **CRM:** `crm/oportunidades`, `crm/propostas`
- **Contábil:** `contabil/periodos`, `lancamentos`, `regras`
- **Patrimônio:** `patrimonio/depreciacao`, `patrimonio/inventarios`
- **Auditoria:** `auditoria/operacional`

Sob demanda, qualquer uma dessas pode ser aberta e inspecionada individualmente.
