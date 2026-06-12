'use client';

import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { classNames } from 'primereact/utils';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { FieldError } from '@/components/forms/FieldError';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { loginSchema, LoginFormValues } from '@/features/auth/schemas/loginSchema';
import { LoginEnvironmentBadge } from '@/features/auth/components/LoginEnvironmentBadge';

export const LoginForm = () => {
    const { apiError, clearApiError, submitLogin } = useLogin();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            senha: '',
            empresaId: ''
        }
    });

    const onSubmit = async (values: LoginFormValues) => {
        await submitLogin(values);
    };

    return (
        <div className="login-form">
            <div className="login-form__header">
                <div className="login-form__logo-row">
                    <Image src="/layout/images/logo-dark.svg" alt="logosoft" width={148} height={34} priority className="login-form__logo" />
                    <LoginEnvironmentBadge />
                </div>

                <h1>Bem-vindo ao logosoft</h1>
                <p>Acesse sua operação empresarial com segurança</p>
            </div>

            <ApiErrorPanel error={apiError} />

            <form onSubmit={handleSubmit(onSubmit)} className="login-form__fields" noValidate aria-busy={isSubmitting}>
                <div className="login-field">
                    <label htmlFor="email">E-mail</label>
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <InputText
                                {...field}
                                id="email"
                                type="email"
                                autoComplete="username"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                                className={classNames('w-full', { 'p-invalid': errors.email })}
                                onChange={(event) => {
                                    clearApiError();
                                    field.onChange(event);
                                }}
                            />
                        )}
                    />
                    <FieldError id="email-error" message={errors.email?.message} />
                </div>

                <div className="login-field">
                    <label htmlFor="senha">Senha</label>
                    <Controller
                        name="senha"
                        control={control}
                        render={({ field }) => (
                            <Password
                                {...field}
                                inputId="senha"
                                inputClassName={classNames('w-full', { 'p-invalid': errors.senha })}
                                className="w-full"
                                feedback={false}
                                toggleMask
                                autoComplete="current-password"
                                aria-invalid={Boolean(errors.senha)}
                                aria-describedby={errors.senha ? 'senha-error' : undefined}
                                onChange={(event) => {
                                    clearApiError();
                                    field.onChange(event);
                                }}
                            />
                        )}
                    />
                    <FieldError id="senha-error" message={errors.senha?.message} />
                </div>

                <div className="login-field">
                    <label htmlFor="empresaId">Empresa</label>
                    <Controller
                        name="empresaId"
                        control={control}
                        render={({ field }) => (
                            <InputText
                                {...field}
                                id="empresaId"
                                className="w-full"
                                placeholder="Código autorizado"
                                autoComplete="organization"
                                aria-label="Empresa"
                                onChange={(event) => {
                                    clearApiError();
                                    field.onChange(event);
                                }}
                            />
                        )}
                    />
                </div>

                <Button type="submit" label="Entrar" icon="pi pi-sign-in" loading={isSubmitting} disabled={isSubmitting} className="w-full login-form__submit" />
            </form>
        </div>
    );
};
