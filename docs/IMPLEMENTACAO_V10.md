# logosoft frontend v10.0.2

## Objetivo

Fechar a etapa v9.x consolidando a aplicação como v10, com dashboard real, auditoria real e revisão transversal para não expor referência técnica cru ao usuário final quando houver representação por nome, código ou descrição.

## Implementações

- Versão do pacote atualizada para `10.0.2`.
- Rodapé atualizado automaticamente para `© logosoft v10.0.2`.
- Dashboard substituído por painel real baseado em chamadas à API:
  - `/api/health`
  - `/api/vendas/pedidos`
  - `/api/financeiro/contas-receber`
  - `/api/financeiro/contas-pagar`
  - `/api/estoque/saldos`
  - `/api/compras/pedidos`
  - `/api/auditoria/eventos`
- Dashboard tolerante a falhas parciais: se um endpoint estiver indisponível ou sem permissão, o painel continua renderizando os demais cards e mostra aviso via `Message`.
- Auditoria substituída por tela específica usando `GET /api/auditoria/eventos`.
- Filtros locais de auditoria por termo, módulo e entidade.
- Ações de auditoria exibidas por descrição amigável, sem exigir que o usuário interprete enum numérico.
- Formatter transversal `formatEntityReference` para evitar referência técnica cru na interface genérica.
- Teste unitário para garantir que referência técnica técnico seja exibido como referência selecionada.

## Regra UX estabelecida

Todo campo que envia referência técnica no payload deve, sempre que houver endpoint/lista disponível, ser apresentado ao usuário por nome, código, número ou descrição. O payload permanece enviando somente o referência técnica exigido pelo backend.

## Pontos ainda dependentes de contrato

- Segurança avançada: grupos de acesso e permissões continuam aguardando endpoints oficiais.
- Dashboard pode ficar parcialmente vazio se o usuário não tiver permissões ou se endpoints retornarem `403`.
