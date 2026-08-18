import { describe, expect, it } from 'vitest';
import {
    applyOrganizationalContextPolicy,
    OrganizationalContextPolicyError,
    organizationalScopeKey
} from '@/lib/http/organizationalContextPolicy';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

describe('política de contexto organizacional por request', () => {
    it('mantém requests sem metadata intactos e gera chave estável', () => {
        const snapshot = { empresaId, filialId, isMaster: false, revision: 4 } as const;
        const request = { url: '/api/sem-politica', params: { termo: 'x' } };
        expect(applyOrganizationalContextPolicy(request, snapshot)).toBe(request);
        expect(organizationalScopeKey(snapshot)).toBe('user:11111111-1111-1111-1111-111111111111:22222222-2222-2222-2222-222222222222:4');
    });

    it('mantém policy global sem injetar ou validar IDs', () => {
        const request = { params: { empresaId: '33333333-3333-3333-3333-333333333333' }, organizationalContext: { scope: 'global' as const } };
        expect(applyOrganizationalContextPolicy(request, { empresaId, filialId, isMaster: false, revision: 1 })).toBe(request);
    });

    it('mantém escopos global e resource intactos, inclusive para master sem empresa', () => {
        const masterGlobal = { empresaId: null, filialId: null, isMaster: true, revision: 0 } as const;
        const globalRequest = { params: { termo: 'empresas' }, organizationalContext: { scope: 'global' as const } };
        const resourceRequest = { data: { id: 'recurso-global' }, organizationalContext: { scope: 'resource' as const, required: true } };

        expect(applyOrganizationalContextPolicy(globalRequest, masterGlobal)).toBe(globalRequest);
        expect(applyOrganizationalContextPolicy(resourceRequest, masterGlobal)).toBe(resourceRequest);
    });

    it('consulta lookup exige empresa explícita, compara com o snapshot e não injeta filial', () => {
        const snapshot = { empresaId, filialId, isMaster: false, revision: 1 } as const;
        const lookup = applyOrganizationalContextPolicy({ params: { empresaId }, organizationalContext: { scope: 'lookup', required: true, snapshot } }, snapshot);
        expect(lookup.params).toEqual({ empresaId });

        const lookupFromArgument = applyOrganizationalContextPolicy({ params: { empresaId }, organizationalContext: { scope: 'lookup', required: true } }, snapshot);
        expect(lookupFromArgument.params).toEqual({ empresaId });

        const lookupFromSearchParams = applyOrganizationalContextPolicy({ params: new URLSearchParams({ empresaId }), organizationalContext: { scope: 'lookup', required: true } }, snapshot);
        expect(lookupFromSearchParams.params).toEqual(new URLSearchParams({ empresaId }));

        const explicit = '33333333-3333-3333-3333-333333333333';
        expect(() => applyOrganizationalContextPolicy({ params: {}, organizationalContext: { scope: 'lookup', snapshot } }, snapshot)).toThrow(OrganizationalContextPolicyError);
        expect(() => applyOrganizationalContextPolicy({ params: { empresaId: explicit }, organizationalContext: { scope: 'lookup', snapshot } }, snapshot)).toThrow(OrganizationalContextPolicyError);
        expect(() => applyOrganizationalContextPolicy({ params: { empresaId, filialId: explicit }, organizationalContext: { scope: 'lookup', snapshot } }, snapshot)).toThrow(OrganizationalContextPolicyError);
        expect(() => applyOrganizationalContextPolicy({ params: { empresaId: explicit }, organizationalContext: { scope: 'lookup', snapshot: { empresaId: null, filialId: null, isMaster: true, revision: 0 } } })).toThrow(OrganizationalContextPolicyError);
    });

    it('permanece idempotente quando a mesma configuração é reutilizada no retry após refresh', () => {
        const snapshot = { empresaId, filialId, isMaster: false, revision: 3 } as const;
        const first = applyOrganizationalContextPolicy({ params: {}, organizationalContext: { scope: 'query', required: true, snapshot } }, snapshot);
        const retry = applyOrganizationalContextPolicy(first, snapshot);
        expect(retry.params).toEqual({ empresaId, filialId });
        expect(retry.organizationalContext).toEqual(first.organizationalContext);
    });

    it('bloqueia escopo obrigatório sem empresa, inclusive master global', () => {
        expect(() => applyOrganizationalContextPolicy({ organizationalContext: { scope: 'query', required: true, snapshot: { empresaId: null, filialId: null, isMaster: true, revision: 0 } } })).toThrow(OrganizationalContextPolicyError);
    });

    it('injeta body sem sobrescrever, preserva FormData e mantém a exigência de empresa', () => {
        const snapshot = { empresaId, filialId, isMaster: false, revision: 2 } as const;
        const body = applyOrganizationalContextPolicy({ data: { nome: 'Registro', empresaId }, organizationalContext: { scope: 'body', required: true, snapshot } }, snapshot);
        expect(body.data).toEqual({ nome: 'Registro', empresaId, filialId });
        expect(() => applyOrganizationalContextPolicy({ data: { empresaId: '33333333-3333-3333-3333-333333333333' }, organizationalContext: { scope: 'body', required: true, snapshot } })).toThrow(OrganizationalContextPolicyError);
        expect(() => applyOrganizationalContextPolicy({ data: { empresaId, filialId: '33333333-3333-3333-3333-333333333333' }, organizationalContext: { scope: 'body', required: true, snapshot } })).toThrow(OrganizationalContextPolicyError);

        const form = new FormData();
        form.append('arquivo', 'conteudo');
        const multipart = applyOrganizationalContextPolicy({ data: form, organizationalContext: { scope: 'body', required: true, snapshot } }, snapshot);
        expect(multipart.data).toBe(form);

        const masterForm = new FormData();
        expect(() => applyOrganizationalContextPolicy({ data: masterForm, organizationalContext: { scope: 'body', required: true, snapshot: { empresaId: null, filialId: null, isMaster: true, revision: 0 } } })).toThrow(OrganizationalContextPolicyError);

        expect(() => applyOrganizationalContextPolicy(
            { data: form, organizationalContext: { scope: 'body', required: true, snapshot: { empresaId: null, filialId: null, isMaster: true, revision: 0 } } }
        )).toThrow(OrganizationalContextPolicyError);
    });
});
