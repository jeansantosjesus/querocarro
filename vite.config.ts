import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'

import react from '@vitejs/plugin-react'

import type { Plugin } from 'vite'

import { defineConfig } from 'vitest/config'



// Base relativa ('./') faz os assets funcionarem em qualquer subcaminho do

// GitHub Pages (ex.: https://USUARIO.github.io/querocarro/). Pode ser

// sobrescrita com VITE_BASE_PATH no build, se necessário.

const base = process.env.VITE_BASE_PATH ?? './'



// CSP aplicada apenas no build: em dev o React Refresh injeta script inline.

// style-src 'unsafe-inline' é necessário para estilos inline de gráficos (Recharts).

const CSP = [

"default-src 'self'",

"script-src 'self'",

"style-src 'self' 'unsafe-inline'",

"img-src 'self' data: https://upload.wikimedia.org https://thumb.wikimedia.org",

"font-src 'self' data:",

"connect-src 'self' https://fipe.parallelum.com.br https://commons.wikimedia.org https://*.supabase.co wss://*.supabase.co",

"base-uri 'self'",

"form-action 'self'",

"object-src 'none'",

].join('; ')



const cspPlugin: Plugin = {

name: 'qc-inject-csp',

apply: 'build',

transformIndexHtml() {

return [

{

tag: 'meta',

attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },

injectTo: 'head-prepend',

},

]

},

}



export default defineConfig({

base,

plugins: [react(), tailwindcss(), cspPlugin],

resolve: {

alias: {

'@': fileURLToPath(new URL('./src', import.meta.url)),

},

},

build: {

sourcemap: false,

chunkSizeWarningLimit: 700,

rolldownOptions: {

output: {

// Separa bibliotecas grandes para melhorar o cache e reduzir o chunk principal.

codeSplitting: {

groups: [

{ name: 'vendor-supabase', test: /node_modules[\\/]@supabase/ },

{

name: 'vendor-react',

test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,

},

{ name: 'vendor-forms', test: /node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/ },

],

},

},

},

},

test: {

globals: true,

environment: 'jsdom',

setupFiles: ['./src/tests/setup.ts'],

css: false,

include: ['src/**/*.{test,spec}.{ts,tsx}'],

coverage: {

provider: 'v8',

include: ['src/domain/**', 'src/services/**', 'src/utils/**'],

},

},

})
