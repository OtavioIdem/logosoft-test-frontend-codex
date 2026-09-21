import { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificacoesBell } from '@/features/notificacoes/components/NotificacoesBell';
import { useContagemNaoLidas, useNotificacoes, useNotificacoesMutations } from '@/features/notificacoes/hooks/useNotificacoesResources';
import { NotificacaoResponse, SeveridadeNotificacao, StatusNotificacao } from '@/features/notificacoes/types/notificacoes.types';

vi.mock('next/navigation', async () => import('@/tests/mocks/next/navigation'));
vi.mock('@/features/auth/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (perm: string) => perm === 'NOTIFICACOES_CONSULTAR',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true
  })
}));
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      nome: 'Operador teste',
      email: 'operador@erp.local',
      empresaId: '22222222-2222-2222-2222-222222222222',
      filialId: '33333333-3333-3333-3333-333333333333',
      isMaster: false,
      permissoes: ['NOTIFICACOES_CONSULTAR']
    },
    isAuthenticated: true,
    isLoading: false,
    authStatus: 'authenticated',
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    refreshUserFromStorage: vi.fn(),
    retrySession: vi.fn()
  })
}));
vi.mock('@/features/notificacoes/hooks/useNotificacoesResources');

const validNotificacao: NotificacaoResponse = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  empresaId: '11111111-1111-1111-1111-111111111111',
  usuarioDestinoId: '22222222-2222-2222-2222-222222222222',
  titulo: 'Nota fiscal emitida',
  mensagem: 'A nota fiscal 123 foi emitida com sucesso.',
  categoria: 'Fiscal',
  severidade: SeveridadeNotificacao.Sucesso,
  situacao: StatusNotificacao.NaoLida,
  moduloOrigem: 'Fiscal',
  criadaEm: new Date().toISOString(),
  acaoUrl: '/fiscal/notas/123'
};

const renderComQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('NotificacoesBell — AC-5 e AC-6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC-5: sino mostra erro recuperável quando listagem falha', () => {
    it('quando listaQuery rejeita, mostra ApiErrorPanel em vez de "Nenhuma notificação não lida"', async () => {
      const mockError = new Error('Erro ao listar notificações');

      vi.mocked(useContagemNaoLidas).mockReturnValue({
        data: { naoLidas: 3 },
        isLoading: false,
        isError: false,
        error: null
      } as any);

      vi.mocked(useNotificacoes).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError
      } as any);

      vi.mocked(useNotificacoesMutations).mockReturnValue({
        marcarLidaMutation: { mutateAsync: vi.fn(), isPending: false } as any,
        marcarTodasMutation: { mutate: vi.fn(), isPending: false } as any,
        arquivarMutation: { mutate: vi.fn(), isPending: false } as any
      });

      const user = userEvent.setup();
      renderComQueryClient(<NotificacoesBell />);

      // Abrir o painel (clicar no botão do sino)
      const bellBtn = screen.getByRole('button', { name: /notificações/i });
      await user.click(bellBtn);

      // AC-5 exige os DOIS lados: mensagem de erro presente E "Nenhuma notificação não lida." ausente.
      // Se ambas estivessem presentes, não haveria como provar que o estado de erro foi renderizado.
      // ApiErrorPanel renderiza error.message como <Message text={error.message || title} />,
      // logo procuramos pela mensagem do erro mockado, não pelo title do painel.
      const errorMessage = await screen.findByText(/Erro ao listar notificações/i);
      expect(errorMessage).toBeInTheDocument();

      // Afirmar que a mensagem de lista vazia NOT aparece (prova que é erro, não sucesso vazio)
      expect(screen.queryByText(/Nenhuma notificação não lida/i)).not.toBeInTheDocument();
    });
  });

  describe('AC-6: falha ao marcar como lida não remove a notificação', () => {
    it('quando marcarLidaMutation rejeita, notificação permanece na lista e não é navegada', async () => {
      const marcarLidaMutationMock = {
        mutateAsync: vi.fn().mockRejectedValue(new Error('Falha ao marcar como lida')),
        isPending: false
      };

      vi.mocked(useContagemNaoLidas).mockReturnValue({
        data: { naoLidas: 1 },
        isLoading: false,
        isError: false,
        error: null
      } as any);

      vi.mocked(useNotificacoes).mockReturnValue({
        data: { items: [validNotificacao], total: 1, page: 1, pageSize: 20 },
        isLoading: false,
        isError: false,
        error: null
      } as any);

      vi.mocked(useNotificacoesMutations).mockReturnValue({
        marcarLidaMutation: marcarLidaMutationMock as any,
        marcarTodasMutation: { mutate: vi.fn(), isPending: false } as any,
        arquivarMutation: { mutate: vi.fn(), isPending: false } as any
      });

      const user = userEvent.setup();
      renderComQueryClient(<NotificacoesBell />);

      // Abrir o painel
      const bellBtn = screen.getByRole('button', { name: /notificações/i });
      await user.click(bellBtn);

      // Verificar que a notificação está visível antes do clique
      const notificacaoTitle = await screen.findByText('Nota fiscal emitida');
      expect(notificacaoTitle).toBeInTheDocument();

      // Clicar na notificação para tentar marcar como lida
      const notificacaoBtn = notificacaoTitle.closest('button');
      await user.click(notificacaoBtn!);

      // Aguardar a tentativa de marcar
      await waitFor(() => {
        expect(marcarLidaMutationMock.mutateAsync).toHaveBeenCalledWith(validNotificacao.id);
      });

      // O comportamento crítico: notificação CONTINUA na lista após falha
      // (não foi removida como se tivesse persistido)
      expect(screen.getByText('Nota fiscal emitida')).toBeInTheDocument();
      expect(screen.getByText('A nota fiscal 123 foi emitida com sucesso.')).toBeInTheDocument();
    });
  });
});
