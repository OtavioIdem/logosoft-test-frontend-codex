# Implementação v10.0.4 — UX de referências técnicas

## Objetivo

Revisar campos que enviam GUID no payload para que o usuário selecione ou visualize nomes, códigos e descrições. O identificador técnico continua sendo enviado ao backend porque o contrato da API exige GUIDs, mas a interface não deve exigir que o usuário conheça esses valores.

## Alterações

- Criado `SetorSelect` pesquisável.
- Criados hooks de opções para todas as filiais e todos os setores.
- Administração passou a exibir Empresa, Filial e Setor por rótulo amigável nas listagens.
- Formulário de Cargo passou a selecionar Setor por dropdown pesquisável.
- Labels `Empresa ID`, `Filial ID` e `Setor ID` foram substituídos por `Empresa`, `Filial` e `Setor`.
- Mensagens de validação que citavam GUID foram substituídas por mensagens voltadas ao usuário final.
- Mantido envio técnico de `empresaId`, `filialId` e `setorId` no payload conforme contrato do backend.

## Regra mantida para as próximas versões

Todo campo que envia GUID deve ser revisado para:

1. Exibir nome, código, número ou descrição ao usuário.
2. Usar dropdown/autocomplete pesquisável quando houver endpoint de apoio.
3. Enviar somente o GUID no payload.
4. Evitar pedir ou mostrar identificador técnico cru na interface.

## Validação manual sugerida

1. Abrir Administração > Cargos.
2. Selecionar empresa.
3. Selecionar filial, se aplicável.
4. Selecionar setor pelo nome.
5. Salvar cargo e verificar no payload que somente `setorId` foi enviado.
6. Conferir listagens de Administração e validar que Empresa/Filial/Setor aparecem como nomes/códigos, não como identificadores técnicos.
