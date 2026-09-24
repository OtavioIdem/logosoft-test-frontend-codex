import { describe, it, expect } from 'vitest';
import { configurarCompraFornecedorSchema, revogarHomologacaoFornecedorSchema } from '@/features/fornecedores/schemas/fornecedoresSchemas';

/**
 * AC-5, AC-4 — Schemas de configuração de compra e revogação de homologação.
 *
 * Regra de negócio (D62, D63): PUT de configuração é substituição atômica com
 * `.nullable()` para Ids/números e booleano obrigatório (implícito por ausência).
 * POST de revogação exige motivo entre 5 e 500 caracteres.
 */

describe('fornecedoresSchemas', () => {
  describe('configurarCompraFornecedorSchema (AC-5, AC-4)', () => {
    describe('parse({}) falha com erro de validação', () => {
      it('rejeita objeto vazio', () => {
        expect(() => configurarCompraFornecedorSchema.parse({})).toThrow();
      });

      it('rejeita quando faltam campos', () => {
        expect(() =>
          configurarCompraFornecedorSchema.parse({
            condicaoPagamentoPadraoId: null
          })
        ).toThrow();
      });
    });

    describe('bloco todo-nulo passa', () => {
      it('aceita todos os campos nulos', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: null
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.condicaoPagamentoPadraoId).toBeNull();
        expect(resultado.prazoEntregaMedio).toBeNull();
        expect(resultado.categoriaFornecimento).toBeNull();
      });
    });

    describe('Ids e números aceitam null, nunca undefined (AC-5)', () => {
      it('condicaoPagamentoPadraoId: null é válido', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: null
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.condicaoPagamentoPadraoId).toBeNull();
      });

      it('rejeita condicaoPagamentoPadraoId: undefined', () => {
        const dados = {
          prazoEntregaMedio: null,
          categoriaFornecimento: null
          // condicaoPagamentoPadraoId omitido
        };
        expect(() => configurarCompraFornecedorSchema.parse(dados)).toThrow();
      });

      it('prazoEntregaMedio: null é válido', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: null
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.prazoEntregaMedio).toBeNull();
      });

      it('rejeita prazoEntregaMedio: undefined', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          categoriaFornecimento: null
          // prazoEntregaMedio omitido
        };
        expect(() => configurarCompraFornecedorSchema.parse(dados)).toThrow();
      });
    });

    describe('prazoEntregaMedio valida >= 0', () => {
      it('aceita prazo 0', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: 0,
          categoriaFornecimento: null
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.prazoEntregaMedio).toBe(0);
      });

      it('aceita prazo > 0', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: 30,
          categoriaFornecimento: null
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.prazoEntregaMedio).toBe(30);
      });

      it('rejeita prazo negativo', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: -1,
          categoriaFornecimento: null
        };
        expect(() => configurarCompraFornecedorSchema.parse(dados)).toThrow();
      });

      it('rejeita prazo não-inteiro', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: 15.5,
          categoriaFornecimento: null
        };
        expect(() => configurarCompraFornecedorSchema.parse(dados)).toThrow();
      });
    });

    describe('categoriaFornecimento valida máx. 80 caracteres', () => {
      it('aceita string até 80 caracteres', () => {
        const cat = 'a'.repeat(80);
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: cat
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.categoriaFornecimento).toBe(cat);
      });

      it('rejeita string com mais de 80 caracteres', () => {
        const cat = 'a'.repeat(81);
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: cat
        };
        expect(() => configurarCompraFornecedorSchema.parse(dados)).toThrow();
      });

      it('converte string vazia para null', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: ''
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.categoriaFornecimento).toBeNull();
      });

      it('trim de espaços em branco', () => {
        const dados = {
          condicaoPagamentoPadraoId: null,
          prazoEntregaMedio: null,
          categoriaFornecimento: '   '
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado.categoriaFornecimento).toBeNull();
      });
    });

    describe('AC-4: dados preenchidos passam validação', () => {
      it('aceita todos os três campos preenchidos', () => {
        const uuidCondicao = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
        const dados = {
          condicaoPagamentoPadraoId: uuidCondicao,
          prazoEntregaMedio: 30,
          categoriaFornecimento: 'Eletrônicos'
        };
        const resultado = configurarCompraFornecedorSchema.parse(dados);
        expect(resultado).toEqual(dados);
      });
    });
  });

  describe('revogarHomologacaoFornecedorSchema (D63)', () => {
    describe('parse({}) falha', () => {
      it('rejeita objeto vazio', () => {
        expect(() => revogarHomologacaoFornecedorSchema.parse({})).toThrow();
      });

      it('rejeita motivo vazio', () => {
        expect(() => revogarHomologacaoFornecedorSchema.parse({ motivo: '' })).toThrow();
      });

      it('rejeita motivo com menos de 5 caracteres', () => {
        expect(() => revogarHomologacaoFornecedorSchema.parse({ motivo: 'abc' })).toThrow();
      });
    });

    describe('motivo valida 5–500 caracteres', () => {
      it('aceita motivo com 5 caracteres', () => {
        const resultado = revogarHomologacaoFornecedorSchema.parse({ motivo: 'abcde' });
        expect(resultado.motivo).toBe('abcde');
      });

      it('aceita motivo com 500 caracteres', () => {
        const motivo = 'a'.repeat(500);
        const resultado = revogarHomologacaoFornecedorSchema.parse({ motivo });
        expect(resultado.motivo).toBe(motivo);
      });

      it('rejeita motivo com 501 caracteres', () => {
        const motivo = 'a'.repeat(501);
        expect(() => revogarHomologacaoFornecedorSchema.parse({ motivo })).toThrow();
      });

      it('trim de espaços', () => {
        const resultado = revogarHomologacaoFornecedorSchema.parse({ motivo: '  abcde  ' });
        expect(resultado.motivo).toBe('abcde');
      });
    });
  });
});
