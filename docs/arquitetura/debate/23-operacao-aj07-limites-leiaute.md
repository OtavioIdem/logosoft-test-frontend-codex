# Rodada 23 — Operação: AJ-07 limites do leiaute

## Fluxo do operador

1. O responsável cadastra uma unidade, produto, pessoa ou estabelecimento e informa os dados fiscais que a nota consumirá.
2. Antes de gravar, a tela deve indicar o campo e o formato inválido; não deve deixar o operador descobrir a regra em um `400` posterior.
3. Na natureza de operação, o CFOP selecionado é enviado por código e precisa ter formato válido antes de compor o mapeamento.
4. A série continua aceitando de 0 a 999; esse bloqueio já ocorre no frontend e não precisa ser refeito.

O fluxo quebra hoje em NCM/CEST, sigla da unidade, CFOP e IE/IM: os schemas aceitam texto que o domínio recusa (`23-inventario-aj07-limites-leiaute.md`, tabela Campos). Isso afeta a emissão fiscal posteriormente; não altera cálculo de imposto, estoque ou financeiro no cliente.

## Posição

- A primeira fatia deve validar somente formato e normalização sem perda que o backend já publica: retirar apenas pontuação permitida para avaliar NCM/CEST/CFOP/IE, manter o valor para o backend normalizar e nunca truncar.
- IE `ISENTO` permanece possível onde o contrato o permite; a condição "Pessoa contribuinte" pertence ao backend e não entra no cliente.
- IM é texto de 1 a 15 caracteres sem espaço nas extremidades.
- GTIN/código de barras, CNPJ alfanumérico e qualquer regra de elegibilidade de nota ficam fora.

## O que abro mão

Não haverá correção em massa de cadastros antigos nem máscaras novas. Dado legado acima do limite continuará sendo responsabilidade da leitura tolerante do backend; o próximo salvamento é que será bloqueado pelo contrato.

## Perguntas externas

1. O backend pretende devolver códigos de validação por campo para IE/IM? Isso decide se a mensagem local pode ser unificada com a resposta.
2. Há cadastros legados que o operador precisa alterar sem mexer no bloco fiscal? Isso decide se a tela precisará preservar ou bloquear valor já fora do limite.

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "projeto",
  "assunto": "aj07-limites-leiaute",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/23-operacao-aj07-limites-leiaute.md",
  "decisoesPropostas": [{ "id": "D108", "titulo": "AJ-07 valida formato no cadastro sem reproduzir regra fiscal", "reversivel": true, "gatilho": "contrato publicar código ou campo adicional" }],
  "discordancias": [],
  "pendencias": [{ "tipo": "backend", "pergunta": "Como editar registro legado já fora do limite sem apagar dado?", "decide": "comportamento de edição" }],
  "riscos": ["Validação local mais estrita do que a normalização permitida pelo backend recusaria dado válido."]
}
```
