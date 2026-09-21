# 05 — Inventário: a forma dos enums entre frontend e backend

Nó `inventario`, regime `arquitetura`. Este arquivo é insumo para o quarteto de arquitetos — não
propõe solução, não define camada de codec, não decide se a saída correta é texto ou `z.preprocess`.
Lista o que existe, o que foi medido e o que ficou como `não verificado`.

## 0. Metodologia — o que foi medido e como

| Nº | O quê | Valor | Como (comando/fonte) |
| --- | --- | --- | --- |
| M1 | Enums declarados no frontend (`export enum`) | **131** | `grep -rn "^export enum" features/*/types/*.ts types/erp.ts \| wc -l` |
| M2 | Colunas `character varying` candidatas a enum no schema `erp` | **156** (medição já dada pelo briefing) | não remedido nesta rodada |
| M3 | Colunas `integer`/`int2` candidatas a enum no schema `erp` | **14**, e eu as identifiquei uma a uma | `docker exec logosoft-postgres psql -U erp_user -d erp -c "select table_name, column_name, data_type, udt_name from information_schema.columns where table_schema='erp' and (column_name ~* 'status\|tipo\|regime\|...' or udt_name in ('int4','int2'))"` — ver §2 |
| M4 | Comparações `EntityStatus.*` fora de `types/erp.ts` | **26** ocorrências em **22** linhas de **10** arquivos | `grep -rno "EntityStatus\.[A-Za-z]*" features/ components/ app/ --include=*.ts --include=*.tsx \| grep -v types/erp.ts \| wc -l` |
| M5 | `Number(...)`/`String(...)` aplicados a campo `status`/`Status` | **177** ocorrências em **67** arquivos | `grep -rn "Number(.*status\|Number(.*Status\|String(.*status\|String(.*Status" features/ components/ app/ --include=*.ts --include=*.tsx` (excluídos testes) |
| M6 | Schemas Zod que validam enum de request (`z.nativeEnum`) | **50** ocorrências em **18** arquivos | `grep -rn "z.nativeEnum(" features/*/schemas/*.ts` |
| M7 | Validador equivalente fora do padrão `nativeEnum` (`enumValue`/`enumValueNullable`, só em tributação) | **14** ocorrências, 1 arquivo | `grep -n "enumValue(" features/tributacao/schemas/tributacaoSchemas.ts` |
| M8 | Colunas `information_schema.columns` do schema `erp` cujo `data_type` é `integer`/`int2` E cujo nome é `Status` | **14 exatas**, todas chamadas literalmente `Status` (nunca `StatusPedido`, `StatusFiscal` etc.) | mesma consulta de M3, ver tabela em §2 |
| M9 | Valores reais gravados nas 14 colunas inteiras `Status` | só 4 das 14 tabelas têm linha; todas com valor `1` | `select "Status"::text, count(*) from erp.<tabela> group by 1` nas 14 tabelas |
| M10 | Valor real gravado em `empresas."RegimeTributario"` | `'LucroPresumido'` (texto), 2 linhas | `select "RegimeTributario", count(*) from erp.empresas group by 1` |
| M11 | Valor real gravado em `Status` textual de tabelas de domínio (`pedidos_venda.StatusPedido`, `contas_pagar.StatusFinanceiro`, `notas_fiscais.StatusFiscal`, `crm_leads.StatusLead`) | sempre o **nome do membro do enum do backend**, nunca número (`Aprovado`, `Aberta`, `Rascunho`, `Novo`) | consulta `select "StatusPedido"::text, count(*) from erp.pedidos_venda group by 1` etc. |
| M12 | Busca por conversor JSON de enum→texto em todo o backend (`JsonStringEnumConverter`, `StringEnumConverter`, `AddJsonOptions`, `[JsonConverter]`, classe custom `: JsonConverter<>`) | **zero ocorrências** em `src/` (fora de um comentário de teste) | `grep -rni "jsonstringenumconverter\|stringenumconverter\|enumconverter\|AddJsonOptions\|ConfigureHttpJsonOptions" --include=*.cs .` em `../New project 3`, mais leitura integral de `src/Erp.Api/Program.cs` |
| M13 | Comparação membro-a-membro dos 131 enums do frontend contra `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §11 (catálogo de enums) | **35** enums com nome batendo mas conjunto/valor de membros divergente; **8** enums cujo nome não existe no catálogo | script Node (`compare_enums.js`, ver nota de reprodutibilidade no fim) parseando `export enum` do frontend e as linhas `Nome = Membro = n, ...` do catálogo |
| M14 | Amostra de confirmação direta contra código-fonte C# (não contra a doc) | **22 enums** conferidos um a um em `.cs`, **100% de concordância com o catálogo da doc** nos valores (a doc erra por omissão, não por valor errado, nos casos checados) | leitura de `RhEnums.cs`, `FrotaEnums.cs`, `PortariaEnums.cs`, `CrmEnums.cs`, `AlimentarEnums.cs`, `ContabilEnums.cs`, `PatrimonioEnums.cs`, `TipoCobranca.cs`, `StatusContaFinanceira.cs` (×2), `TipoMovimentoFinanceiro.cs` (×2), `OrigemFinanceira.cs`, `TipoMovimentoEstoque.cs`, `FaturamentoLegIntegracao.cs`, `FaturamentoContracts.cs`, `ImpostoNotaFiscal.cs`, `NotaFiscalRequests.cs`, `RegimeTributario.cs`, `ContabilizacaoContracts.cs`/`RegraContabilizacaoContracts.cs` |

**Acesso ao backend nesta rodada**: `../New project 3` está disponível como repositório completo (código-fonte
lido, não só o snapshot de contrato), `logosoft-postgres` aceita consulta de leitura via `docker exec`, e a API
em `http://localhost:8080` responde. **Não há credencial de sessão** — todo endpoint sob `[Authorize]` devolve
`401` (confirmado: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/administracao/empresas` →
`401`). Por isso, **nenhuma forma de serialização JSON foi observada ao vivo nesta rodada** além do único caso
já registrado no briefing (RegimeTributario da Empresa, visto em DevTools em 2026-09-21, que eu não repeti).
Todo o resto desta seção 2 é inferência a partir de três fontes declaradas: schema do Postgres, valor real
gravado no Postgres, e leitura direta do código-fonte C# do serializador/contratos. Nenhuma delas é a mesma
coisa que "o JSON que sai da API" — ver a ressalva explícita em cada item.

---

## 1. O universo — 131 enums do frontend, destino declarado por item

Todos os 131 `export enum` do frontend, arquivo:linha, e o confronto do **nome dos membros e seus valores**
contra `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §11 (fonte de nome de membro, por instrução do briefing).
"OK" significa nome do enum e de todo membro batendo, com o mesmo valor numérico — **isso não diz nada sobre
a forma no JSON**, só sobre o "de qual conceito o frontend acha que está falando". 35 dos 131 divergem no
conjunto/valor de membros mesmo comparando número-com-número (ver §6-D); 8 têm nome ausente do catálogo §11
(ver §6-E, a maioria é lacuna da doc, não do frontend).

| Enum (frontend) | Declarado em | Confronto com `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §11 / código-fonte do backend |
| --- | --- | --- |
| RegimeTributario | `features/administracao/types/administracao.types.ts:7` | STRING enum (já corrigido nesta fatia). Backend `Erp.Domain.Administration.RegimeTributario` não tem `= n` explícito (autonumera 0,1,2) — nomes batem, forma (string) diverge do tipo C#. |
| LoteOrigem | `features/alimentar/types/alimentar.types.ts:3` | DIVERGE — só no frontend: Transferencia; valor numérico diferente para: Outro. |
| StatusLote | `features/alimentar/types/alimentar.types.ts:10` | OK |
| TipoMovimentacaoLote | `features/alimentar/types/alimentar.types.ts:16` | DIVERGE — só no backend: Consumo, Transferencia; valor numérico diferente para: Ajuste, Descarte. |
| GravidadeRecall | `features/alimentar/types/alimentar.types.ts:23` | DIVERGE — só no frontend: Critica. |
| StatusRecall | `features/alimentar/types/alimentar.types.ts:30` | DIVERGE — só no backend: EmAndamento; valor numérico diferente para: Encerrado, Cancelado. |
| CategoriaAnexo | `features/anexos/types/anexos.types.ts:3` | OK |
| TipoCobranca | `features/bancos/types/bancos.types.ts:3` | DIVERGE — frontend tem 5 membros (SimplesComRegistro, SimplesSemRegistro, Caucionada, Descontada, Vinculada); backend só tem 2 (SemRegistro, ComRegistro). Conjuntos sem interseção de nome. |
| StatusBoleto | `features/bancos/types/bancos.types.ts:11` | OK |
| StatusSolicitacaoCompra | `features/compras-avancado/types/comprasAvancado.types.ts:3` | OK |
| StatusCotacaoCompra | `features/compras-avancado/types/comprasAvancado.types.ts:10` | OK |
| StatusConferenciaFiscalEntrada | `features/compras-avancado/types/comprasAvancado.types.ts:17` | OK |
| TipoDivergenciaRecebimento | `features/compras-avancado/types/comprasAvancado.types.ts:22` | OK |
| TipoContaContabil | `features/contabil/types/contabil.types.ts:3` | OK |
| NaturezaConta | `features/contabil/types/contabil.types.ts:11` | Nome não bate com o backend (`NaturezaContaContabil`); valores idênticos (Devedora=1, Credora=2). Divergência de nome, não de forma. |
| TipoPartida | `features/contabil/types/contabil.types.ts:16` | OK |
| StatusPeriodoContabil | `features/contabil/types/contabil.types.ts:21` | OK |
| StatusLancamentoContabil | `features/contabil/types/contabil.types.ts:26` | OK |
| TipoEventoContabilizacao | `features/contabil/types/contabil.types.ts:32` | Não corresponde a nenhum enum do backend por nome nem por valores. Ver §6-C — alvo real é `TipoEventoContabil` (Pagamento=1, Recebimento=2), semântica e contagem de membros diferentes. |
| TipoFaturamentoContrato | `features/contratos/types/contratos.types.ts:3` | OK |
| PeriodicidadeContrato | `features/contratos/types/contratos.types.ts:8` | OK |
| StatusContrato | `features/contratos/types/contratos.types.ts:16` | OK |
| OrigemLead | `features/crm/types/crm.types.ts:3` | DIVERGE — só no frontend: Site, Telefone; só no backend: Website, LigacaoFria, Parceiro; valor diferente para: Outro. |
| StatusLead | `features/crm/types/crm.types.ts:12` | OK |
| EstagioOportunidade | `features/crm/types/crm.types.ts:18` | OK |
| StatusOportunidade | `features/crm/types/crm.types.ts:24` | DIVERGE — só no frontend: Convertida (backend não tem esse estado). |
| MotivoPerdaOportunidade | `features/crm/types/crm.types.ts:31` | DIVERGE — só no frontend: Prazo; só no backend: ForaDoPerfil, SemResposta; valor diferente para: Outro. |
| StatusProposta | `features/crm/types/crm.types.ts:40` | DIVERGE — frontend chama de "Enviada" o que o backend chama de "Aberta" (mesmo valor=1). |
| StatusDeploy | `features/deploy/types/deploy.types.ts:3` | OK |
| StatusItemChecklist | `features/deploy/types/deploy.types.ts:10` | DIVERGE — só no backend: NaoAplicavel=4 (frontend não tem esse membro). |
| StatusInventarioEstoque | `features/estoque-avancado/types/estoqueAvancado.types.ts:3` | OK |
| TipoAjusteEstoque | `features/estoque-avancado/types/estoqueAvancado.types.ts:10` | OK |
| StatusBloqueioEstoque | `features/estoque-avancado/types/estoqueAvancado.types.ts:15` | OK |
| StatusFaturamento | `features/faturamento/types/faturamento.types.ts:3` | OK |
| TipoOcorrenciaFaturamento | `features/faturamento/types/faturamento.types.ts:13` | OK |
| TipoDocumentoFiscal | `features/faturamento/types/faturamento.types.ts:19` | OK |
| LegIntegracaoFaturamento | `features/faturamento/types/faturamento.types.ts:29` | Ausente do catálogo §11 da doc; existe e bate exatamente no código-fonte (`FaturamentoLegIntegracao.cs:12`). Omissão de documentação, não divergência de contrato. |
| EstadoLegIntegracaoFaturamento | `features/faturamento/types/faturamento.types.ts:39` | Idem — bate com `FaturamentoLegIntegracao.cs:31` (4 estados; comentário do próprio frontend cita a "armadilha 2 da b55"). |
| AcaoRetomadaReversaoLeg | `features/faturamento/types/faturamento.types.ts:47` | Idem — bate com `FaturamentoContracts.cs:124`. |
| StatusContaFinanceira | `features/financeiro-avancado/types/financeiroAvancado.types.ts:3` | Bate com `Erp.Domain.Financeiro.Avancado.StatusContaFinanceira`. Ver §6-E — **não é divergência real**, é módulo-irmão do próximo item. |
| TipoContaFinanceira | `features/financeiro-avancado/types/financeiroAvancado.types.ts:11` | OK |
| OrigemImpostoNotaFiscal | `features/fiscal/types/fiscal.types.ts:114` | Ausente do catálogo §11; bate exatamente com `ImpostoNotaFiscal.cs:11`. Omissão de documentação. |
| TipoVeiculo | `features/frota/types/frota.types.ts:3` | OK |
| TipoCombustivel | `features/frota/types/frota.types.ts:13` | DIVERGE — frontend chama "Hibrido" o que o backend (valor=7) chama "Outro". |
| StatusVeiculo | `features/frota/types/frota.types.ts:23` | DIVERGE — frontend chama "Vendido" o que o backend (valor=4) chama "Baixado". |
| TipoManutencao | `features/frota/types/frota.types.ts:30` | DIVERGE — só no frontend: Preditiva=3 (backend só tem 2 membros). |
| StatusManutencao | `features/frota/types/frota.types.ts:36` | DIVERGE — só no frontend: EmAndamento=2 (inventado); valor diferente para Concluida e Cancelada. Confirmado contra `.cs`. |
| TipoDespesaVeiculo | `features/frota/types/frota.types.ts:43` | DIVERGE — frontend tem 3 membros extras (Seguro, Ipva, Licenciamento); Lavagem/Estacionamento trocados de posição; Outro=8 vs 6. Confirmado contra `.cs`. |
| TipoDocumentoVeiculo | `features/frota/types/frota.types.ts:54` | DIVERGE — Crlv e Licenciamento com valores **trocados** (FE Crlv=1/Licenciamento=4, BE Licenciamento=1/Crlv=4). Confirmado contra `.cs`. |
| StatusViagem | `features/frota/types/frota.types.ts:62` | DIVERGE — frontend chama "Encerrada" o que o backend (valor=2) chama "Concluida". |
| SeveridadeNotificacao | `features/notificacoes/types/notificacoes.types.ts:3` | OK |
| StatusNotificacao | `features/notificacoes/types/notificacoes.types.ts:10` | OK |
| CategoriaBemPatrimonial | `features/patrimonio/types/patrimonio.types.ts:3` | OK |
| StatusBemPatrimonial | `features/patrimonio/types/patrimonio.types.ts:14` | OK |
| MotivoBaixaPatrimonial | `features/patrimonio/types/patrimonio.types.ts:19` | OK |
| StatusInventarioPatrimonio | `features/patrimonio/types/patrimonio.types.ts:29` | Nome não bate com o backend (`StatusInventarioPatrimonial`); valores idênticos (Aberto=1, Encerrado=2). Divergência de nome, não de forma. |
| StatusCaixa | `features/pdv/types/pdv.types.ts:3` | OK |
| TipoMovimentoCaixa | `features/pdv/types/pdv.types.ts:8` | OK |
| MeioPagamento | `features/pdv/types/pdv.types.ts:15` | OK |
| StatusVendaPdv | `features/pdv/types/pdv.types.ts:22` | OK |
| TipoDocumentoAcesso | `features/portaria/types/portaria.types.ts:3` | DIVERGE — só no backend: CarteiraTrabalho=5; valor diferente para Outro. Confirmado contra `.cs`. |
| TipoAcesso | `features/portaria/types/portaria.types.ts:11` | DIVERGE — frontend chama "Veiculo" o que o backend (valor=5) chama "Entregador". |
| StatusPreAutorizacao | `features/portaria/types/portaria.types.ts:20` | DIVERGE — frontend tem Ativa/Expirada, backend tem Pendente; valor diferente para Cancelada. Confirmado contra `.cs`. |
| StatusRegistroAcesso | `features/portaria/types/portaria.types.ts:27` | DIVERGE — cascata de nomes trocados (AguardandoValidacao≠Entrada, Negado≠Recusado); valor diferente para Encerrado. Confirmado contra `.cs`. |
| TipoOcorrenciaAcesso | `features/portaria/types/portaria.types.ts:35` | DIVERGE — conjuntos quase disjuntos nos 3 primeiros membros; valor diferente para Comportamento e Outro. Confirmado contra `.cs`. |
| GravidadeOcorrencia | `features/portaria/types/portaria.types.ts:43` | DIVERGE — só no frontend: Critica=4 (backend só tem 3 membros). |
| StatusOcorrenciaAcesso | `features/portaria/types/portaria.types.ts:50` | OK |
| StatusFichaTecnica | `features/producao/types/producao.types.ts:3` | OK |
| StatusOrdemProducao | `features/producao/types/producao.types.ts:9` | DIVERGE — frontend chama "Rascunho" o que o backend (valor=1) chama "Planejada". |
| TipoApontamentoProducao | `features/producao/types/producao.types.ts:17` | DIVERGE — Consumo/Horas/Produzido (FE) vs ConsumoComponente/Hora/ProducaoAcabado (BE), mesmos valores 1/2/4, nomes diferentes. |
| OrigemInspecao | `features/qualidade/types/qualidade.types.ts:3` | OK |
| StatusInspecao | `features/qualidade/types/qualidade.types.ts:10` | OK |
| ResultadoCriterio | `features/qualidade/types/qualidade.types.ts:17` | OK |
| StatusNaoConformidade | `features/qualidade/types/qualidade.types.ts:23` | DIVERGE — só no frontend: Cancelada=4 (backend só tem 3 membros). |
| StatusAcaoCorretiva | `features/qualidade/types/qualidade.types.ts:30` | OK |
| RegimeTrabalho | `features/rh/types/rh.types.ts:3` | DIVERGE — Autonomo e Aprendiz com valores **trocados** (FE Autonomo=5/Aprendiz=6, BE Aprendiz=5/Autonomo=6). Confirmado contra `.cs`. |
| StatusColaborador | `features/rh/types/rh.types.ts:12` | DIVERGE — Ferias e Afastado com valores **trocados** (FE Ferias=2/Afastado=3, BE Afastado=2/Ferias=3). Confirmado contra `.cs`. |
| TipoMarcacaoPonto | `features/rh/types/rh.types.ts:19` | OK |
| OrigemPonto | `features/rh/types/rh.types.ts:26` | DIVERGE — Biometria/Aplicativo/Importacao (FE) vs Dispositivo/Importado (BE), nomes sem correspondência clara nos valores 2 e 3. |
| StatusFerias | `features/rh/types/rh.types.ts:33` | OK |
| TipoAfastamento | `features/rh/types/rh.types.ts:42` | DIVERGE — Maternidade/Paternidade/Licenca (FE) vs LicencaMaternidade/LicencaPaternidade/Suspensao (BE), mesmos valores 3/4/5, nomes diferentes. |
| StatusAfastamento | `features/rh/types/rh.types.ts:51` | OK |
| TipoBeneficio | `features/rh/types/rh.types.ts:56` | DIVERGE — só no backend: SeguroVida=6; valor diferente para Outro (FE=6, BE=7). |
| StatusColaboradorBeneficio | `features/rh/types/rh.types.ts:65` | OK |
| TipoEventoRh | `features/rh/types/rh.types.ts:70` | OK |
| OrigemEventoRh | `features/rh/types/rh.types.ts:76` | DIVERGE — só no frontend: Importacao; só no backend: Afastamento, Sistema; valor diferente para Beneficio e Ferias. |
| StatusOrdemServico | `features/servicos/types/servicos.types.ts:3` | OK |
| PrioridadeOrdemServico | `features/servicos/types/servicos.types.ts:13` | OK |
| TipoItemOrdemServico | `features/servicos/types/servicos.types.ts:20` | OK |
| TipoCfop | `features/tributacao/types/tributacao.types.ts:16` | OK |
| RegimeTributario | `features/tributacao/types/tributacao.types.ts:22` | NUMÉRICO (0,1,2), ainda não corrigido. Mesmo conceito de `administracao.types.ts`, declaração paralela e independente. Enviado no request via `enumValue()` → `z.coerce.number()`. Ver §6-A. |
| Crt | `features/tributacao/types/tributacao.types.ts:28` | OK |
| IndicadorContribuinteIcms | `features/tributacao/types/tributacao.types.ts:34` | OK |
| TipoItemSped | `features/tributacao/types/tributacao.types.ts:41` | OK |
| FinalidadeNaturezaOperacao | `features/tributacao/types/tributacao.types.ts:56` | OK |
| NaturezaTomadorServico | `features/tributacao/types/tributacao.types.ts:63` | OK |
| ModalidadeBaseCalculoIcms | `features/tributacao/types/tributacao.types.ts:70` | OK |
| ModalidadeBaseCalculoIcmsSt | `features/tributacao/types/tributacao.types.ts:77` | OK |
| RegimePisCofins | `features/tributacao/types/tributacao.types.ts:86` | OK |
| TipoCalculoIpi | `features/tributacao/types/tributacao.types.ts:91` | OK |
| TipoCalculoPisCofins | `features/tributacao/types/tributacao.types.ts:96` | OK |
| MunicipioIncidenciaIss | `features/tributacao/types/tributacao.types.ts:101` | OK |
| SituacaoRetencao | `features/tributacao/types/tributacao.types.ts:107` | OK |
| TratamentoIcmsProprio | `features/tributacao/types/tributacao.types.ts:113` | OK |
| TratamentoIpi | `features/tributacao/types/tributacao.types.ts:122` | OK |
| TratamentoPisCofins | `features/tributacao/types/tributacao.types.ts:131` | OK |
| TipoSituacaoTributariaIcms | `features/tributacao/types/tributacao.types.ts:142` | OK |
| IndicadorOperacaoCst | `features/tributacao/types/tributacao.types.ts:147` | OK |
| EntityStatus | `types/erp.ts:6` | OK |
| TipoPessoa | `types/erp.ts:14` | OK |
| TipoProduto | `types/erp.ts:19` | OK |
| TipoItemFiscal | `types/erp.ts:29` | OK |
| TipoMovimentoEstoque | `types/erp.ts:36` | DIVERGE — só no backend: TransferenciaSaida=8, TransferenciaEntrada=9 (frontend não tem, aditivo — valores 1-7 preservados). |
| StatusReservaEstoque | `types/erp.ts:46` | OK |
| StatusInventario | `types/erp.ts:53` | OK |
| TipoPedidoVenda | `types/erp.ts:59` | OK |
| StatusPedidoVenda | `types/erp.ts:64` | OK |
| OrigemFinanceira | `types/erp.ts:72` | DIVERGE — só no backend: OrdemServico=7, Frota=8 (aditivo — valores 1-6 preservados). |
| StatusContaFinanceira | `types/erp.ts:81` | OK — bate com `Erp.Domain.Financeiro.StatusContaFinanceira` (módulo base; ver §6-E). |
| StatusParcelaFinanceira | `types/erp.ts:89` | OK |
| StatusPedidoCompra | `types/erp.ts:97` | OK |
| TipoDocumentoFiscal | `types/erp.ts:107` | OK |
| TipoOperacaoFiscal | `types/erp.ts:116` | OK |
| OrigemNotaFiscal | `types/erp.ts:128` | OK |
| StatusNotaFiscal | `types/erp.ts:136` | OK |
| TipoXmlFiscal | `types/erp.ts:149` | OK |
| TipoEventoFiscal | `types/erp.ts:158` | DIVERGE — só no backend: InvalidacaoChave=13 (aditivo — valores 1-12 preservados). |
| TipoServicoTransmissaoFiscal | `types/erp.ts:173` | Ausente do catálogo §11; bate exatamente com `NotaFiscalRequests.cs:235`. Omissão de documentação. |
| TipoContingenciaFiscal | `types/erp.ts:180` | OK |
| TipoDocumentoAuxiliarFiscal | `types/erp.ts:187` | OK |
| FormatoDocumentoAuxiliarFiscal | `types/erp.ts:194` | OK |

**Leitura do total**: 131 enums; 80 batendo nome-e-valor com a doc (`OK`); 35 com o mesmo nome de enum mas
conjunto/valor de membro divergente (`DIVERGE`); 8 com nome ausente do catálogo §11, dos quais 5 confirmados
como **omissão da doc** (o enum existe e bate exatamente no `.cs`: `OrigemImpostoNotaFiscal`,
`LegIntegracaoFaturamento`, `EstadoLegIntegracaoFaturamento`, `AcaoRetomadaReversaoLeg`,
`TipoServicoTransmissaoFiscal`), 2 são **nome trocado com valor idêntico** (`NaturezaConta`,
`StatusInventarioPatrimonio`) e 1 é **divergência real sem correspondência** (`TipoEventoContabilizacao`,
ver §6-C). Isso é **antes** de qualquer pergunta sobre texto-vs-número — é o eixo "o número concorda com o
número", e em mais de um quarto dos enums do frontend ele já não concorda.

---

## 2. A separação que mais importa — quem vem como texto e quem como número

### 2.1 O que dá para medir sem sessão autenticada

**Schema do Postgres (medido, M3/M8)** — as 14 colunas `integer`/`int2` cujo nome de coluna é `Status`:

| Tabela | Coluna | Tipo |
| --- | --- | --- |
| `ajustes_estoque_operacionais` | `Status` | `integer` |
| `bloqueios_estoque_operacionais` | `Status` | `integer` |
| `caixas_operacionais` | `Status` | `integer` |
| `cargos_acesso` | `Status` | `integer` |
| `contas_bancarias_operacionais` | `Status` | `integer` |
| `contas_financeiras_operacionais` | `Status` | `integer` |
| `eventos_integracao_externa` | `Status` | `integer` |
| `grupo_acesso_matriz_permissoes` | `Status` | `integer` |
| `integracoes_externas` | `Status` | `integer` |
| `inventarios_estoque_operacionais` | `Status` | `integer` |
| `movimentos_financeiros_operacionais` | `Status` | `integer` |
| `notificacoes_internas` | `Status` | `integer` |
| `tabelas_preco` | `Status` | `integer` |
| `usuario_cargos_acesso` | `Status` | `integer` |

Todas essas 14 tabelas **também têm uma segunda coluna** de status específica do domínio, sempre
`character varying`: `bloqueios_estoque_operacionais.StatusBloqueio`,
`contas_financeiras_operacionais.StatusConta`, `inventarios_estoque_operacionais.StatusInventario`,
`movimentos_financeiros_operacionais.StatusMovimento`, `tabelas_preco.StatusTabela`,
`eventos_integracao_externa.Situacao`, `notificacoes_internas.Situacao`. Isto sugere fortemente (mas não
prova — é inferência sobre nome de coluna, não sobre forma no JSON) que a coluna `integer` é o `EntityStatus`
genérico (ativo/inativo/cancelado/bloqueado/pendente, base de toda entidade) e a coluna `varchar` é o enum de
domínio específico (`StatusPedidoVenda`, `StatusNotaFiscal` etc). Das 156 colunas `varchar` candidatas a
enum (M2), a esmagadora maioria segue esse segundo padrão.

**Valor real gravado (medido, M9-M11)** — confirma a hipótese acima onde há dado:
- `erp.empresas."RegimeTributario"` = `'LucroPresumido'` (texto — este é o caso do incidente).
- `erp.produtos."Status"`, `erp.clientes."Status"`, `erp.contas_pagar."Status"`, `erp.notas_fiscais."Status"`,
  `erp.usuarios."Status"`, `erp.pedidos_venda."Status"` = sempre `'Ativo'` (texto) — **esta é a coluna
  `EntityStatus` genérica**, e ela é `varchar`, não `integer`, nessas tabelas (só é `integer` nas 14 listadas
  acima, que são tabelas do módulo "operacional"/avançado).
- `erp.pedidos_venda."StatusPedido"` = `'Aprovado'`, `'Cancelado'`, `'Faturado'` (texto, nome exato dos
  membros do enum `StatusPedidoVenda` do catálogo).
- `erp.contas_pagar."StatusFinanceiro"` = `'Aberta'`; `erp.notas_fiscais."StatusFiscal"` = `'Rascunho'`;
  `erp.crm_leads."StatusLead"` = `'Novo'` — mesmo padrão.

**Conclusão do que é medido até aqui**: no banco, **todo enum de domínio e o `EntityStatus` genérico são
gravados como texto** (nome do membro C#), com a única exceção medida sendo as 14 colunas `Status` inteiras
listadas acima (que, pelo nome de coluna e por serem sempre acompanhadas de uma segunda coluna de status
textual, parecem ser um padrão de persistência mais antigo ou de um módulo operacional distinto — **não
verificado o porquê**, é observação, não explicação).

### 2.2 O que NÃO dá para medir sem sessão, e o que o código-fonte diz sobre isso

**Forma no banco não é forma no JSON.** A única forma de JSON real observada é a do incidente do briefing
(`regimeTributario: "LucroPresumido"`, texto). Eu não tenho credencial para repetir essa observação em nenhum
outro endpoint — todo `GET` autenticado devolve `401` (medido: `curl` em
`/api/administracao/empresas` → `401`).

Fui então ao código-fonte do backend para ver se existe alguma configuração que explique a forma texto **em
qualquer direção** (M12): **busquei em todo `src/` por `JsonStringEnumConverter`, `StringEnumConverter`
(Newtonsoft), `AddJsonOptions`, `ConfigureHttpJsonOptions`, atributo `[JsonConverter]` em qualquer enum ou
propriedade, e classe custom implementando `JsonConverter<T>`. Não encontrei nenhum.** Li
`src/Erp.Api/Program.cs` por inteiro: `AddControllers()` é chamado sem opções de JSON; o único `AddJsonOptions`
do repositório inteiro está em `Erp.Infrastructure/Cache/RedisCacheService.cs` e usa
`JsonSerializerDefaults.Web` sem conversor de enum, e é para o cache Redis, não para a resposta HTTP. O
`EmpresaResponse.RegimeTributario` (`src/Erp.Application/Administration/Empresas/EmpresaResponse.cs:17`) é
tipado como o enum `RegimeTributario` em si, não como `string`. O `EmpresasController.Listar`
(`src/Erp.Api/Controllers/Administration/EmpresasController.cs:26-27`) devolve esse objeto direto via
`Ok(empresas)`, sem transformação.

**Isso significa que, pela leitura do código, o `System.Text.Json` padrão do ASP.NET Core deveria serializar
`RegimeTributario` como número** (comportamento default quando não há conversor registrado) — o que
**contradiz diretamente** a única observação ao vivo registrada no briefing (string, vista em DevTools).
Eu não resolvo essa contradição: **não verificado** por que o comportamento observado diverge do que o
código-fonte prevê. Hipóteses que eu não confirmei e não descarto: build da imagem Docker
(`logosoft-backend`, criada em 2026-09-09, `git status` limpo no repositório nesta data) divergente do commit
lido; algum comportamento de middleware ou de biblioteca de terceiros que eu não localizei; a observação do
incidente ter sido de uma versão de código anterior à atual. **Isto é o achado mais importante desta seção**:
uma contradição documentada entre código-fonte e comportamento observado, sem explicação, que qualquer
solução de forma precisa resolver ou pelo menos reconhecer antes de escolher tratamento.

O mesmo raciocínio de código-fonte (sem conversor encontrado) vale para **todo** outro enum de resposta —
inclusive `EntityStatus`, usado em `ProdutoResponse.Status`, `ClienteResponse.Status`,
`LocalEstoqueResponse.Status`, `FornecedorResponse.Status`, `PessoaResponse.Status` (todos tipados
`EntityStatus`, confirmado lendo os `.cs`). Ou seja: **pelo código, essas respostas também deveriam vir como
número** — mas o valor real gravado no banco para essas mesmas linhas é texto (`'Ativo'`, medido em §2.1), e
o único precedente ao vivo que temos (RegimeTributario) veio como texto. As três fontes não fecham uma
narrativa única. Ver §3 para o que acontece na tela **se** a forma real for texto, e §6-B para o registro
formal da contradição.

---

## 3. Onde a comparação numérica já está errada hoje — `EntityStatus.*`, uma a uma

26 ocorrências em 22 linhas, 10 arquivos (medido, M4; grep completo abaixo). `types/erp.ts` (a própria
declaração) é excluído.

| Arquivo:linha | Trecho | O que acontece na tela se `status` chegar como string (ex.: `"Ativo"`) em vez de número |
| --- | --- | --- |
| `features/administracao/components/AdministracaoPage.tsx:34-41` (`statusLabel`) | `Number(status ?? EntityStatus.Ativo)` seguido de 4 comparações | `Number("Ativo")` é `NaN`; todas as comparações dão falso; a função sempre cai no `return 'Ativo'` final — **um registro Inativo, Cancelado, Bloqueado ou Pendente é rotulado "Ativo" na tela**, silenciosamente. |
| `AdministracaoPage.tsx:43-48` (`statusSeverity`) | mesma coerção | mesmo efeito: badge sempre `'success'` (verde), nunca `'danger'`/`'warning'`, para qualquer status real. |
| `AdministracaoPage.tsx:50` (`isActiveRecord`) | `Number(record.status ?? EntityStatus.Ativo) === EntityStatus.Ativo` | `NaN === 1` é **sempre falso** — usado em `AdministracaoPage.tsx:221-222` para `disabled` de "Editar" e "Inativar". **Os botões Editar e Inativar ficam desabilitados para todo registro de Administração** (empresas, filiais, setores, cargos, centros de custo — todo recurso que passa por `administracaoPageConfigs`), inclusive os que são realmente ativos. |
| `features/clientes/components/ClientesPage.tsx:30` (`isActive`) | mesma forma | usado em `ClientesPage.tsx:114` para `disabled` de Editar/Bloquear/Desbloquear/Inativar — os 4 ficam desabilitados para todo cliente. |
| `features/estoque/components/LocaisEstoquePage.tsx:26` (`isActive`) | mesma forma | usado em `LocaisEstoquePage.tsx:43` para o resumo `ativos`/`inativos` (contagem fica 0 ativos / N inativos) e em `:93` para desabilitar Editar/Inativar de todo local de estoque. |
| `features/fornecedores/components/FornecedoresPage.tsx:28` (`isActive`) | mesma forma | usado em `:103` para desabilitar Editar/Inativar de todo fornecedor. |
| `features/pessoas/components/PessoasPage.tsx:30` (`isActive`) | mesma forma | usado em `:119` para desabilitar Editar/Inativar de toda pessoa. |
| `features/produtos/components/CatalogoProdutoPage.tsx:44` (`isActive`) | mesma forma | usado em `:128` para desabilitar Editar/Inativar em todo o catálogo (categorias, marcas, unidades — tudo que passa por `CatalogoRecord`). |
| `features/produtos/components/ProdutoComplementoDialogs.tsx:73` (`fornecedoresAtivos`) | `fornecedores.filter((item) => Number(item.status) === EntityStatus.Ativo)` | filtro sempre vazio → **o diálogo "Vincular fornecedor" de um produto mostra zero opções no dropdown**, para qualquer fornecedor cadastrado. Confirmado lendo `:74` (`fornecedorOptions` deriva de `fornecedoresAtivos`). |
| `features/produtos/components/ProdutosPage.tsx:31` (`isActive`) | mesma forma | usado em `:160` para desabilitar Editar/Código/Fornecedor/Inativar — **4 ações por linha** desabilitadas para todo produto (e `erp.produtos."Status"` já está confirmado como `varchar 'Ativo'` no banco, §2.1 — é o candidato mais concreto a estar quebrado hoje). |
| `components/common/OperationalGovernancePanel.tsx:25-26` (`getStatus`/`isActive`) | mesma coerção | usado em `:38` e `:47` para o card "Disponíveis para operação" do painel de governança operacional (usado por várias telas "operacionais" via `EntityManagementPage`) — contagem de ativos sempre 0. |
| `components/data/StatusTag.tsx:7-14` (`normalizeStatus`) | `if (typeof status === 'number') { ...compara com EntityStatus... }`, senão `String(status).toUpperCase()` | **Este é o único ponto defensivo que funciona nos dois formatos**: se `status` chega como string, o `typeof` guard pula direto para `String(status).toUpperCase()`, que produz `'ATIVO'` corretamente a partir de `'Ativo'`. `StatusTag` é usado por `EntityManagementPage.tsx:40` (a tela genérica de CRUD dinâmico) — essa família de telas **não quebra** com a forma texto. |

**Leitura**: das 10 famílias de uso, 9 quebram silenciosamente se `status` chegar como string (viram sempre
"Ativo"/sempre desabilitado, sem erro, sem log, sem estado de erro na tela — o pior tipo de falha) e 1
(`StatusTag`) já está escrita para aceitar os dois formatos. Nenhuma delas tem teste que envie `status` como
string — não verificado se existe teste cobrindo esse caso em `tests/unit/`.

---

## 4. Os contornos existentes — `Number()`/`String()` defensivos

177 ocorrências em 67 arquivos (medido, M5 — comando no §0; exclui `tests/` e `__tests__/`). É
substancialmente mais que o piso de "≥ 8" do briefing porque a busca aqui não se limita a `EntityStatus`: cobre
todo campo cujo nome contém `status`/`Status` (o padrão dominante em toda a base — `statusPedido`,
`statusFiscal`, `statusCotacao`, `statusOS` etc.), que é exatamente a superfície de risco se a forma real
divergir do que o frontend assume.

### 4.1 Por arquivo (top 15 de 67; contagem completa no apêndice)

| Arquivo | Ocorrências |
| --- | --- |
| `features/fiscal/components/fiscalUiUtils.ts` | 13 |
| `features/estoque/components/estoqueUxUtils.ts` | 12 |
| `features/compras/components/comprasUiUtils.ts` | 10 |
| `features/vendas/components/vendasUiUtils.ts` | 8 |
| `features/qualidade/components/NaoConformidadesPage.tsx` | 6 |
| `features/frota/components/VeiculoDetalhePage.tsx` | 6 |
| `features/alimentar/components/RecallsPage.tsx` | 6 |
| `features/fiscal/components/ObservabilidadeFiscalPage.tsx` | 5 |
| `features/rh/components/AusenciasPage.tsx` | 4 |
| `features/portaria/components/RegistrosAcessoTab.tsx` | 4 |
| `features/pdv/components/CaixasPdvPage.tsx` | 4 |
| `features/fiscal/components/FiscalOperationalPanels.tsx` | 4 |
| `features/deploy/components/DeployPage.tsx` | 4 |
| `features/crm/components/PropostasPage.tsx` / `OportunidadesPage.tsx` / `LeadsPage.tsx` | 3 cada |
| `features/contabil/components/PeriodosPage.tsx` / `LancamentosPage.tsx` | 3 cada |

Os `*UiUtils.ts` no topo (`fiscalUiUtils`, `estoqueUxUtils`, `comprasUiUtils`, `vendasUiUtils`) são os módulos
centrais de regra de habilitação de ação por status (`notaPodeValidar`, `pedidoPodeAprovar`,
`pedidoCompraPodeReceber` etc.) — são exatamente as funções que decidem se um botão aparece habilitado, e
todas coagem com `Number(...)` antes de comparar com o enum. Um exemplo já remendado com três formas na mesma
linha, citado no briefing como sintoma da classe: `features/tabelas-preco/components/TabelasPrecoPage.tsx:33`:

```ts
const isTabelaAtiva = (tabela: TabelaPrecoResponse) =>
    tabela.ativo === true ||
    String(tabela.status ?? '').toLowerCase() === 'ativa' ||
    Number(tabela.status) === 1;
```

Outro padrão recorrente (17 ocorrências) é o par `labels[Number(status)] ?? String(status ?? '-')` — um
lookup por índice numérico com *fallback* para a própria string caso o índice não exista — presente em
`comprasUiUtils.ts:45,57`, `estoqueUxUtils.ts:46,68`, `fiscalUiUtils.ts` (via `FiscalOperationalPanels.tsx:32`,
`ObservabilidadeFiscalPage.tsx:33`), `vendasUiUtils.ts:43,55`. Esse padrão **não quebra visualmente** se
`status` vier como string (cai no fallback e mostra a própria string), mas está sempre acompanhado, no mesmo
arquivo, de outra função `Number(status) === EnumX.Y` para decidir permissão de ação — que quebra do mesmo
jeito descrito na §3.

### 4.2 Apêndice — lista completa (167 dos 177, arquivo:linha; ver nota abaixo)

A lista integral de 177 ocorrências foi gerada pelo comando de M5 e revisada uma a uma para este relatório.
Por economia de espaço no corpo do documento, o arquivo bruto (177 linhas, `arquivo:linha:trecho`) está
reproduzível **exatamente** rodando o comando de M5 — não há amostragem: todo arquivo tocado está na tabela
por-arquivo de §4.1 (67 arquivos, soma = 177). Trechos de maior risco adicionais aos já citados em §3:

- `features/fiscal/components/fiscalUiUtils.ts:207-387` (13 ocorrências) — toda a família `notaPodeXxx`
  (`notaPodeEditarItens`, `notaPodeValidar`, `notaPodeAssinarXml`, `notaPodeTransmitir`, `notaPodeCancelar`,
  `notaPodeCartaCorrecao`, `notaPodeGerarDanfe`) usa `Number(nota?.statusFiscal) === StatusNotaFiscal.X`. Se
  `statusFiscal` chegar como string, **toda a barra de ações da Nota Fiscal cai no fallback `?? false` do
  `acaoResumo`**, e a nota fica sem nenhuma ação disponível.
- `features/compras/components/comprasUiUtils.ts:60-196` — `pedidoCompraPodeEditar/Aprovar/Cancelar/Receber`,
  mesma forma; pedido de compra fica sem ações.
- `features/vendas/components/vendasUiUtils.ts:66-96` — `pedidoPodeEditar/Aprovar/Cancelar/Faturar`, mesma
  forma.
- `features/rh/components/AusenciasPage.tsx:80,102,158,160` — férias e afastamentos: badge e ação "Encerrar"
  dependem da mesma coerção.
- `features/frota/components/VeiculoDetalhePage.tsx:107-183` — troca de status do veículo e ações de
  manutenção (Concluir/Cancelar).

---

## 5. O que envia enum no request — schemas Zod

64 pontos de validação de enum de request (M6 + M7): 50 usam `z.nativeEnum(EnumX)` em 18 arquivos de
`features/*/schemas/`; 14 usam o par local `enumValue`/`enumValueNullable` só em
`features/tributacao/schemas/tributacaoSchemas.ts`.

**Forma enviada hoje, por construção**:

- `z.nativeEnum(EnumX)` valida contra `Object.values(EnumX)` do enum TypeScript **como declarado**. Dos 131
  enums do frontend, **129 são numéricos e 2 são o mesmo `RegimeTributario`** (um texto, um número — §1). Ou
  seja: **49 dos 50 usos de `z.nativeEnum` hoje enviam número** no request (o único que envia texto é
  `regimeTributarioSchema` em `features/administracao/schemas/administracaoSchemas.ts:17`, que referencia o
  `RegimeTributario` já convertido para string enum nesta fatia).
- O par `enumValue`/`enumValueNullable` de tributação (`features/tributacao/schemas/tributacaoSchemas.ts:72-82`)
  é ainda mais explícito: `enumValue` é literalmente `z.coerce.number().refine(...)` — **força número mesmo
  que o valor de origem seja string**. Usado para `TipoItemSped`, `TipoCfop` (×2), `RegimeTributario` (linhas
  116 e 248 — o `RegimeTributario` numérico, não o de administração), `IndicadorContribuinteIcms`,
  `FinalidadeNaturezaOperacao`, `NaturezaTomadorServico`, `ModalidadeBaseCalculoIcms`,
  `ModalidadeBaseCalculoIcmsSt`, `TipoCalculoIpi`, `RegimePisCofins`, `TipoCalculoPisCofins` (×2),
  `MunicipioIncidenciaIss`.

**Tabela completa dos 50 `z.nativeEnum`** (arquivo, campo, enum-alvo):

| Arquivo | Campo(s) | Enum(s) |
| --- | --- | --- |
| `administracaoSchemas.ts:17` | `regimeTributario` | `RegimeTributario` (**texto** — único exceção) |
| `alimentarSchemas.ts:24,35,44` | `origem`, `tipo`, `gravidade` | `LoteOrigem`, `TipoMovimentacaoLote`, `GravidadeRecall` |
| `bancosSchemas.ts:40` | `tipoCobranca` | `TipoCobranca` |
| `contabilSchemas.ts:23,24,40,66` | `tipo`, `natureza`, `tipo`, `tipoEvento` | `TipoContaContabil`, `NaturezaConta`, `TipoPartida`, `TipoEventoContabilizacao` (ver §6-C) |
| `contratosSchemas.ts:26,27` | `tipoFaturamento`, `periodicidade` | `TipoFaturamentoContrato`, `PeriodicidadeContrato` |
| `crmSchemas.ts:27,39,42,48` | `origem`, `estagio`, `motivo`, `tipo` | `OrigemLead`, `EstagioOportunidade`, `MotivoPerdaOportunidade`, `TipoPedidoVenda` |
| `estoqueAvancadoSchemas.ts:39` | `tipo` | `TipoAjusteEstoque` |
| `faturamentoSchemas.ts:24,39,40` | `tipoDocumento`, `leg`, `acao` | `TipoDocumentoFiscal`, `LegIntegracaoFaturamento`, `AcaoRetomadaReversaoLeg` |
| `frotaSchemas.ts:28,29,41,50,57,67,76` | `tipo`, `combustivel`, `status`, `combustivel`, `tipo`, `tipo`, `tipo` | `TipoVeiculo`, `TipoCombustivel` (×2), `StatusVeiculo`, `TipoManutencao`, `TipoDespesaVeiculo`, `TipoDocumentoVeiculo` |
| `patrimonioSchemas.ts:26,44` | `categoria`, `motivo` | `CategoriaBemPatrimonial`, `MotivoBaixaPatrimonial` |
| `pdvSchemas.ts:39` | `meio` | `MeioPagamento` |
| `pessoasSchemas.ts:28` | `tipoPessoa` | `TipoPessoa` |
| `portariaSchemas.ts:22,24,37,39,60,61` | `documentoTipo`, `tipoAcesso` (×2 cada), `tipo`, `gravidade` | `TipoDocumentoAcesso` (×2), `TipoAcesso` (×2), `TipoOcorrenciaAcesso`, `GravidadeOcorrencia` |
| `producaoSchemas.ts:48` | `tipo` | `TipoApontamentoProducao` |
| `produtosSchemas.ts:65,81,101` | `tipoProduto` (×2), `tipoItemFiscal` | `TipoProduto` (×2), `TipoItemFiscal` |
| `qualidadeSchemas.ts:27` | `origem` | `OrigemInspecao` |
| `rhSchemas.ts:32,67,68,81,93,110,115` | `regime`, `tipo`, `origem`, `tipo`, `tipo`, `tipo`, `origem` | `RegimeTrabalho`, `TipoMarcacaoPonto`, `OrigemPonto`, `TipoAfastamento`, `TipoBeneficio`, `TipoEventoRh`, `OrigemEventoRh` |
| `servicosSchemas.ts:25,42` | `prioridade`, `tipo` | `PrioridadeOrdemServico`, `TipoItemOrdemServico` |

**Cruzamento com §1 (deriva numérica)**: pelo menos 9 desses campos de request usam um enum que já está
com **valor trocado** contra o backend (confirmado contra `.cs`, §1): `TipoDocumentoAcesso`, `TipoAcesso`,
`RegimeTrabalho`, `StatusVeiculo`, `TipoManutencao`, `TipoDespesaVeiculo`, `TipoDocumentoVeiculo`,
`TipoOcorrenciaAcesso`, `GravidadeOcorrencia`. Isso é **independente** da pergunta texto-vs-número: mesmo que
o backend aceite número hoje, o número que esses formulários enviam pode já não significar o que o usuário
selecionou — ver §6-D para o andar-a-andar de `RegimeTrabalho` e `TipoDocumentoVeiculo`.

---

## 6. Divergências apontadas, sem conserto

### A — `RegimeTributario`: a mesma classe de defeito, aberta em dois lugares, uma corrigida e outra não

`features/administracao/types/administracao.types.ts:7` — string enum, corrigido nesta fatia (`v1.11.0a8b58.c3`
em voo). `features/tributacao/types/tributacao.types.ts:22` — **numérico** (`SimplesNacional = 0,
LucroPresumido = 1, LucroReal = 2`), com o comentário do próprio arquivo (linha 21) dizendo "Sem valores
explícitos no backend — serializa 0/1/2 pela ordem de declaração de `RegimeTributario`" — leitura correta do
`.cs` (`src/Erp.Domain/Administration/RegimeTributario.cs`, sem `= n`), mas leitura que o próprio incidente do
briefing mostrou não bater com o observado. Este segundo `RegimeTributario` é usado em
`features/tributacao/components/SimuladorTributacaoPage.tsx:57`, `tributacaoUiUtils.ts:35-37` e, mais grave,
**enviado no request** de simulação de tributação via `enumValue(RegimeTributario, ...)` em
`tributacaoSchemas.ts:116` (campo `regimeEmpresa`, obrigatório) e `:248` (`enumValueNullable`, opcional) —
ambos forçando `z.coerce.number()`. Se a forma real do backend para este campo for texto (o que o incidente
sugere, mas não confirma para este endpoint específico), o simulador de tributação está hoje na mesma posição
em que o formulário de Empresa estava antes da correção.

### B — Contradição não resolvida entre código-fonte do backend e a observação ao vivo (ver §2.2)

Registrado formalmente aqui: nenhum conversor de enum→string foi encontrado em nenhum lugar do backend
(M12); pela leitura do código, toda resposta com propriedade tipada como enum C# deveria serializar como
número; a única observação ao vivo (RegimeTributario da Empresa) veio como string. As duas fontes não fecham.
**Pendência de backend**: alguém com acesso de execução/depuração ao processo do `logosoft-backend` precisa
confirmar, com um `GET` autenticado real e inspeção do `Content-Type`/corpo, qual é a forma de saída de pelo
menos: `EmpresaResponse.RegimeTributario`, `ProdutoResponse.Status`, `PedidoVendaResponse.StatusPedido`,
`NotaFiscalResponse.StatusFiscal`. Sem isso, qualquer correção de forma no frontend é uma aposta.

### C — `TipoEventoContabilizacao` não corresponde a nenhum enum do backend, por nome nem por valor

`features/contabil/types/contabil.types.ts:32`: `BaixaContaReceber = 1, BaixaContaPagar = 2, Outro = 3`.
Usado em `features/contabil/components/ContabilDialogs.tsx:168` (valor inicial do formulário de "Regra de
Contabilização") e enviado via `z.nativeEnum(TipoEventoContabilizacao)` em `contabilSchemas.ts:66`, campo
`tipoEvento` de `CriarRegraContabilizacaoRequest`.

O backend, em `src/Erp.Application/Contabil/Regras/RegraContabilizacaoContracts.cs:10`, tipa esse mesmo campo
como `TipoEventoContabil` (`src/Erp.Domain/Contabil/ContabilEnums.cs:52`): **`Pagamento = 1, Recebimento = 2`
— só 2 membros, nomes e semântica completamente diferentes**. Efeito concreto, andar a andar:

1. Usuário abre "Nova regra de contabilização" e escolhe **"Baixa de conta a receber"** (label em
   `contabilLabels.ts:39`, valor enviado = `1`).
2. O backend recebe `TipoEvento = 1` e entende **`TipoEventoContabil.Pagamento`** (valor 1 no enum real) —
   o oposto semântico do que o usuário escolheu.
3. A regra é persistida e mais tarde consultada por `ObterRegraAtivaAsync(empresaId, request.TipoEvento, ...)`
   em `ContabilizarBaixaFinanceiraUseCase.cs:30`/`ReverterContabilizacaoBaixaUseCase.cs:25`, onde
   `request.TipoEvento` ali **é** um `TipoEventoContabil` real vindo de um evento de baixa financeira de
   verdade (Pagamento ou Recebimento). A regra criada como "para recebíveis" (na cabeça do usuário) na
   prática só é encontrada para eventos de **pagamento**.
4. Se o usuário escolher **"Outro"** (valor enviado = `3`), o backend grava um `TipoEventoContabil` com valor
   `3`, que **não existe** no enum (só há 1 e 2) — essa regra nunca será encontrada por nenhuma baixa real
   (`request.TipoEvento` de uma baixa real só é 1 ou 2), ficando **permanentemente órfã**.

Isto não depende de forma texto-vs-número — acontece igual com número em ambos os lados. É divergência de
**modelo**, não de **forma**, e por isso o quarteto não deve tratá-la junto da correção de enum de texto: uma
mudança de forma não resolve isto.

### D — Deriva numérica confirmada contra código-fonte, independente da pergunta texto-vs-número (ver §1)

15 enums verificados linha a linha contra o `.cs` do backend têm **nome de membro idêntico com valor
numérico diferente**, ou nomes trocados sobre o mesmo valor. Dois exemplos com request ativo hoje:

- `RegimeTrabalho` (`features/rh/types/rh.types.ts:3`): frontend `Autonomo = 5, Aprendiz = 6`; backend
  (`RhEnums.cs:9-10`) `Aprendiz = 5, Autonomo = 6` — **trocados**. Enviado via `z.nativeEnum(RegimeTrabalho)`
  em `rhSchemas.ts:32`, campo `regime` do colaborador. Selecionar "Autônomo" no formulário envia `5`, que o
  backend lê como `Aprendiz`.
- `TipoDocumentoVeiculo` (`features/frota/types/frota.types.ts:54`): frontend `Crlv = 1, ..., Licenciamento =
  4`; backend (`FrotaEnums.cs:64-69`) `Licenciamento = 1, ..., Crlv = 4` — **trocados**. Enviado via
  `z.nativeEnum(TipoDocumentoVeiculo)` em `frotaSchemas.ts:76`.

Lista completa dos 15 com deriva confirmada contra `.cs` (não só contra a doc): `RegimeTrabalho`,
`StatusColaborador`, `TipoDocumentoVeiculo`, `StatusManutencao`, `TipoDespesaVeiculo`, `StatusPreAutorizacao`,
`StatusRegistroAcesso`, `TipoOcorrenciaAcesso`, `LoteOrigem`, `TipoMovimentacaoLote`, `StatusRecall`,
`OrigemLead`, `MotivoPerdaOportunidade`, `TipoDocumentoAcesso`, `TipoCobranca`. Os demais 20 do total de 35
divergentes em §1 foram conferidos contra `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §11, mas não
individualmente contra o `.cs` — mesma ressalva de confiabilidade da doc já discutida (ela é lacunar, mas nos
22 casos onde comparei os dois, o valor nunca esteve errado, só ausente).

**Observação estrutural, não solução**: se a forma escolhida pelo quarteto for baseada em nome (string, ou
`z.nativeEnum` sobre string enum), essa classe de bug desaparece como efeito colateral, porque comparação por
nome não tem ordinal para desalinhar. Se a forma continuar numérica, os 15 itens desta lista continuam
quebrados independentemente de qualquer correção de forma.

### E — Catálogo §11 da doc está incompleto e tem 2 entradas contraditórias (e um falso positivo do meu comparador)

`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §11 (linhas 3354-3512) não lista `OrigemImpostoNotaFiscal`,
`LegIntegracaoFaturamento`, `EstadoLegIntegracaoFaturamento`, `AcaoRetomadaReversaoLeg`,
`TipoServicoTransmissaoFiscal` — os 5 existem e batem exatamente no `.cs` (confirmado). É lacuna de
documentação, registrada aqui como pendência de doc, não de contrato.

Mais grave para quem for usar a doc como fonte automatizada: as linhas 3416-3417 e 3497-3498 listam
`StatusContaFinanceira` e `TipoMovimentoFinanceiro` **duas vezes cada, com membros diferentes**, sem indicar
o namespace. Fui ao `.cs` conferir: são **dois enums C# distintos e legítimos**,
`Erp.Domain.Financeiro.StatusContaFinanceira` (`Aberta=1, ParcialmenteQuitada=2, ...`) e
`Erp.Domain.Financeiro.Avancado.StatusContaFinanceira` (`Aberta=1, ParcialmenteBaixada=2, ...`) — o próprio
`Program.cs:102-103` do backend cita esse par nominalmente como exemplo de colisão de nome curto entre
namespaces (`CustomSchemaIds`). O frontend espelha corretamente com duas declarações separadas
(`types/erp.ts:81` e `features/financeiro-avancado/types/financeiroAvancado.types.ts:3`) — **isto não é uma
divergência real**; é um falso positivo do meu comparador automático de nome-só (que não distingue namespace),
registrado aqui para que o quarteto não gaste tempo nele. Mesmo raciocínio para `TipoMovimentoFinanceiro`,
com a diferença de que **nenhuma das duas variantes está declarada como enum no frontend** — onde o campo é
usado, é como número solto ou string livre (não verificado individualmente, fora do escopo desta rodada).

### F — Nomes divergentes com valor idêntico, baixo risco de dado / alto risco de rastreabilidade

`NaturezaConta` (frontend, `contabil.types.ts:11`) vs `NaturezaContaContabil` (backend) — `Devedora=1,
Credora=2` nos dois. `StatusInventarioPatrimonio` (frontend, `patrimonio.types.ts:29`) vs
`StatusInventarioPatrimonial` (backend) — `Aberto=1, Encerrado=2` nos dois. Não corrompem dado hoje (mesmo
valor), mas qualquer busca textual por nome de enum no backend a partir do nome do frontend falha, e
qualquer geração automática de tipo a partir do nome vai divergir.

### G — Campo genérico `status`/`Status`: DB texto, tipo de resposta backend é enum sem conversor, frontend assume número

Consolidação de §2 e §3: `produtos.Status`, `clientes.Status`, `contas_pagar.Status`, `pedidos_venda.Status`
etc. são gravados como texto no banco (medido); os response records do backend tipam esse campo como
`EntityStatus` (enum C#, confirmado no `.cs`) sem conversor JSON encontrado em lugar nenhum (medido); e 9
arquivos do frontend fazem `Number(record.status) === EntityStatus.Ativo` (medido, §3), o que falha
silenciosamente se a forma real for texto. Esta é a mesma classe de defeito do incidente de Empresa, só que
espalhada por Produtos, Clientes, Fornecedores, Pessoas, Locais de Estoque e o catálogo de Administração — e,
diferente do incidente de Empresa, **aqui o sintoma não é "o formulário não salva"**: é "o botão de
editar/inativar fica sempre desabilitado e o filtro de ativos sempre vazio", o que é mais fácil de confundir
com "está funcionando, só não tem nada pra fazer" — o anti-padrão citado no manual da skill
("ignorar enum fixo no frontend porque está funcionando").

---

## Nota de reprodutibilidade

Os comandos de §0 (M1-M14) reproduzem cada número afirmado. O script Node usado para a comparação
membro-a-membro de M13/M14 (`compare_enums.js`) parseia `export enum NOME { ... }` do frontend e as linhas
`Nome = Membro = n, Membro = n, ...` de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §11; ele não foi versionado
no repositório (é ferramenta de inventário, não código de produto) — qualquer um pode reconstruí-lo com a
mesma lógica: regex `/export enum (\w+)\s*\{([^}]*)\}/g` no lado frontend, regex `/^(\w+)\s*=\s*(.+)$/` linha
a linha no bloco entre `## 11. Catálogo de enums` e o fechamento de code fence seguinte no lado backend.

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "forma-dos-enums-frontend-backend",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/05-inventario-forma-dos-enums.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "Com um GET autenticado real, qual é a forma (número ou texto) de EmpresaResponse.RegimeTributario, ProdutoResponse.Status, PedidoVendaResponse.StatusPedido e NotaFiscalResponse.StatusFiscal hoje em produção/homologação? O código-fonte (sem JsonStringEnumConverter em lugar nenhum) prevê número; a única observação ao vivo registrada (RegimeTributario, DevTools, 2026-09-21) foi texto.", "decide": "se a correção de forma é 'frontend estava certo em algum lugar e errado em outro' ou 'existe algo no ambiente de execução que o código-fonte lido não explica'" },
    { "tipo": "backend", "pergunta": "CriarRegraContabilizacaoRequest.TipoEvento é `TipoEventoContabil` (Pagamento=1, Recebimento=2). O frontend manda `TipoEventoContabilizacao` (BaixaContaReceber=1, BaixaContaPagar=2, Outro=3). Qual desses dois modelos é o correto para a tela de Regras de Contabilização, e o que o backend faz hoje com o valor 3 (Outro)?", "decide": "se a tela de Regras de Contabilização precisa de correção de modelo antes ou independente da correção de forma" },
    { "tipo": "backend", "pergunta": "Por que RegimeTributario, StatusColaborador, TipoDocumentoVeiculo e mais 12 enums têm o mesmo nome de enum e de membros no frontend e no backend, mas valores numéricos diferentes ou trocados? Isso é drift de manutenção (um lado mudou e o outro não acompanhou) ou os dois lados nunca estiveram alinhados?", "decide": "se a correção destes 15 casos é tratada como parte da rodada de forma de enum ou como corretiva própria, já que ela existe e quebra mesmo sem trocar a forma para texto" }
  ],
  "riscos": [
    "Contradição não resolvida entre código-fonte do backend (nenhum conversor enum->string encontrado em src/, portanto serialização numérica esperada por padrão) e a única observação ao vivo do incidente (string). Não classifiquei porque faltam dados de execução (M12 + §2.2 + §6-B).",
    "15 enums com deriva numérica confirmada contra o .cs do backend (RegimeTrabalho, StatusColaborador, TipoDocumentoVeiculo e mais 12, listados em §6-D) continuam quebrados mesmo que a forma vire texto em toda parte, se a correção comparar por posição em vez de por nome — registrado, não classificado, porque a forma de correção é decisão do quarteto.",
    "TipoEventoContabilizacao (frontend) não corresponde a nenhum enum do backend por nome nem por valor (§6-C) — pode estar corrompendo regras de contabilização em produção hoje, com ou sem sessão real para confirmar, porque o request e a leitura da regra usam o mesmo campo numérico em contextos com enums C# diferentes.",
    "177 ocorrências de Number()/String() defensivo em 67 arquivos (§4) não foram testadas uma a uma quanto a comportamento com status em string — o levantamento é estático (leitura de código), não de execução."
  ]
}
```
