# Plano de frontend — Motor de Tributação (backend Módulo 05, v1.14.0)

> Escrito em 2026-08-05, no fechamento do backend (PR #5 mergeado).
> Fonte de verdade do contrato: `docs/fiscal/contrato-motor-tributacao-frontend.md` **no repositório do
> backend** (`New project 3`). Se este documento divergir daquele, aquele vence.

## 1. O que o backend passou a oferecer

Dado o contexto de uma operação, o backend calcula **todos** os tributos incidentes: ICMS próprio,
ICMS-ST, DIFAL, FCP, IPI, PIS/COFINS, ISS e retenções na fonte (IRRF, INSS, PCC, ISS retido) — com o
cadastro de regras que os parametriza, as exceções/benefícios por NCM e UF, e a resolução por melhor
correspondência.

Três superfícies REST nasceram:

| Superfície | Rota | Permissão | Natureza |
| --- | --- | --- | --- |
| **Simulação de tributação** | `POST /api/fiscal/tributacao/simular` | `FISCAL_REGRAS_CONSULTAR` | read-only, sem efeito colateral |
| **Cadastro de regras fiscais** | `/api/fiscal/regras` | `FISCAL_REGRAS_CONSULTAR` / `_GERENCIAR` | CRUD |
| **Exceções e benefícios** | `/api/fiscal/excecoes` e `/api/fiscal/excecoes-ncm` | idem | CRUD |

## 2. O que será implementado no frontend

Três entregas, na ordem de valor. Seguem a estrutura já usada em `features/fiscal/`
(`api/`, `hooks/`, `schemas/`, `types/`, `components/`, `tests/`).

### Entrega 1 — Simulador de tributação (a mais valiosa, e a mais barata)

Rota nova: `app/(main)/fiscal/simulador/page.tsx`.

Um formulário de cabeçalho + grade de itens que chama `/simular` e mostra o resultado por item, com a
composição da base e a **trilha do cálculo** (qual regra e qual exceção produziram o número).

Por que primeiro: é read-only, não depende de nenhum outro módulo, e é o que permite o time fiscal
**validar o motor** contra os cálculos do sistema legado antes de qualquer emissão. Também é a tela
que dá o retorno mais rápido sobre cargas de tabela faltando.

### Entrega 2 — Cadastro de regras fiscais

Rota: `app/(main)/fiscal/regras/`, com lista, formulário e inativação.

A regra tem cabeçalho (chave de resolução) mais até cinco blocos opcionais por tributo (ICMS, IPI,
PIS/COFINS, ISS, retenções). A UI precisa deixar claro que **bloco ausente = tributo não parametrizado**,
não "tributo zero".

### Entrega 3 — Exceções e benefícios

Rotas: `app/(main)/fiscal/excecoes/` e `.../excecoes-ncm/`.

Sobrepõem a regra geral para NCM+UF. Cobrem **só** ICMS próprio e PIS/COFINS. A UI tem de mostrar a
precedência (`exceção NCM > exceção > regra`) para o usuário entender por que uma exceção não pegou.

---

## 3. Workflow do simulador (a cadeia de comandos)

```
[Usuário monta a operação na tela]
        │
        │  cabeçalho: empresa/filial, tipo de operação, regime, UF origem→destino,
        │             município origem/destino, indicador de contribuinte,
        │             consumidor final, data da operação, emitente contribuinte do IPI
        │  itens[]:   origem da mercadoria, tipo do item, NCM/CFOP/CEST,
        │             quantidade, valor unitário, valor do produto
        │  documento: frete, seguro, outras despesas, desconto  ← TOTAIS, não por item
        ▼
[Validação local — Zod, em features/fiscal/schemas/]
        │  bloqueia: nenhum item; quantidade zero; desconto total > soma dos produtos;
        │            UF fora de 2 letras; data ausente
        ▼
[POST /api/fiscal/tributacao/simular]
        │
        ├─ 200 → renderiza por item: valores utilizados (com o rateio já feito)
        │        + blocos de tributo + trilha (regra/exceção aplicada)
        │
        ├─ 422 → erro de cálculo, com `codigo` estável — ver seção 6
        ├─ 400 → empresa/filial fora do contexto do usuário
        └─ 401/403 → sessão ou permissão
```

### A regra de ouro do rateio

Frete, seguro, outras despesas e desconto são enviados **do documento inteiro**, não por item. O
backend rateia proporcionalmente ao valor do produto e devolve, em cada item, quanto coube a ele.

**Não ratear no frontend.** O backend joga o resíduo de centavos no item de maior valor justamente para
`Σ itens == total` fechar exatamente. Rateio duplicado produz diferença de centavo, e é o que faz a
NF-e ser rejeitada. Se a tela precisar mostrar o rateio, use o que voltou em `valoresUtilizados`.

### `valorProduto` é informado, não calculado

Mesmo que a tela tenha `quantidade` e `valorUnitario`, envie `valorProduto` como campo próprio. A NF-e
tolera divergência de centavos por arredondamento na origem, e o backend não recalcula de propósito —
recalcular faria o motor reescrever um número que o documento já fixou.

---

## 4. Endpoints, payloads e respostas

### 4.1 `POST /api/fiscal/tributacao/simular`

**Request** — cabeçalho:

| Campo | Tipo | Obrig. | Nota |
| --- | --- | :---: | --- |
| `empresaId` | `string` (guid) | ✔ | |
| `filialId` | `string \| null` | | |
| `tipoOperacao` | `number` (enum `TipoCfop`) | ✔ | Entrada / Saída |
| `regimeEmpresa` | `number` (enum) | ✔ | SimplesNacional / LucroPresumido / LucroReal |
| `crtEmitente` | `number \| null` | | |
| `ufOrigem` | `string(2)` | ✔ | |
| `ufDestino` | `string(2)` | ✔ | aceita `"EX"` (exportação) |
| `codigoMunicipioOrigem` | `string \| null` | | exigido quando há ISS |
| `codigoMunicipioDestino` | `string \| null` | | idem |
| `indicadorContribuinteDestinatario` | `number` (enum) | ✔ | Contribuinte / Isento / NaoContribuinte |
| `consumidorFinal` | `boolean` | ✔ | com o anterior, decide o DIFAL |
| `dataOperacao` | `string` (ISO date) | ✔ | **resolve toda vigência** |
| `destinatarioContribuinteIpi` | `boolean` | | decide se o IPI entra na **base do ICMS** |
| `emitenteContribuinteIpi` | `boolean` | ✔ | decide se **há IPI**. Obrigatório de propósito |
| `finalidade` | `number` | | Normal por default |
| `naturezaTomadorServico` | `number` | | decide as retenções |
| `valorFreteTotal` / `valorSeguroTotal` / `valorOutrasDespesasTotal` / `valorDescontoTotal` | `number` | | **do documento** |
| `itens` | `array` | ✔ | ao menos um |

**Request** — cada item:

| Campo | Tipo | Obrig. | Nota |
| --- | --- | :---: | --- |
| `identificadorItem` | `string \| null` | | eco na resposta — **use para religar resultado ↔ linha da grade** |
| `origemMercadoria` | `string(1)` | ✔ | Tabela A, 0–8 |
| `tipoItem` | `number` (enum `TipoItemSped`) | ✔ | **decide mercadoria × serviço** |
| `ncmId` / `cfopId` | `string \| null` (guid) | | entram na resolução da regra |
| `ncmCodigo` / `cestCodigo` / `cfopCodigo` | `string \| null` | | |
| `quantidade` | `number` | ✔ | **não pode ser zero** |
| `valorUnitario` | `number` | ✔ | |
| `valorProduto` | `number` | ✔ | informado, não derivado |

**Response 200:**

```jsonc
{
  "itens": [
    {
      "indice": 0,                      // posição 0-based na entrada
      "identificadorItem": "1",         // eco
      "valoresUtilizados": {
        "quantidade": 2, "valorUnitario": 500, "valorProduto": 1000,
        "valorFreteRateado": 3.34,      // Σ dos itens == valorFreteTotal, exato
        "valorSeguroRateado": 0,
        "valorOutrasDespesasRateado": 0,
        "valorDescontoRateado": 0,
        "baseBruta": 1003.34
      },
      "resultado": {
        "icms":  { /* base, alíquota, valor, percentualFcp, ... */ },
        "icmsSt": null,                 // ATENÇÃO: null ≠ zero
        "difal": null,
        "ipi": null,
        "pis": { /* ... */ },
        "cofins": { /* ... */ },
        "iss": null,
        "retencoes": null,
        "regraAplicadaId": "…",         // trilha
        "excecaoAplicadaId": null
      }
    }
  ]
}
```

### 4.2 Cadastro de regras — `/api/fiscal/regras`

| Verbo | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/api/fiscal/regras` | `FISCAL_REGRAS_CONSULTAR` |
| `GET` | `/api/fiscal/regras/{id}` | `FISCAL_REGRAS_CONSULTAR` |
| `POST` | `/api/fiscal/regras` | `FISCAL_REGRAS_GERENCIAR` |
| `PUT` | `/api/fiscal/regras/{id}` | `FISCAL_REGRAS_GERENCIAR` |
| `POST` | `/api/fiscal/regras/{id}/inativar` | `FISCAL_REGRAS_GERENCIAR` |

**Chave de resolução** (cabeçalho da regra): `empresaId`, `filialId?`, `descricao`, `tipoOperacao`,
`ufOrigem?`, `ufDestino?`, `regimeEmpresa?`, `indicadorContribuinte?`, `consumidorFinal?`, `ncmId?`,
`grupoProdutoId?`, `cfopId?`, `prioridade`, `vigenciaInicio`, `vigenciaFim?`.

**`null` = curinga** ("vale para qualquer valor"). Isso precisa ficar explícito na UI — um campo vazio
não é "não preenchido", é "qualquer". Sugestão: rótulo "(qualquer)" no placeholder do select.

**Blocos opcionais:** `icms`, `ipi`, `pisCofins`, `iss`, `retencao`.

> **Semântica destrutiva do `PUT`, cuidado:** bloco **ausente no payload = removido**. O `PUT` é
> substituição total. Se a tela montar o payload incrementalmente (só o que mudou), **apaga os blocos
> que não enviou**. Sempre reenvie o objeto completo.

**Campos de FCP são anuláveis** (`percentualFcp`, `percentualFcpSt`) e isso é semântico: `null` = "não
informado, usa o percentual geral da UF"; `0` = "zero deliberado, FCP não devido para este produto".
A UI **não pode** enviar `0` para dizer "não informado" — o campo deve permitir ficar vazio.

### 4.3 Exceções — `/api/fiscal/excecoes` e `/api/fiscal/excecoes-ncm`

Mesmo formato de CRUD e mesmas permissões. Campos: `uf` (obrigatória), `ncmId` (obrigatório só na
variante `-ncm`), `codigoBeneficio`, vigência, e os blocos `icms` e `pisCofins`.

**Uma exceção precisa de ao menos um bloco** — sem isso o backend rejeita (cadastro fantasma).

**Cobrem só ICMS próprio e PIS/COFINS.** Não há como sobrepor ICMS-ST, DIFAL, IPI, ISS ou retenções por
exceção — isso se faz com uma regra mais específica usando `prioridade`. Vale um aviso na tela.

---

## 5. A regra de leitura que não pode ser errada

**Bloco `null` significa "não calculado", nunca "não devido".**

- Item de **mercadoria**: `icms` preenchido; `iss` e `retencoes` nulos.
- Item de **serviço**: `iss` preenchido; `icms`/`icmsSt`/`difal`/`ipi` nulos.
- `icmsSt` nulo = a situação tributária **não comporta** ST; não é "ST zero".
- `ipi` nulo = o emitente não é contribuinte do IPI.
- `difal` nulo = fora da hipótese de consumidor final não contribuinte interestadual.

**Nunca renderize `null` como `0,00`.** Omita a linha do tributo, ou marque como "não aplicável".
Confundir os dois é o defeito mais caro deste domínio — o backend foi construído inteiro em torno de
não fazer isso, e a tela pode desfazer a garantia numa linha de JSX.

**Valor zero com bloco preenchido é diferente:** significa isenção, alíquota zero ou retenção
dispensada — e aí o zero é a informação. Nas retenções isso é explícito: cada uma carrega
`NaoAplicavel` / `Dispensado` / `Retido`. Renderize o estado, não só o número.

### A trilha, e por que expor

`regraAplicadaId` e `excecaoAplicadaId` dizem o que produziu o resultado; cada bloco traz base,
alíquota e os fatores usados (no ST, qual MVA e se foi a ajustada). Isso existe para o cálculo ser
**explicável sem refazê-lo** — é o que a auditoria fiscal exige e o que faz o time confiar no motor.
Sugestão: painel recolhível "Como este imposto foi calculado", com link para a regra aplicada.

---

## 6. Tratamento de erros

### 422 — cálculo não pôde ser feito

Corpo: `{ "codigo": "...", "message": "..." }`.

**Trate pelo `codigo`, nunca pelo texto.** A mensagem é para humano e pode mudar; o código é estável.

| `codigo` | Causa | Mensagem sugerida na tela | Ação |
| --- | --- | --- | --- |
| `FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL` | Não há regra para essa combinação | "Não há regra fiscal cadastrada para esta operação." | Link para cadastrar regra |
| `FISCAL_TRIBUTACAO_REGRA_FORA_DE_VIGENCIA` | Existe regra, não para essa data | "A regra encontrada não está vigente na data da operação." | Destacar o campo data |
| `FISCAL_TRIBUTACAO_REGRA_AMBIGUA` | Duas regras igualmente específicas | "Há regras conflitantes para esta operação." | Erro de cadastro; a mensagem nomeia quais |
| `FISCAL_TRIBUTACAO_FCP_NAO_DEFINIDO_PARA_UF` | Sem FCP para a UF/data | "Tabela de FCP não carregada para esta UF." | Carga pendente — não é erro do usuário |
| `FISCAL_TRIBUTACAO_ALIQUOTA_INTERESTADUAL_NAO_ENCONTRADA` | Par de UFs sem alíquota | "Alíquota interestadual não cadastrada para este trajeto." | Carga pendente |
| `FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO` | Teto do INSS sem carga | "Teto do INSS não carregado para esta competência." | Carga pendente |
| `FISCAL_TRIBUTACAO_ITEM_INVALIDO` | Quantidade zero, desconto > base | "Item inconsistente." | Apontar o item; é erro de preenchimento |
| `FISCAL_TRIBUTACAO_REGRA_INCOMPLETA` | Regra existe mas não parametriza o tributo | "A regra aplicável não parametriza este tributo." | Link para editar a regra |

**Nenhum desses devolve cálculo parcial.** O motor não calcula "zero" quando falta parametrização —
tributo zerado por regra ausente é o defeito que só aparece na fiscalização. **Mostre o erro, nunca um
total incompleto.** Se a tela tiver um totalizador, ele deve sumir ou ficar em estado de erro, não
mostrar a soma dos itens que deram certo.

Três dos códigos acima (`FCP`, `ALIQUOTA_INTERESTADUAL`, `TETO_INSS`) são **carga de tabela pendente**,
não erro do usuário. Vale um tratamento visual distinto — mensagem de sistema, não de validação.

### Outros status

| Status | Causa | Tratamento |
| --- | --- | --- |
| `400` | Empresa/filial fora do contexto do usuário | Usar `mapApiError` como no resto do app |
| `401` | Sessão expirada | Fluxo de auth existente |
| `403` | Sem `FISCAL_REGRAS_CONSULTAR` | Esconder a rota via `hasPermission` **e** tratar a resposta |

Reaproveitar `lib/http/apiError.ts` (`mapApiError`) e `lib/http/requestUtils.ts`
(`cleanQueryParams`, `sanitizePayload`), como faz `features/fiscal/api/fiscalApi.ts`.

---

## 7. Estrutura de arquivos proposta

Segue exatamente o padrão de `features/fiscal/`:

```
features/tributacao/
├── api/tributacaoApi.ts          # simular, CRUD de regras e exceções
├── schemas/tributacaoSchemas.ts  # Zod: request de simulação, regra, exceção
├── types/tributacao.types.ts     # espelho TS do contrato (ver nota abaixo)
├── hooks/useTributacao.ts        # React Query: useSimularTributacao (mutation),
│                                 # useRegrasFiscais / useRegraFiscal / mutations,
│                                 # useExcecoesFiscais / useExcecoesFiscaisNcm
├── components/
│   ├── SimuladorTributacaoForm.tsx
│   ├── ItensTributaveisGrid.tsx
│   ├── ResultadoTributacaoPanel.tsx    # blocos por tributo, com null ≠ zero
│   ├── TrilhaCalculoPanel.tsx          # regra/exceção aplicada
│   ├── RegraFiscalForm.tsx             # cabeçalho + 5 blocos opcionais
│   └── ExcecaoFiscalForm.tsx
└── tests/

app/(main)/fiscal/
├── simulador/page.tsx
├── regras/page.tsx  ·  regras/[id]/page.tsx
└── excecoes/page.tsx  ·  excecoes-ncm/page.tsx
```

**Por que `features/tributacao/` e não dentro de `features/fiscal/`:** o `features/fiscal/` já
concentra o documento fiscal e o SEFAZ, e vai crescer bastante com o Módulo 06. Tributação é um domínio
próprio, consumido também por faturamento, entrada e PDV.

### Nota sobre os tipos

Os blocos de resultado (`ResultadoIcms`, `ResultadoIpi`, …) são **tipos de domínio do backend expostos
diretamente** no response — decisão consciente lá, para não duplicar dez records. A consequência para
cá: **mudança nesses tipos é breaking change de API**, e o backend trata como tal. Ao espelhá-los em
`tributacao.types.ts`, marque no comentário que a fonte é o backend, para não divergirem em silêncio.

**Enums vêm como número**, não string — não há `JsonStringEnumConverter` configurado. Mapeie
explicitamente e **não dependa da ordem** dos valores.

---

## 8. Sequenciamento sugerido

```text
1. types + schemas + api + hooks          (fundação, sem UI — testável isolado)
2. Simulador                              (valor imediato: valida o motor contra o legado)
3. Cadastro de regras                     (destrava o simulador sair do 422 sem regra)
4. Exceções e benefícios
```

Vale considerar inverter 2 e 3 se não houver nenhuma regra cadastrada no ambiente — sem regra, o
simulador só devolve `OPERACAO_SEM_REGRA_FISCAL`. Um seed de regra pelo backend resolveria, e permite
manter o simulador primeiro.

## 9. O que o time precisa saber antes de começar

- **Três cargas de tabela estão pendentes no backend** (alíquotas interestaduais completas, FCP por UF,
  teto do INSS 2025/2026). Até elas entrarem, cenários legítimos vão responder 422 com os códigos de
  carga. **Não é bug do frontend** — e é exatamente por isso que os três códigos merecem tratamento
  visual distinto.
- **O motor ainda não foi conferido contra notas reais do legado.** Está provado por matriz sintética.
  O simulador é justamente a ferramenta que vai permitir essa conferência.
- **Emissão de documento fiscal não existe ainda** — é o Módulo 06 do backend. Por enquanto o motor
  calcula, mas ninguém emite com ele.
