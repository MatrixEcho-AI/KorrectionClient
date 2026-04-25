import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korrection.app',
  appName: 'Korrection',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
