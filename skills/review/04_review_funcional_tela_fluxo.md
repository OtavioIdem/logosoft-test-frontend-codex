# Skill — Review funcional de tela e fluxo

## Objetivo

Validar que a implementação funciona como operação real de ERP, não apenas como tela renderizada.

## Checklist por tela

```text
A tela consome API real ou contrato formal?
Existe loading?
Existe estado vazio?
Existe tratamento de erro?
Existe sucesso claro?
Existe bloqueio por permissão?
A ação indisponível mostra motivo?
Campos de entidade usam select/busca em vez de GUID manual?
Dados sensíveis são mascarados?
A tela não usa mock como fallback?
```

## Checklist por fluxo operacional

```text
O fluxo respeita workflow vindo do backend?
A ação crítica exige confirmação ou motivo?
O payload enviado é compatível com contrato?
O erro do backend não é escondido?
Existe correlationId quando aplicável?
Existe teste cobrindo caminho feliz e bloqueio?
```

## ERP real

Para módulos críticos, verificar impacto em:

```text
segurança
permissões
auditoria
fiscal
financeiro
estoque
LGPD
integrações
```

Se algum impacto existir e não houver teste/documentação, bloquear ou classificar como pendência conforme gravidade.
