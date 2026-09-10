import { PermissionCode } from '@/types/erp';
import { LoginRequest, LoginResponse } from '@/features/auth/types/auth.types';
import type { RefreshSessionResponse } from '@/features/auth/api/authResponseMapper';

const MOCK_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

const mockPermissions: PermissionCode[] = [
    'AUDITORIA_CONSULTAR',
    'AUDITORIA_OPERACIONAL_CONSULTAR',
    'ATIVIDADES_CONSULTAR',
    'ATIVIDADES_CRIAR',
    'ATIVIDADES_ATUALIZAR',
    'ATIVIDADES_CANCELAR',
    'ATIVIDADES_COMENTAR',
    'ATIVIDADES_ATRIBUIR',
    'ADMINISTRACAO_CONSULTAR',
    'ADMINISTRACAO_GERENCIAR',
    'SEGURANCA_USUARIOS_CONSULTAR',
    'SEGURANCA_USUARIOS_GERENCIAR',
    'SEGURANCA_USUARIOS_RESETAR_SENHA',
    'SEGURANCA_USUARIOS_INATIVAR',
    'SEGURANCA_PERMISSOES_GERENCIAR',
    'SEGURANCA_GRUPOS_ACESSO_CONSULTAR',
    'SEGURANCA_GRUPOS_ACESSO_GERENCIAR',
    'SEGURANCA_SESSOES_GERENCIAR',
    'PORTARIA_CONSULTAR',
    'PORTARIA_PREAUTORIZAR',
    'PORTARIA_OPERAR',
    'PESSOAS_CONSULTAR',
    'PESSOAS_GERENCIAR',
    'CLIENTES_CONSULTAR',
    'CLIENTES_GERENCIAR',
    'FORNECEDORES_CONSULTAR',
    'FORNECEDORES_GERENCIAR',
    'PRODUTOS_CONSULTAR',
    'PRODUTOS_GERENCIAR',
    'PRODUTOS_INATIVAR',
    'PRODUTOS_DADOS_FISCAIS_GERENCIAR',
    'CATEGORIAS_PRODUTO_GERENCIAR',
    'UNIDADES_MEDIDA_GERENCIAR',
    'MARCAS_GERENCIAR',
    'ESTOQUE_CONSULTAR',
    'ESTOQUE_MOVIMENTAR',
    'ESTOQUE_RESERVAR',
    'ESTOQUE_INVENTARIO_GERENCIAR',
    'LOCAIS_ESTOQUE_GERENCIAR',
    'VENDAS_CONSULTAR',
    'VENDAS_GERENCIAR',
    'VENDAS_APROVAR',
    'VENDAS_CANCELAR',
    'VENDAS_FATURAR',
    'TABELAS_PRECO_CONSULTAR',
    'TABELAS_PRECO_GERENCIAR',
    'TABELAS_PRECO_ATIVAR',
    'TABELAS_PRECO_INATIVAR',
    'TABELAS_PRECO_ITENS_GERENCIAR',
    'FINANCEIRO_CONSULTAR',
    'FINANCEIRO_GERENCIAR',
    'FINANCEIRO_RECEBER',
    'FINANCEIRO_PAGAR',
    'FINANCEIRO_ESTORNAR',
    'FINANCEIRO_CANCELAR',
    'FORMAS_PAGAMENTO_GERENCIAR',
    'CONDICOES_PAGAMENTO_GERENCIAR',
    'COMPRAS_CONSULTAR',
    'COMPRAS_GERENCIAR',
    'COMPRAS_APROVAR',
    'COMPRAS_CANCELAR',
    'COMPRAS_RECEBER',
    'FISCAL_REPROCESSAR'
];

export const mockAuthClient = {
    async login(payload: LoginRequest): Promise<LoginResponse> {
        await new Promise((resolve) => setTimeout(resolve, 350));

        if (!payload.email || !payload.password) {
            throw new Error('Informe e-mail e senha.');
        }

        return {
            accessToken: 'mock-access-token',
            accessTokenExpiraEm: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            refreshToken: 'mock-refresh-token',
            refreshTokenExpiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            user: {
                id: 'mock-user-id',
                nome: 'Administrador logosoft',
                email: payload.email,
                // O login não envia mais empresa: quem resolve o vínculo é o backend. O mock devolve uma
                // empresa fixa para espelhar isso, em vez de ecoar o que a tela mandou.
                empresaId: MOCK_EMPRESA_ID,
                filialId: null,
                permissoes: mockPermissions
            }
        };
    },

    async refresh(): Promise<RefreshSessionResponse> {
        return {
            accessToken: 'mock-access-token-renovado',
            accessTokenExpiraEm: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            refreshToken: 'mock-refresh-token-renovado',
            refreshTokenExpiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            permissoes: mockPermissions
        };
    },

    async logout() {
        return undefined;
    }
};
