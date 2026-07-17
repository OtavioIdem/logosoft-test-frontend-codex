import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/lib/http/requestUtils';
import {
    cancelarOrdemServicoSchema,
    criarOrdemServicoSchema,
    encerrarOrdemServicoSchema,
    faturarOrdemServicoSchema,
    itemOrdemServicoSchema,
    triarOrdemServicoSchema
} from '@/features/servicos/schemas/servicosSchemas';
import { PrioridadeOrdemServico, TipoItemOrdemServico } from '@/features/servicos/types/servicos.types';

const empresaId = '11111111-1111-1111-1111-111111111111';
const clienteId = '22222222-2222-2222-2222-222222222222';
const produtoId = '33333333-3333-3333-3333-333333333333';

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('serviços (piloto) — payloads', () => {
    it('monta criação de OS com relacionamentos opcionais como null explícito (convenção do projeto)', () => {
        const payload = build(criarOrdemServicoSchema, {
            empresaId,
            filialId: '',
            numero: 'OS-001',
            clienteId,
            descricao: 'Troca de compressor',
            prioridade: PrioridadeOrdemServico.Alta,
            tecnicoResponsavelId: '',
            localEstoqueId: null,
            dataAbertura: null,
            dataPrevisao: null
        }) as Record<string, unknown>;
        expect(payload).toMatchObject({ empresaId, numero: 'OS-001', clienteId, descricao: 'Troca de compressor', prioridade: PrioridadeOrdemServico.Alta });
        expect(payload.filialId).toBeNull();
        expect(payload.tecnicoResponsavelId).toBeNull();
        expect(payload.localEstoqueId).toBeNull();
    });

    it('converte datas da OS para ISO 8601', () => {
        const payload = build(criarOrdemServicoSchema, {
            empresaId,
            numero: 'OS-002',
            clienteId,
            descricao: 'Manutenção preventiva',
            prioridade: PrioridadeOrdemServico.Media,
            dataAbertura: new Date('2026-07-20T12:00:00.000Z')
        }) as { dataAbertura: string };
        expect(payload.dataAbertura).toBe('2026-07-20T12:00:00.000Z');
    });

    it('rejeita criação sem cliente válido', () => {
        expect(() => criarOrdemServicoSchema.parse({ empresaId, numero: 'OS-003', clienteId: '99', descricao: 'x', prioridade: PrioridadeOrdemServico.Baixa })).toThrow();
    });

    it('monta item de OS (produto vinculado ou null explícito)', () => {
        const payload = build(itemOrdemServicoSchema, { tipo: TipoItemOrdemServico.Material, descricao: 'Filtro', produtoId, quantidade: 2, valorUnitario: 35.5 });
        expect(payload).toEqual({ tipo: TipoItemOrdemServico.Material, descricao: 'Filtro', produtoId, quantidade: 2, valorUnitario: 35.5 });
        const semProduto = build(itemOrdemServicoSchema, { tipo: TipoItemOrdemServico.MaoDeObra, descricao: 'Serviço', produtoId: '', quantidade: 1, valorUnitario: 100 }) as Record<string, unknown>;
        expect(semProduto).toMatchObject({ tipo: TipoItemOrdemServico.MaoDeObra, descricao: 'Serviço', quantidade: 1, valorUnitario: 100 });
        expect(semProduto.produtoId).toBeNull();
    });

    it('rejeita item com quantidade zero', () => {
        expect(() => itemOrdemServicoSchema.parse({ tipo: TipoItemOrdemServico.Material, descricao: 'Filtro', quantidade: 0, valorUnitario: 10 })).toThrow();
    });

    it('monta triagem, encerramento, faturamento e cancelamento', () => {
        expect(build(triarOrdemServicoSchema, { diagnostico: 'Compressor queimado', tecnicoResponsavelId: '' })).toMatchObject({ diagnostico: 'Compressor queimado' });
        expect(build(encerrarOrdemServicoSchema, { laudoTecnico: 'Substituído e testado' })).toEqual({ laudoTecnico: 'Substituído e testado' });
        expect(build(faturarOrdemServicoSchema, { numeroDocumento: 'NF-9', dataVencimento: null, observacao: '' })).toMatchObject({ numeroDocumento: 'NF-9' });
        expect(build(cancelarOrdemServicoSchema, { motivo: 'Cliente desistiu' })).toEqual({ motivo: 'Cliente desistiu' });
    });

    it('exige laudo para encerrar e motivo para cancelar', () => {
        expect(() => encerrarOrdemServicoSchema.parse({ laudoTecnico: '  ' })).toThrow();
        expect(() => cancelarOrdemServicoSchema.parse({ motivo: '' })).toThrow();
    });
});
