export const appConfig = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'logosoft',
    version: '1.11.0',
    env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    useMockAuth: process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true',
    useMockApi: process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
} as const;
