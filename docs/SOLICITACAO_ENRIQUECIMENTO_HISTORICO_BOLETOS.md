# Solicitação de enriquecimento — usuário no histórico de Boletos

## Objetivo

Exibir um identificador legível do usuário que realizou cada transição no
histórico de um boleto, sem expor um GUID técnico ao operador.

## Estado atual confirmado

O endpoint `GET /api/bancos/boletos/{id}/historico` retorna
`BoletoHistoricoResponse` com `usuarioId`, mas sem nome, e-mail ou rótulo
operacional do usuário.

Há uma listagem geral em `GET /api/seguranca/usuarios`, porém ela é protegida
pela permissão de Segurança. Reutilizá-la no fluxo de Boletos exigiria que um
operador com `BANCOS_CONSULTAR` recebesse também permissão de consulta de
usuários, criando acoplamento de autorização que o contrato atual não declara.

## Solicitação ao backend

Enriquecer a resposta do histórico de boleto com um campo opcional e
operacionalmente legível, por exemplo `usuarioNome` (ou `usuario`), derivado de
`usuarioId` no próprio serviço de Boletos.

O campo deve respeitar a autorização já aplicada a `BANCOS_CONSULTAR`; a tela
de Boletos não deve depender da consulta administrativa de usuários.

## Contrato proposto

```ts
{
  id: uuid;
  statusAnterior: StatusBoleto;
  statusNovo: StatusBoleto;
  observacao: string;
  usuarioId?: uuid | null;
  usuarioNome?: string | null;
  data: dateTime;
}
```

`usuarioId` deve ser mantido para rastreabilidade e compatibilidade. Se não
houver usuário associado ou resolvível, `usuarioNome` deve ser `null`.

## Critérios de aceite

- O histórico retorna o nome do usuário quando existir autor da transição.
- Uma consulta de Boletos não exige `SEGURANCA_USUARIOS_CONSULTAR`.
- A ausência de usuário não causa erro no histórico.
- O frontend pode exibir `usuarioNome` com fallback neutro, sem mostrar GUID ao
operador.

## Ação pendente no frontend

Após a publicação e validação do contrato, adicionar a coluna/campo
"Realizado por" ao detalhe de Boletos e cobrir o caso com e sem usuário.
