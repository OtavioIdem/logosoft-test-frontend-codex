import { describe, expect, it } from 'vitest';
import { describeTributacaoError, isCargaPendente, TRIBUTACAO_ERROR_CATALOG, tributacaoErrorSeverity } from '@/features/tributacao/components/tributacaoErrors';
import { mapTributacaoApiError } from '@/features/tributacao/api/tributacaoApi';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';

describe('catálogo de erros do motor de tributação', () => {
    it('cobre os onze códigos estáveis do contrato', () => {
        expect(Object.keys(TRIBUTACAO_ERROR_CATALOG).sort()).toEqual(
            [
                'FISCAL_TRIBUTACAO_ALIQUOTA_INTERESTADUAL_NAO_ENCONTRADA',
                'FISCAL_TRIBUTACAO_CONTRIBUINTE_IPI_DIVERGENTE',
                'FISCAL_TRIBUTACAO_EMPRESA_NAO_ENCONTRADA',
                'FISCAL_TRIBUTACAO_FCP_NAO_DEFINIDO_PARA_UF',
                'FISCAL_TRIBUTACAO_ITEM_INVALIDO',
                'FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL',
                'FISCAL_TRIBUTACAO_REGRA_AMBIGUA',
                'FISCAL_TRIBUTACAO_REGRA_FORA_DE_VIGENCIA',
                'FISCAL_TRIBUTACAO_REGRA_INCOMPLETA',
                'FISCAL_TRIBUTACAO_ST_INCOMPATIVEL_COM_DIFAL',
                'FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO'
            ].sort()
        );
    });

    // b74 (D103, AC-2): o mesmo código chega como 422 pelo simulador e como 400 pela nota. O tratamento é pelo código.
    it.each([422, 400])('trata ST incompatível com DIFAL como erro de cadastro da regra, por código (HTTP %i)', (status) => {
        const erro = { code: 'FISCAL_TRIBUTACAO_ST_INCOMPATIVEL_COM_DIFAL', status, message: 'texto livre' };

        expect(describeTributacaoError(erro)?.kind).toBe('cadastro');
        expect(describeTributacaoError(erro)?.acao).toMatch(/Corrija o cadastro da regra fiscal/);
        expect(isCargaPendente(erro)).toBe(false);
        expect(tributacaoErrorSeverity(erro)).toBe('warn');
    });

    // b74 (D103, AC-3): os dois códigos que já faltavam antes da mudança do backend.
    it('trata empresa não encontrada como aviso de contexto, sem ser carga', () => {
        const erro = { code: 'FISCAL_TRIBUTACAO_EMPRESA_NAO_ENCONTRADA', status: 422, message: 'texto livre' };

        expect(describeTributacaoError(erro)?.kind).toBe('contexto');
        expect(tributacaoErrorSeverity(erro)).toBe('warn');
        expect(isCargaPendente(erro)).toBe(false);
    });

    it('trata IPI divergente como erro de preenchimento, sem ser carga', () => {
        const erro = { code: 'FISCAL_TRIBUTACAO_CONTRIBUINTE_IPI_DIVERGENTE', status: 422, message: 'texto livre' };

        expect(describeTributacaoError(erro)?.kind).toBe('preenchimento');
        expect(tributacaoErrorSeverity(erro)).toBe('error');
        expect(isCargaPendente(erro)).toBe(false);
    });

    it('resolve pelo código, não pelo texto da mensagem do backend', () => {
        const info = describeTributacaoError({ code: 'FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL', message: 'texto livre que pode mudar a qualquer momento' });
        expect(info?.titulo).toBe('Sem regra fiscal para esta operação');

        expect(describeTributacaoError({ message: 'Não há regra fiscal cadastrada para esta operação.' })).toBeNull();
    });

    it('separa carga de tabela pendente de erro do usuário', () => {
        expect(isCargaPendente({ code: 'FISCAL_TRIBUTACAO_FCP_NAO_DEFINIDO_PARA_UF', message: '' })).toBe(true);
        expect(isCargaPendente({ code: 'FISCAL_TRIBUTACAO_ALIQUOTA_INTERESTADUAL_NAO_ENCONTRADA', message: '' })).toBe(true);
        expect(isCargaPendente({ code: 'FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO', message: '' })).toBe(true);
        expect(isCargaPendente({ code: 'FISCAL_TRIBUTACAO_ITEM_INVALIDO', message: '' })).toBe(false);
    });

    it('usa severidade de sistema para carga pendente e de validação para preenchimento', () => {
        expect(tributacaoErrorSeverity({ code: 'FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO', message: '' })).toBe('info');
        expect(tributacaoErrorSeverity({ code: 'FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL', message: '' })).toBe('warn');
        expect(tributacaoErrorSeverity({ code: 'FISCAL_TRIBUTACAO_ITEM_INVALIDO', message: '' })).toBe('error');
    });

    it('trata o 400 sem código como escopo organizacional, que é o caso próprio do contrato', () => {
        const erro = { status: 400, message: 'Não foi possível concluir a operação.' };

        expect(describeTributacaoError(erro)?.kind).toBe('contexto');
        expect(describeTributacaoError(erro)?.titulo).toBe('Empresa ou filial fora do seu contexto');
        expect(tributacaoErrorSeverity(erro)).toBe('warn');
    });

    it('não confunde ModelState inválido com escopo organizacional, porque os dois respondem 400', () => {
        expect(describeTributacaoError({ status: 400, message: 'Verifique os campos.', validationErrors: [{ field: 'ufOrigem', message: 'Informe a UF.' }] })).toBeNull();
        expect(describeTributacaoError({ status: 400, message: 'Verifique os campos.', fieldErrors: { ufOrigem: ['Informe a UF.'] } })).toBeNull();
    });

    it('normaliza o campo Codigo do 422, que o controller serializa em PascalCase', () => {
        const mapeado = mapTributacaoApiError({
            isAxiosError: true,
            response: { status: 422, data: { Codigo: 'FISCAL_TRIBUTACAO_REGRA_AMBIGUA', Message: 'Há regras conflitantes.' } }
        });

        expect(mapeado.code).toBe('FISCAL_TRIBUTACAO_REGRA_AMBIGUA');
        expect(describeTributacaoError(mapeado)?.kind).toBe('cadastro');
    });
});

describe('rotas do módulo de tributação', () => {
    it('exige FISCAL_REGRAS_CONSULTAR no simulador', () => {
        expect(findRoutePermissionRule('/fiscal/simulador')?.anyOf).toEqual(['FISCAL_REGRAS_CONSULTAR']);
    });

    it('protege regras e exceções pelas permissões do cadastro fiscal', () => {
        expect(findRoutePermissionRule('/fiscal/regras')?.anyOf).toContain('FISCAL_REGRAS_GERENCIAR');
        expect(findRoutePermissionRule('/fiscal/excecoes')?.description).toBe('Exceções e benefícios fiscais');
        expect(findRoutePermissionRule('/fiscal/excecoes-ncm')?.description).toBe('Exceções fiscais por NCM');
    });
});
