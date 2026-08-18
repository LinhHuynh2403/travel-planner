import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.jourzy.app',
    appName: 'JourZy',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    plugins: {
        Keyboard: {
            resize: 'body',
        },
    },
};

export default config;
