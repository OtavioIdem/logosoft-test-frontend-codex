# Skill — Frontend de ERP real

## Papel do frontend

O frontend deve ser camada de operação e experiência do usuário. Ele não é a fonte final da regra de negócio.

O frontend pode:

- validar campo para melhorar UX;
- exibir ação conforme permissão recebida;
- apresentar bloqueios vindos do backend;
- organizar workflow visual;
- tratar loading, erro, vazio e sucesso;
- mascarar dados sensíveis;
- evitar ação acidental;
- consumir contratos tipados.

O frontend não pode:

- ser a única barreira de segurança;
- decidir regra fiscal, financeira ou de estoque sozinho;
- substituir backend por mock quando API falhar;
- permitir GUID manual para vínculo de entidade;
- expor XML fiscal completo, token, senha, certificado ou segredo;
- esconder erro real do backend;
- declarar produção com validação apenas visual.

## Estados obrigatórios por tela operacional

Toda tela operacional deve prever:

```text
loading
vazio
erro recuperável
erro bloqueante
sucesso
permissão negada
ação indisponível com motivo
```

## Referências entre entidades

Campos como `clienteId`, `produtoId`, `filialId`, `fornecedorId`, `pedidoVendaId`, `formaPagamentoId` e similares devem usar busca/seleção legível.

Fluxo esperado:

```text
API de busca/listagem
↓
Select/dropdown/autocomplete server-side
↓
Usuário escolhe entidade legível
↓
Frontend envia ID internamente
```

## Exceção conhecida

`LoginForm.tsx::empresaId` é exceção legado-controlada, exibida como código autorizado da empresa no contrato de login.
