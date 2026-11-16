impimport js from '@eslint/js'

import prettier from 'eslint-config-prettier'

import jsxA11y from 'eslint-plugin-jsx-a11y'

import reactHooks from 'eslint-plugin-react-hooks'

import reactRefresh from 'eslint-plugin-react-refresh'

import globals from 'globals'

import tseslint from 'typescript-eslint'



export default tseslint.config(

{ ignores: ['dist', 'coverage', 'node_modules'] },

{

files: ['**/*.{ts,tsx}'],

extends: [

js.configs.recommended,

...tseslint.configs.recommended,

reactHooks.configs.flat.recommended,

jsxA11y.flatConfigs.recommended,

prettier,

],

languageOptions: {

ecmaVersion: 2023,

globals: { ...globals.browser },

},

plugins: {

'react-refresh': reactRefresh,

},

rules: {

'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

'@typescript-eslint/no-unused-vars': [

'error',

{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },

],

'@typescript-eslint/consistent-type-imports': 'error',

// Segurança: nunca renderizar HTML vindo de usuários ou APIs.

'no-restricted-syntax': [

'error',

{

selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",

message: 'dangerouslySetInnerHTML é proibido neste projeto (risco de XSS).',

},

],

'no-eval': 'error',

'no-implied-eval': 'error',

},

},

{

// Fixtures de teste não passam por Fast Refresh.

files: ['src/tests/**/*.{ts,tsx}'],

rules: { 'react-refresh/only-export-components': 'off' },

},

{

files: ['vite.config.ts', 'eslint.config.js'],

languageOptions: { globals: { ...globals.node } },

},

)



)

geOptions: { globals: { ...globals.node } },

},

)
