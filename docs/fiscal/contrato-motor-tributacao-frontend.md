# Contrato do Motor de Tributação para o frontend

> **Cópia de leitura.** O original é mantido pelo backend em `docs/fiscal/contrato-motor-tributacao-frontend.md`
> do repositório `New project 3`. Em caso de divergência, **aquele vence** — atualize esta cópia em vez de
> editá-la de forma independente. A implementação frontend correspondente está em `features/tributacao/`
> (ver `docs/IMPLEMENTACAO_MOTOR_TRIBUTACAO_FRONTEND.md`).

> Interface entre o backend (Módulo 05, v1.14.0) e o frontend. Escrito no fechamento do G10.
> Quem consome: telas de simulação fiscal, e futuramente emissão (Mód. 06), faturamento (10),
> entrada (12) e PDV (23).

## O endpoint

```
POST /api/fiscal/tributacao/simular
```

Permissão: **`FISCAL_REGRAS_CONSULTAR`**. Exige contexto organizacional — a empresa/filial do corpo
tem de pertencer ao usuário autenticado.

**É read-only.** `POST` só porque o corpo é grande demais para query string: **não persiste nada**,
não gera documento, não consome numeração. Pode ser chamado a cada alteração de campo na tela sem
efeito colateral.

---

## Request

Campos de **cabeçalho** (valem para o documento inteiro):

| Campo | Tipo | Obrig. | Observação |
| --- | --- | :---: | --- |
| `empresaId` | guid | ✔ | |
| `filialId` | guid? | | |
| `tipoOperacao` | enum `TipoCfop` | ✔ | Entrada/Saída |
| `regimeEmpresa` | enum `RegimeTributario` | ✔ | SimplesNacional / LucroPresumido / LucroReal |
| `crtEmitente` | enum `Crt`? | | |
| `ufOrigem` | string(2) | ✔ | |
| `ufDestino` | string(2) | ✔ | aceita `"EX"` para exterior |
| `codigoMunicipioOrigem` / `codigoMunicipioDestino` | string? | | exigidos quando há ISS |
| `indicadorContribuinteDestinatario` | enum | ✔ | Contribuinte / Isento / NaoContribuinte |
| `consumidorFinal` | bool | ✔ | com o anterior, decide o DIFAL |
| `dataOperacao` | date | ✔ | **resolve toda vigência** — regra, exceção, alíquota interestadual, FCP, teto do INSS |
| `destinatarioContribuinteIpi` | bool | | decide se o IPI entra na **base do ICMS** |
| `emitenteContribuinteIpi` | bool | ✔ | decide se **há IPI**. Obrigatório de propósito: default silencioso zeraria o IPI inteiro |
| `finalidade` | enum | | Normal por default |
| `naturezaTomadorServico` | enum | | NaoAplicavel por default; decide as retenções |
| `valorFreteTotal` / `valorSeguroTotal` / `valorOutrasDespesasTotal` / `valorDescontoTotal` | decimal | | **do documento inteiro** — o backend rateia |
| `itens[]` | array | ✔ | ao menos um |

Cada item de `itens[]`:

| Campo | Tipo | Obrig. | Observação |
| --- | --- | :---: | --- |
| `identificadorItem` | string? | | eco na resposta; use para religar resultado ↔ linha da tela |
| `origemMercadoria` | string(1) | ✔ | Tabela A (0–8) |
| `tipoItem` | enum `TipoItemSped` | ✔ | **decide mercadoria × serviço** |
| `ncmId` / `cfopId` | guid? | | usados na resolução da regra |
| `ncmCodigo` / `cestCodigo` / `cfopCodigo` | string? | | |
| `quantidade` | decimal | ✔ | **não pode ser zero** |
| `valorUnitario` | decimal | ✔ | |
| `valorProduto` | decimal | ✔ | **informado, não derivado** de quantidade × unitário — é o que o documento carrega, e é o peso do rateio |

### Duas coisas que o frontend precisa saber sobre o rateio

Frete, seguro, outras despesas e desconto são enviados **do documento**, não por item. O backend rateia
proporcionalmente ao `valorProduto` e devolve, em cada item, o quanto coube a ele. **Não ratear no
frontend** — a soma tem de fechar exatamente com o total, e o backend joga o resíduo de centavos no
item de maior valor justamente para isso. Rateio duplicado dá diferença de centavo e a NF-e é rejeitada.

`valorProduto` é informado e não recalculado. A NF-e tolera divergência de centavos por arredondamento
na origem, e recalcular faria o motor reescrever um número que o documento já fixou.

---

## Response 200

```
{ "itens": [ { "indice", "identificadorItem", "valoresUtilizados", "resultado" } ] }
```

`indice` é a posição 0-based na entrada — liga o resultado ao item mesmo sem `identificadorItem`.

`valoresUtilizados` traz `quantidade`, `valorUnitario`, `valorProduto`, `valorFreteRateado`,
`valorSeguroRateado`, `valorOutrasDespesasRateado`, `valorDescontoRateado` e `baseBruta`. Serve para a
tela mostrar a composição sem refazer o rateio.

`resultado` traz os blocos por tributo: `icms`, `icmsSt`, `difal`, `ipi`, `pis`, `cofins`, `iss`,
`retencoes`, mais `regraAplicadaId` e `excecaoAplicadaId`.

### A regra mais importante de leitura: bloco `null` ≠ zero

**`null` significa "não calculado", nunca "não devido".** É a convenção que atravessa o módulo inteiro.

- Item de **mercadoria**: `icms` preenchido, `iss` e `retencoes` nulos.
- Item de **serviço**: `iss` preenchido, `icms`/`icmsSt`/`difal`/`ipi` nulos.
- `icmsSt` nulo = a situação tributária **não comporta** ST; não é "ST zero devido".
- `ipi` nulo = o emitente não é contribuinte do IPI.
- `difal` nulo = fora da hipótese de consumidor final não contribuinte interestadual.

Na tela, **não renderize `null` como `0,00`** — são coisas diferentes, e confundi-las é o defeito mais
caro deste domínio. Prefira omitir a linha do tributo ou marcá-la como não aplicável.

Um tributo com **valor zero e bloco preenchido** é diferente: significa isenção, alíquota zero ou
retenção dispensada, e aí o zero é a informação. Nas retenções isso é explícito — cada uma carrega
`NaoAplicavel` / `Dispensado` / `Retido`.

### A trilha (por que deu esse imposto)

`regraAplicadaId` e `excecaoAplicadaId` dizem qual regra fiscal e qual exceção/benefício produziram o
resultado; o código de benefício vem dentro do bloco `icms`. Cada bloco também expõe base, alíquota e
os fatores usados (por exemplo, no ST, qual MVA foi aplicada e se foi a ajustada).

Isso existe para o cálculo ser **explicável sem refazê-lo** — é o que permite a tela responder "por que
deu esse valor", e é o que a auditoria fiscal exige. Vale expor isso na interface, nem que seja num
painel recolhível.

---

## Erros

### 422 — o cálculo não pôde ser feito

Corpo: `{ "codigo", "message" }`. **Trate pelo `codigo`, nunca pelo texto** — a mensagem pode mudar.

| Código | O que aconteceu | O que a tela deve dizer |
| --- | --- | --- |
| `FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL` | Não há regra cadastrada para essa combinação | "Não há regra fiscal para esta operação" — é cadastro faltando, não erro do usuário |
| `FISCAL_TRIBUTACAO_REGRA_FORA_DE_VIGENCIA` | Existe regra, mas não para essa data | Sugerir conferir a data da operação |
| `FISCAL_TRIBUTACAO_REGRA_AMBIGUA` | Duas regras igualmente específicas | Erro de cadastro: há regras conflitantes; a mensagem nomeia quais |
| `FISCAL_TRIBUTACAO_FCP_NAO_DEFINIDO_PARA_UF` | Sem FCP para a UF na data | Carga de tabela pendente |
| `FISCAL_TRIBUTACAO_ALIQUOTA_INTERESTADUAL_NAO_ENCONTRADA` | Par de UFs sem alíquota cadastrada | Carga de tabela pendente |
| `FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO` | Teto do INSS sem carga para a data | Carga de tabela pendente |
| `FISCAL_TRIBUTACAO_ITEM_INVALIDO` | Item inconsistente (quantidade zero, desconto maior que a base) | Erro do preenchimento; apontar o item |
| `FISCAL_TRIBUTACAO_REGRA_INCOMPLETA` | A regra existe mas não parametriza o tributo necessário | Cadastro incompleto |

**Nenhum desses devolve cálculo parcial.** O motor não calcula "zero" quando falta parametrização —
tributo zerado por regra ausente é o defeito mais caro possível, porque ninguém percebe até a
fiscalização. Prefira mostrar o erro a mostrar um total.

### 400 — contexto organizacional

Empresa/filial fora do contexto do usuário.

### 401 / 403

Não autenticado / sem a permissão `FISCAL_REGRAS_CONSULTAR`.

---

## Notas de compatibilidade

- **Enums são serializados como número**, não string. Não dependa da ordem dos valores; mapeie
  explicitamente no frontend.
- Os blocos de resultado são hoje **tipos de domínio expostos diretamente**. Isso foi uma decisão
  consciente para não duplicar a superfície, mas tem uma consequência: **mudança nesses records é
  mudança de contrato de API**, e será tratada como tal. Se algum campo precisar mudar, o backend
  versiona — o frontend não vai descobrir por quebra.

## Pendências que afetam o que a tela vai ver

- **Teto do INSS sem carga das portarias de 2025/2026** — toda retenção de INSS responde hoje `422
  FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO`. É o comportamento desejado (falha barulhenta em vez de
  teto defasado), mas a tela de serviços vai bater nisso até a carga.
- **Alíquotas interestaduais e FCP têm apenas seed mínimo** — pares de UF fora do seed respondem 422.
- **Sem golden test contra notas reais do legado** — o motor está provado por matriz sintética, que
  demonstra consistência, não correção contra o sistema atual.
