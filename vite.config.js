import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// IP del ordenador en la wifi: el QR del proyector la usa cuando la app se abre en «localhost»,
// para que los móviles de la misma red puedan entrar durante las pruebas
const lanIp = () => Object.values(networkInterfaces()).flat()
  .find((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254'))?.address ?? ''

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  server: { host: true }, // accesible desde móviles en la misma red
  define: { __LAN_IP__: JSON.stringify(command === 'serve' ? lanIp() : '') },
}))
