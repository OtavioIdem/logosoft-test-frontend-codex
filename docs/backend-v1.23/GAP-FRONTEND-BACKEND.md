# Gap frontend × backend — as 122 operações que a UI ainda não alcança

> **Arquivo gerado** em 2026-09-08, junto do
> [`CONTRATO-API-v1.23.md`](CONTRATO-API-v1.23.md). Regenere com
> `scripts/gerar-contrato-frontend.mjs` **do repositório do backend**.
>
> **Como a cobertura é medida:** casando **método + rota**, com as chamadas do frontend
> extraídas pelo `scanFrontendRoutes` do próprio repositório do frontend (AST TypeScript,
> que resolve rota montada por concatenação e por variável — o que uma varredura por regex
> não faz).
>
> **O que este arquivo NÃO mede:** se a tela usa o endpoint corretamente, se manda os
> campos novos, se trata os erros novos. Endpoint marcado como coberto pode estar
> semanticamente errado — esse eixo está no [plano](PLANO-FRONTEND-v1.23.md), seção 2.

## Leitura em uma tabela

| | |
| --- | ---: |
| Operações no backend | 579 |
| Consumidas pelo frontend | **457 (79%)** |
| **Faltam** | **122** |
| Módulos com cobertura total | 57 |
| Módulos com **zero** cobertura | 12 (46 operações) |

**A defasagem não é a que o número de versão sugere.** O frontend está no
`v1.11.0a8b47` e o backend no `v1.23.2`, mas o eixo fiscal — que é o que as doze versões
construíram — está **quase todo consumido**: `NotasFiscais` tem 26 de 28 operações
ligadas, incluindo `transmitir-sefaz`, `reprocessar-sefaz`, contingência e cancelamento.

O buraco está em outro lugar, e tem uma forma clara: **o frontend sabe operar o documento
fiscal e não sabe cadastrar o que o torna correto.**

| Onde o documento é operado | Onde o dado que o alimenta é cadastrado |
| --- | --- |
| `NotasFiscais` 26/28 ✅ | `CadastrosFiscais` 2/16 ❌ · `SeriesFiscais` 0/7 ❌ · `NaturezasOperacao` 0/5 ❌ · `Pessoas` 4/19 ❌ |

Uma NF-e precisa de série numerada, natureza de operação, CFOP, e do bloco fiscal da
pessoa. Nada disso tem tela. É a mesma classe de defeito que o backend vem consertando
desde a v1.14: **peça correta, desligada** — só que agora do lado da UI.

---

| Módulo | Cobertos | Faltam |
|---|---:|---:|
| Pessoas | 4/19 | **15** |
| CadastrosFiscais | 2/16 | **14** |
| FinanceiroAvancado | 2/14 | **12** |
| Integracoes | 0/10 | **10** |
| SeriesFiscais | 0/7 | **7** |
| CargosAcesso | 0/6 | **6** |
| NaturezasOperacao | 0/5 | **5** |
| ClassificacoesPessoa | 0/4 | **4** |
| Fornecedores | 4/8 | **4** |
| Transportadoras | 0/4 | **4** |
| InfraestruturaProducao | 0/3 | **3** |
| Auth | 4/6 | **2** |
| Empresas | 4/6 | **2** |
| Filiais | 4/6 | **2** |
| GruposAcesso | 5/7 | **2** |
| GruposAcessoMatriz | 0/2 | **2** |
| Health | 1/3 | **2** |
| Leads | 4/6 | **2** |
| Motoristas | 2/4 | **2** |
| NotasFiscais | 26/28 | **2** |
| Parametros | 0/2 | **2** |
| UsuariosCargosAcesso | 1/3 | **2** |
| Anexos | 4/5 | **1** |
| BensPatrimoniais | 7/8 | **1** |
| Clientes | 6/7 | **1** |
| Colaboradores | 4/5 | **1** |
| Estoque | 6/7 | **1** |
| Faturamentos | 7/8 | **1** |
| ModelosDocumentoFiscal | 0/1 | **1** |
| Notificacoes | 5/6 | **1** |
| Oportunidades | 6/7 | **1** |
| Permissoes | 0/1 | **1** |
| PermissoesCatalogo | 0/1 | **1** |
| PlanoContas | 3/4 | **1** |
| Portaria | 12/13 | **1** |
| Propostas | 4/5 | **1** |
| Recalls | 6/7 | **1** |
| Viagens | 4/5 | **1** |
| Atividades | 8/8 | — |
| Auditoria | 3/3 | — |
| Ausencias | 10/10 | — |
| Bancos | 4/4 | — |
| Beneficios | 6/6 | — |
| Boletos | 5/5 | — |
| Caixas | 6/6 | — |
| Cargos | 4/4 | — |
| CategoriasProduto | 4/4 | — |
| CentrosCusto | 4/4 | — |
| Cnab | 3/3 | — |
| CondicoesPagamento | 4/4 | — |
| ContasPagar | 6/6 | — |
| ContasReceber | 7/7 | — |
| Contratos | 10/10 | — |
| CotacoesCompra | 7/7 | — |
| Deploy | 11/11 | — |
| DepreciacaoPatrimonial | 1/1 | — |
| EstoqueAvancado | 11/11 | — |
| EventosRh | 2/2 | — |
| ExcecoesFiscais | 5/5 | — |
| ExcecoesFiscaisNcm | 5/5 | — |
| FichasTecnicas | 6/6 | — |
| FormasPagamento | 4/4 | — |
| Inspecoes | 8/8 | — |
| InutilizacoesFiscais | 1/1 | — |
| InventariosEstoque | 5/5 | — |
| InventariosPatrimoniais | 5/5 | — |
| Jornadas | 3/3 | — |
| LancamentosContabeis | 4/4 | — |
| LocaisEstoque | 4/4 | — |
| Lotes | 8/8 | — |
| Marcas | 4/4 | — |
| NaoConformidades | 7/7 | — |
| ObservabilidadeFiscal | 1/1 | — |
| OrdensProducao | 8/8 | — |
| OrdensServico | 10/10 | — |
| PedidosCompra | 11/11 | — |
| PedidosVenda | 11/11 | — |
| PeriodosContabeis | 4/4 | — |
| Ponto | 2/2 | — |
| Produtos | 9/9 | — |
| RecebimentosCompra | 3/3 | — |
| RegrasContabilizacao | 3/3 | — |
| RegrasFiscais | 5/5 | — |
| RelatoriosGerenciais | 8/8 | — |
| RelatoriosOperacionais | 1/1 | — |
| ReservasEstoque | 4/4 | — |
| Sefaz | 4/4 | — |
| Setores | 4/4 | — |
| SolicitacoesCompra | 6/6 | — |
| TabelasPreco | 10/10 | — |
| TributacaoSimulacao | 1/1 | — |
| UnidadesMedida | 4/4 | — |
| Usuarios | 8/8 | — |
| Veiculos | 15/15 | — |
| VendasPdv | 3/3 | — |

---

### Pessoas — faltam 15 de 19

- `PATCH /api/pessoas/{id}/dados-fiscais` — `PESSOAS_DADOS_FISCAIS_GERENCIAR`
- `POST /api/pessoas/{id}/bloquear` — `PESSOAS_BLOQUEAR`
- `POST /api/pessoas/{id}/desbloquear` — `PESSOAS_BLOQUEAR`
- `GET /api/pessoas/{id}/enderecos` — `PESSOAS_CONSULTAR`
- `POST /api/pessoas/{id}/enderecos` — `PESSOAS_GERENCIAR`
- `PUT /api/pessoas/{id}/enderecos/{enderecoId}` — `PESSOAS_GERENCIAR`
- `DELETE /api/pessoas/{id}/enderecos/{enderecoId}` — `PESSOAS_GERENCIAR`
- `POST /api/pessoas/{id}/enderecos/{enderecoId}/principal` — `PESSOAS_GERENCIAR`
- `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio` — `PESSOAS_DADOS_FISCAIS_GERENCIAR`
- `POST /api/pessoas/enderecos/backfill-municipios` — `PESSOAS_DADOS_FISCAIS_GERENCIAR`
- `GET /api/pessoas/{id}/contatos` — `PESSOAS_CONSULTAR`
- `POST /api/pessoas/{id}/contatos` — `PESSOAS_GERENCIAR`
- `PUT /api/pessoas/{id}/contatos/{contatoId}` — `PESSOAS_GERENCIAR`
- `DELETE /api/pessoas/{id}/contatos/{contatoId}` — `PESSOAS_GERENCIAR`
- `POST /api/pessoas/{id}/contatos/{contatoId}/principal` — `PESSOAS_GERENCIAR`

### CadastrosFiscais — faltam 14 de 16

- `GET /api/fiscal/cadastros/uf` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/paises` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/municipios` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/cst-icms` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/csosn` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/cst-ipi` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/cst-pis-cofins` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/origens-mercadoria` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/unidades-tributaveis` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/cest` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/ncm-cest` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/ncm/{codigo}/validacao` — `FISCAL_CADASTROS_CONSULTAR`
- `GET /api/fiscal/cadastros/codigos-servico` — `FISCAL_CADASTROS_CONSULTAR`
- `POST /api/fiscal/cadastros/importar/{tabela}` — `FISCAL_CADASTROS_GERENCIAR`

### FinanceiroAvancado — faltam 12 de 14

- `GET /api/financeiro/avancado/contas-receber` — `FINANCEIRO_CONSULTAR`
- `POST /api/financeiro/avancado/contas-receber` — `FINANCEIRO_GERENCIAR`
- `GET /api/financeiro/avancado/contas-pagar` — `FINANCEIRO_CONSULTAR`
- `POST /api/financeiro/avancado/contas-pagar` — `FINANCEIRO_GERENCIAR`
- `POST /api/financeiro/avancado/contas-receber/{id}/baixar` — `FINANCEIRO_RECEBER`
- `POST /api/financeiro/avancado/contas-pagar/{id}/baixar` — `FINANCEIRO_PAGAR`
- `POST /api/financeiro/avancado/contas/{id}/estornar` — `FINANCEIRO_ESTORNAR`
- `POST /api/financeiro/avancado/contas/{id}/cancelar` — `FINANCEIRO_CANCELAR`
- `POST /api/financeiro/avancado/contas-receber/{id}/estornar` — `FINANCEIRO_ESTORNAR`
- `POST /api/financeiro/avancado/contas-pagar/{id}/estornar` — `FINANCEIRO_ESTORNAR`
- `POST /api/financeiro/avancado/contas-receber/{id}/cancelar` — `FINANCEIRO_CANCELAR`
- `POST /api/financeiro/avancado/contas-pagar/{id}/cancelar` — `FINANCEIRO_CANCELAR`

### Integracoes — faltam 10 de 10

- `GET /api/integracoes/externas` — `INTEGRACOES_CONSULTAR`
- `POST /api/integracoes/externas` — `INTEGRACOES_GERENCIAR`
- `PUT /api/integracoes/externas/{id}` — `INTEGRACOES_GERENCIAR`
- `POST /api/integracoes/externas/{id}/inativar` — `INTEGRACOES_GERENCIAR`
- `POST /api/integracoes/externas/{id}/reativar` — `INTEGRACOES_GERENCIAR`
- `GET /api/integracoes/eventos` — `INTEGRACOES_CONSULTAR`
- `POST /api/integracoes/eventos` — `INTEGRACOES_GERENCIAR`
- `POST /api/integracoes/eventos/{id}/sucesso` — `INTEGRACOES_GERENCIAR`
- `POST /api/integracoes/eventos/{id}/falha` — `INTEGRACOES_GERENCIAR`
- `POST /api/integracoes/eventos/{id}/reprocessar` — `INTEGRACOES_REPROCESSAR`

### SeriesFiscais — faltam 7 de 7

- `GET /api/fiscal/series` — `FISCAL_SERIES_CONSULTAR`
- `POST /api/fiscal/series` — `FISCAL_SERIES_GERENCIAR`
- `GET /api/fiscal/series/{id}` — `FISCAL_SERIES_CONSULTAR`
- `GET /api/fiscal/series/{id}/buracos` — `FISCAL_SERIES_CONSULTAR`
- `POST /api/fiscal/series/{id}/ampliar` — `FISCAL_SERIES_GERENCIAR`
- `POST /api/fiscal/series/{id}/encerrar-vigencia` — `FISCAL_SERIES_GERENCIAR`
- `POST /api/fiscal/series/{id}/inativar` — `FISCAL_SERIES_GERENCIAR`

### CargosAcesso — faltam 6 de 6

- `GET /api/seguranca/cargos-acesso` — `SEGURANCA_PERMISSOES_CONSULTAR`
- `POST /api/seguranca/cargos-acesso` — `SEGURANCA_PERMISSOES_GERENCIAR`
- `GET /api/seguranca/cargos-acesso/{id}` — `SEGURANCA_PERMISSOES_CONSULTAR`
- `PUT /api/seguranca/cargos-acesso/{id}` — `SEGURANCA_PERMISSOES_GERENCIAR`
- `POST /api/seguranca/cargos-acesso/{id}/grupos` — `SEGURANCA_PERMISSOES_GERENCIAR`
- `POST /api/seguranca/cargos-acesso/{id}/grupos/{grupoAcessoId}/remover` — `SEGURANCA_PERMISSOES_GERENCIAR`

### NaturezasOperacao — faltam 5 de 5

- `GET /api/fiscal/naturezas-operacao` — `FISCAL_CADASTROS_CONSULTAR`
- `POST /api/fiscal/naturezas-operacao` — `FISCAL_CADASTROS_GERENCIAR`
- `PUT /api/fiscal/naturezas-operacao/{id}` — `FISCAL_CADASTROS_GERENCIAR`
- `POST /api/fiscal/naturezas-operacao/{id}/inativar` — `FISCAL_CADASTROS_GERENCIAR`
- `GET /api/fiscal/naturezas-operacao/{id}/cfop` — `FISCAL_CADASTROS_CONSULTAR`

### ClassificacoesPessoa — faltam 4 de 4

- `GET /api/pessoas/classificacoes` — `PESSOAS_CONSULTAR`
- `POST /api/pessoas/classificacoes` — `CLASSIFICACOES_PESSOA_GERENCIAR`
- `PUT /api/pessoas/classificacoes/{id}` — `CLASSIFICACOES_PESSOA_GERENCIAR`
- `POST /api/pessoas/classificacoes/{id}/inativar` — `CLASSIFICACOES_PESSOA_GERENCIAR`

### Fornecedores — faltam 4 de 8

- `PUT /api/fornecedores/{id}/configuracao-compra` — `FORNECEDORES_GERENCIAR`
- `POST /api/fornecedores/{id}/homologar` — `FORNECEDORES_GERENCIAR`
- `POST /api/fornecedores/{id}/revogar-homologacao` — `FORNECEDORES_GERENCIAR`
- `GET /api/fornecedores/{id}/situacao-compra` — `FORNECEDORES_CONSULTAR`

### Transportadoras — faltam 4 de 4

- `GET /api/transportadoras` — `TRANSPORTADORAS_CONSULTAR`
- `POST /api/transportadoras` — `TRANSPORTADORAS_GERENCIAR`
- `PUT /api/transportadoras/{id}` — `TRANSPORTADORAS_GERENCIAR`
- `POST /api/transportadoras/{id}/inativar` — `TRANSPORTADORAS_GERENCIAR`

### InfraestruturaProducao — faltam 3 de 3

- `GET /api/infraestrutura/health` — `INFRAESTRUTURA_CONSULTAR`
- `GET /api/infraestrutura/health/dependencies` — `INFRAESTRUTURA_CONSULTAR`
- `GET /api/infraestrutura/backups/status` — `INFRAESTRUTURA_BACKUP_CONSULTAR`

### Auth — faltam 2 de 6

- `POST /api/auth/validar-empresa` — `(sem RequiredPermission)`
- `POST /api/auth/bootstrap-admin` — `(sem RequiredPermission)`

### Empresas — faltam 2 de 6

- `PUT /api/administracao/empresas/{id}/endereco-fiscal` — `ADMINISTRACAO_GERENCIAR`
- `DELETE /api/administracao/empresas/{id}/endereco-fiscal/municipio` — `ADMINISTRACAO_GERENCIAR`

### Filiais — faltam 2 de 6

- `PUT /api/administracao/filiais/{id}/endereco-fiscal` — `ADMINISTRACAO_GERENCIAR`
- `DELETE /api/administracao/filiais/{id}/endereco-fiscal/municipio` — `ADMINISTRACAO_GERENCIAR`

### GruposAcesso — faltam 2 de 7

- `POST /api/seguranca/grupos-acesso/{id}/permissoes` — `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`
- `POST /api/seguranca/grupos-acesso/{id}/permissoes/{permissaoId}/remover` — `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`

### GruposAcessoMatriz — faltam 2 de 2

- `GET /api/seguranca/grupos-acesso/{id}/matriz-permissoes` — `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`
- `PUT /api/seguranca/grupos-acesso/{id}/matriz-permissoes` — `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`

### Health — faltam 2 de 3

- `GET /api/health/database` — `(sem RequiredPermission)`
- `GET /api/health/redis` — `(sem RequiredPermission)`

### Leads — faltam 2 de 6

- `GET /api/crm/leads/{id}` — `CRM_CONSULTAR`
- `PUT /api/crm/leads/{id}` — `CRM_LEADS_GERENCIAR`

### Motoristas — faltam 2 de 4

- `GET /api/frota/motoristas/{id}` — `FROTA_CONSULTAR`
- `PUT /api/frota/motoristas/{id}` — `FROTA_GERENCIAR`

### NotasFiscais — faltam 2 de 28

- `POST /api/fiscal/notas-fiscais/{id}/valores-acessorios` — `FISCAL_GERENCIAR`
- `POST /api/fiscal/notas-fiscais/{id}/calcular-tributos` — `FISCAL_GERENCIAR`

### Parametros — faltam 2 de 2

- `GET /api/parametros` — `SEGURANCA_PARAMETROS_CONSULTAR`
- `PUT /api/parametros` — `SEGURANCA_PARAMETROS_GERENCIAR`

### UsuariosCargosAcesso — faltam 2 de 3

- `POST /api/seguranca/usuarios/{id}/cargos-empresa` — `SEGURANCA_PERMISSOES_GERENCIAR`
- `POST /api/seguranca/usuarios/{id}/cargos-filial` — `SEGURANCA_PERMISSOES_GERENCIAR`

### Anexos — faltam 1 de 5

- `GET /api/anexos/{id}` — `ANEXOS_CONSULTAR`

### BensPatrimoniais — faltam 1 de 8

- `PUT /api/patrimonio/bens/{id}` — `PATRIMONIO_BENS_GERENCIAR`

### Clientes — faltam 1 de 7

- `PUT /api/clientes/{id}/configuracao-comercial` — `CLIENTES_GERENCIAR`

### Colaboradores — faltam 1 de 5

- `GET /api/rh/colaboradores/{id}` — `RH_CONSULTAR`

### Estoque — faltam 1 de 7

- `GET /api/estoque/saldos/produto/{produtoId}/local/{localEstoqueId}` — `ESTOQUE_CONSULTAR`

### Faturamentos — faltam 1 de 8

- `POST /api/faturamento/{id}/retomar-reversao` — `FATURAMENTO_RETOMAR_REVERSAO`

### ModelosDocumentoFiscal — faltam 1 de 1

- `GET /api/fiscal/modelos-documento` — `FISCAL_MODELOS_CONSULTAR`

### Notificacoes — faltam 1 de 6

- `POST /api/notificacoes` — `NOTIFICACOES_GERENCIAR`

### Oportunidades — faltam 1 de 7

- `PUT /api/crm/oportunidades/{id}` — `CRM_OPORTUNIDADES_GERENCIAR`

### Permissoes — faltam 1 de 1

- `GET /api/seguranca/permissoes` — `SEGURANCA_PERMISSOES_CONSULTAR`

### PermissoesCatalogo — faltam 1 de 1

- `GET /api/seguranca/permissoes/catalogo` — `SEGURANCA_PERMISSOES_CONSULTAR`

### PlanoContas — faltam 1 de 4

- `GET /api/contabil/plano-contas/{id}` — `CONTABIL_CONSULTAR`

### Portaria — faltam 1 de 13

- `GET /api/portaria/pre-autorizacoes/{id}` — `PORTARIA_CONSULTAR`

### Propostas — faltam 1 de 5

- `GET /api/crm/propostas/{id}` — `CRM_CONSULTAR`

### Recalls — faltam 1 de 7

- `GET /api/alimentar/recalls/{id}` — `ALIMENTAR_CONSULTAR`

### Viagens — faltam 1 de 5

- `GET /api/frota/viagens/{id}` — `FROTA_CONSULTAR`
