import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL || process.env.APP_URL || 'https://app.barberpro.com.br'

const config: CapacitorConfig = {
  appId: 'com.barberpro.app',
  appName: 'BarberPro',
  webDir: 'mobile-shell',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0e12'
    }
  }
}

export default config
