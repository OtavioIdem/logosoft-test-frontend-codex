import { describe, it, expect } from 'vitest';
import { configurarComercialClienteSchema } from '@/features/clientes/schemas/clientesSchemas';

/**
 * AC-5, AC-1, AC-6 — Schemas de configuração comercial de cliente.
 *
 * Regra de negócio (D62): PUT de substituição atômica requer todos os campos
 * do bloco sempre presentes (sem omissão silenciosa). `.nullable()` para Ids/números,
 * nunca `.optional()`. Booleano obrigatório.
 */

describe('clientesSchemas — configurarComercialClienteSchema (AC-5, AC-1, AC-6)', () => {
  describe('AC-5: parse({}) falha com erro de validação', () => {
    it('rejeita objeto vazio', () => {
      expect(() => configurarComercialClienteSchema.parse({})).toThrow();
    });

    it('rejeita objeto com apenas alguns campos', () => {
      expect(() =>
        configurarComercialClienteSchema.parse({
          tabelaPrecoPadraoId: null,
          condicaoPagamentoPadraoId: null
        })
      ).toThrow();
    });

    it('rejeita quando falta permiteVendaAPrazo (obrigatório)', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null
        // falta permiteVendaAPrazo
      };
      expect(() => configurarComercialClienteSchema.parse(dados)).toThrow();
    });
  });

  describe('AC-5: bloco todo-nulo com permiteVendaAPrazo: false passa', () => {
    it('aceita todos os campos nulos + booleano false', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.permiteVendaAPrazo).toBe(false);
    });

    it('aceita todos os campos nulos + booleano true', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: true
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.permiteVendaAPrazo).toBe(true);
    });
  });

  describe('AC-5: Ids e números aceitam null, nunca undefined', () => {
    it('tabelaPrecoPadraoId: null é válido', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.tabelaPrecoPadraoId).toBeNull();
    });

    it('rejeita tabelaPrecoPadraoId: undefined (não pode ser omitido)', () => {
      const dados = {
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
        // tabelaPrecoPadraoId omitido
      };
      expect(() => configurarComercialClienteSchema.parse(dados)).toThrow();
    });

    it('diaVencimentoPreferencial: null é válido', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.diaVencimentoPreferencial).toBeNull();
    });

    it('rejeita diaVencimentoPreferencial: undefined', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        permiteVendaAPrazo: false
        // diaVencimentoPreferencial omitido
      };
      expect(() => configurarComercialClienteSchema.parse(dados)).toThrow();
    });
  });

  describe('AC-5: diaVencimentoPreferencial valida range 1–31', () => {
    it('aceita dia válido entre 1 e 31', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: 15,
        permiteVendaAPrazo: false
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.diaVencimentoPreferencial).toBe(15);
    });

    it('rejeita dia 0', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: 0,
        permiteVendaAPrazo: false
      };
      expect(() => configurarComercialClienteSchema.parse(dados)).toThrow();
    });

    it('rejeita dia 32', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: 32,
        permiteVendaAPrazo: false
      };
      expect(() => configurarComercialClienteSchema.parse(dados)).toThrow();
    });
  });

  describe('AC-6: classificacaoId preservado no schema', () => {
    it('aceita classificacaoId: null', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: null,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.classificacaoId).toBeNull();
    });

    it('aceita classificacaoId válido (UUID)', () => {
      const uuidValido = '12345678-1234-1234-1234-123456789012';
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: uuidValido,
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado.classificacaoId).toBe(uuidValido);
    });

    it('rejeita classificacaoId inválido (não-UUID)', () => {
      const dados = {
        tabelaPrecoPadraoId: null,
        condicaoPagamentoPadraoId: null,
        classificacaoId: 'nao-é-uuid',
        diaVencimentoPreferencial: null,
        permiteVendaAPrazo: false
      };
      expect(() => configurarComercialClienteSchema.parse(dados)).toThrow();
    });
  });

  describe('AC-1: dados preenchidos passam validação', () => {
    it('aceita todos os cinco campos preenchidos', () => {
      const uuidTabelaPreco = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const uuidCondicao = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const uuidClassificacao = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

      const dados = {
        tabelaPrecoPadraoId: uuidTabelaPreco,
        condicaoPagamentoPadraoId: uuidCondicao,
        classificacaoId: uuidClassificacao,
        diaVencimentoPreferencial: 15,
        permiteVendaAPrazo: true
      };
      const resultado = configurarComercialClienteSchema.parse(dados);
      expect(resultado).toEqual(dados);
    });
  });
});
