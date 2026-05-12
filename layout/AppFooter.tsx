import { appConfig } from '@/config/app';

const AppFooter = () => {
    return (
        <div className="layout-footer">
            <span className="font-medium">© {appConfig.name}</span>
            <span className="ml-2">v{appConfig.version}</span>
        </div>
    );
};

export default AppFooter;
