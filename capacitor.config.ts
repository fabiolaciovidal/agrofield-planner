import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bo.com.agrocentro.agrofield',
  appName: 'AgroField CRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#f3f4f6',
  },
};

export default config;
