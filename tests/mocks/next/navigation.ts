import { routerMock } from '@/tests/mocks/auth/authProviderDeps';

export const nextNavigationMock = {
    pathname: '/dashboard',
    router: routerMock
};

export const usePathname = () => nextNavigationMock.pathname;
export const useRouter = () => nextNavigationMock.router;
