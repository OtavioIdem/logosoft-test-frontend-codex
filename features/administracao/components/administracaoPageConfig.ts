import { ZodType } from 'zod';
import {
    atualizarCargoSchema,
    atualizarCentroCustoSchema,
    atualizarEmpresaSchema,
    atualizarFilialSchema,
    atualizarSetorSchema,
    criarCargoSchema,
    criarCentroCustoSchema,
    criarEmpresaSchema,
    criarFilialSchema,
    criarSetorSchema
} from '@/features/administracao/schemas/administracaoSchemas';
import { AdministracaoResourceKey } from '@/features/administracao/hooks/useAdministracaoResources';

export type AdministracaoFieldKind = 'text' | 'textarea' | 'number' | 'guid' | 'documento';
export type AdministracaoFieldConfig = { name: string; label: string; kind: AdministracaoFieldKind; required?: boolean; helperText?: string; createOnly?: boolean; updateOnly?: boolean; disabledOnUpdate?: boolean; col?: string };
export type AdministracaoColumnConfig = { field: string; header: string; type?: 'text' | 'number' | 'status' | 'datetime' | 'document' };
export type AdministracaoPageConfig = {
    resourceKey: AdministracaoResourceKey;
    title: string;
    description: string;
    listDescription: string;
    createTitle: string;
    updateTitle: string;
    createSchema: ZodType<unknown>;
    updateSchema: ZodType<unknown>;
    fields: AdministracaoFieldConfig[];
    columns: AdministracaoColumnConfig[];
    showEmpresaFilter?: boolean;
    showFilialFilter?: boolean;
};

const auditoriaColumns: AdministracaoColumnConfig[] = [
    { field: 'status', header: 'Status', type: 'status' },
    { field: 'createdAt', header: 'Criado em', type: 'datetime' }
];

export const administracaoPageConfigs: Record<AdministracaoResourceKey, AdministracaoPageConfig> = {
    empresas: {
        resourceKey: 'empresas',
        title: 'Empresas',
        description: 'Cadastro de empresas, base para multiempresa e permissões corporativas.',
        listDescription: 'Use esta rotina para cadastrar, editar e inativar empresas. O documento só é enviado na criação conforme contrato v9.8.',
        createTitle: 'Nova empresa',
        updateTitle: 'Editar empresa',
        createSchema: criarEmpresaSchema,
        updateSchema: atualizarEmpresaSchema,
        columns: [
            { field: 'razaoSocial', header: 'Razão social' },
            { field: 'nomeFantasia', header: 'Nome fantasia' },
            { field: 'documento', header: 'Documento', type: 'document' },
            { field: 'inscricaoEstadual', header: 'IE' },
            { field: 'inscricaoMunicipal', header: 'IM' },
            ...auditoriaColumns
        ],
        fields: [
            { name: 'razaoSocial', label: 'Razão social', kind: 'text', required: true, col: 'col-12 md:col-6' },
            { name: 'nomeFantasia', label: 'Nome fantasia', kind: 'text', col: 'col-12 md:col-6' },
            { name: 'documento', label: 'CNPJ/Documento', kind: 'documento', required: true, createOnly: true, helperText: 'Enviado apenas na criação. O backend valida CNPJ numérico ou alfanumérico.', col: 'col-12 md:col-4' },
            { name: 'inscricaoEstadual', label: 'Inscrição estadual', kind: 'text', col: 'col-12 md:col-4' },
            { name: 'inscricaoMunicipal', label: 'Inscrição municipal', kind: 'text', col: 'col-12 md:col-4' }
        ]
    },
    filiais: {
        resourceKey: 'filiais',
        title: 'Filiais',
        description: 'Cadastro de filiais por empresa, usado pelos módulos operacionais.',
        listDescription: 'Filiais são consultadas por empresa. Na edição, documento e empresa não são enviados.',
        createTitle: 'Nova filial',
        updateTitle: 'Editar filial',
        createSchema: criarFilialSchema,
        updateSchema: atualizarFilialSchema,
        showEmpresaFilter: true,
        columns: [
            { field: 'empresaId', header: 'Empresa' },
            { field: 'nome', header: 'Nome' },
            { field: 'documento', header: 'Documento', type: 'document' },
            { field: 'inscricaoEstadual', header: 'IE' },
            { field: 'inscricaoMunicipal', header: 'IM' },
            ...auditoriaColumns
        ],
        fields: [
            { name: 'empresaId', label: 'Empresa', kind: 'guid', required: true, createOnly: true, helperText: 'Selecione a empresa pela razão social, nome fantasia ou documento.', col: 'col-12' },
            { name: 'nome', label: 'Nome', kind: 'text', required: true, col: 'col-12 md:col-6' },
            { name: 'documento', label: 'CNPJ/Documento', kind: 'documento', required: true, createOnly: true, col: 'col-12 md:col-6' },
            { name: 'inscricaoEstadual', label: 'Inscrição estadual', kind: 'text', col: 'col-12 md:col-6' },
            { name: 'inscricaoMunicipal', label: 'Inscrição municipal', kind: 'text', col: 'col-12 md:col-6' }
        ]
    },
    setores: {
        resourceKey: 'setores',
        title: 'Setores',
        description: 'Cadastro de setores por empresa e, opcionalmente, por filial.',
        listDescription: 'Setores podem ser globais da empresa ou específicos de uma filial.',
        createTitle: 'Novo setor',
        updateTitle: 'Editar setor',
        createSchema: criarSetorSchema,
        updateSchema: atualizarSetorSchema,
        showEmpresaFilter: true,
        showFilialFilter: true,
        columns: [
            { field: 'empresaId', header: 'Empresa' },
            { field: 'filialId', header: 'Filial' },
            { field: 'nome', header: 'Nome' },
            { field: 'descricao', header: 'Descrição' },
            ...auditoriaColumns
        ],
        fields: [
            { name: 'empresaId', label: 'Empresa', kind: 'guid', required: true, createOnly: true, col: 'col-12 md:col-6' },
            { name: 'filialId', label: 'Filial', kind: 'guid', createOnly: true, helperText: 'Opcional; deixe vazio para setor global da empresa.', col: 'col-12 md:col-6' },
            { name: 'nome', label: 'Nome', kind: 'text', required: true, col: 'col-12 md:col-6' },
            { name: 'descricao', label: 'Descrição', kind: 'textarea', col: 'col-12' }
        ]
    },
    cargos: {
        resourceKey: 'cargos',
        title: 'Cargos',
        description: 'Cadastro de cargos e nível hierárquico para regras futuras de segurança e organograma.',
        listDescription: 'Cargos podem estar vinculados a setor, empresa e filial. O nível hierárquico deve ser numérico.',
        createTitle: 'Novo cargo',
        updateTitle: 'Editar cargo',
        createSchema: criarCargoSchema,
        updateSchema: atualizarCargoSchema,
        showEmpresaFilter: true,
        showFilialFilter: true,
        columns: [
            { field: 'empresaId', header: 'Empresa' },
            { field: 'filialId', header: 'Filial' },
            { field: 'setorId', header: 'Setor' },
            { field: 'nome', header: 'Nome' },
            { field: 'nivelHierarquico', header: 'Nível', type: 'number' },
            { field: 'descricao', header: 'Descrição' },
            ...auditoriaColumns
        ],
        fields: [
            { name: 'empresaId', label: 'Empresa', kind: 'guid', required: true, createOnly: true, col: 'col-12 md:col-6' },
            { name: 'filialId', label: 'Filial', kind: 'guid', createOnly: true, col: 'col-12 md:col-6' },
            { name: 'setorId', label: 'Setor', kind: 'guid', helperText: 'Opcional; selecione um setor ou deixe em branco.', col: 'col-12' },
            { name: 'nome', label: 'Nome', kind: 'text', required: true, col: 'col-12 md:col-8' },
            { name: 'nivelHierarquico', label: 'Nível hierárquico', kind: 'number', required: true, col: 'col-12 md:col-4' },
            { name: 'descricao', label: 'Descrição', kind: 'textarea', col: 'col-12' }
        ]
    },
    'centros-custo': {
        resourceKey: 'centros-custo',
        title: 'Centros de custo',
        description: 'Cadastro de centros de custo usados por financeiro, compras, vendas e controladoria.',
        listDescription: 'Centros de custo exigem código na criação e não sofrem exclusão física; use inativação com motivo.',
        createTitle: 'Novo centro de custo',
        updateTitle: 'Editar centro de custo',
        createSchema: criarCentroCustoSchema,
        updateSchema: atualizarCentroCustoSchema,
        showEmpresaFilter: true,
        showFilialFilter: true,
        columns: [
            { field: 'empresaId', header: 'Empresa' },
            { field: 'filialId', header: 'Filial' },
            { field: 'codigo', header: 'Código' },
            { field: 'nome', header: 'Nome' },
            { field: 'descricao', header: 'Descrição' },
            ...auditoriaColumns
        ],
        fields: [
            { name: 'empresaId', label: 'Empresa', kind: 'guid', required: true, createOnly: true, col: 'col-12 md:col-6' },
            { name: 'filialId', label: 'Filial', kind: 'guid', createOnly: true, col: 'col-12 md:col-6' },
            { name: 'codigo', label: 'Código', kind: 'text', required: true, createOnly: true, col: 'col-12 md:col-4' },
            { name: 'nome', label: 'Nome', kind: 'text', required: true, col: 'col-12 md:col-8' },
            { name: 'descricao', label: 'Descrição', kind: 'textarea', col: 'col-12' }
        ]
    }
};
