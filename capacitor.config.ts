import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bommalu.toyrental',
  appName: 'Toyflix',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlay: false,
      backgroundColor: '#FFFFFF'
    }
  }
};

export default config;
