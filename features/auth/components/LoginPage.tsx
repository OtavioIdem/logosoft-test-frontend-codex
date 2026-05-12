'use client';

import { LoginBrandPanel } from '@/features/auth/components/LoginBrandPanel';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const LoginPage = () => (
    <main className="login-shell">
        <section className="login-card" aria-label="Login logosoft">
            <div className="login-card__form">
                <LoginForm />
            </div>
            <LoginBrandPanel />
        </section>
    </main>
);
