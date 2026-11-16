/**

* Contraste WCAG calculado a partir dos tokens reais de src/index.css.

* O axe não avalia cor no jsdom (color-contrast está desativado nos testes de axe),

* então esta verificação cobre o gap: pares de texto e de selo, e a borda de campos.

*/

import { describe, expect, it } from 'vitest'

import { readRepoFile } from './repoFiles'



const CSS = readRepoFile('src/index.css')



function token(name: string): string {

if (name === 'white') return '#ffffff'

const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`).exec(CSS)

if (!match?.[1]) throw new Error(`Token não encontrado: ${name}`)

return match[1]

}



function luminance(hex: string): number {

const channels = [1, 3, 5].map((i) => {

const value = Number.parseInt(hex.slice(i, i + 2), 16) / 255

return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4

})

const [r, g, b] = channels as [number, number, number]

return 0.2126 * r + 0.7152 * g + 0.0722 * b

}



/** Razão de contraste WCAG entre duas cores (1 a 21). */

function contrast(a: string, b: string): number {

const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]

return (light + 0.05) / (dark + 0.05)

}



const TEXT_PAIRS: Array<[string, string]> = [

['ink-900', 'white'],

['ink-700', 'white'],

['ink-600', 'white'],

['ink-500', 'white'],

['brand-700', 'white'],

['white', 'brand-700'],

['ink-800', 'ink-100'],

['good-fg', 'good-bg'],

['warn-fg', 'warn-bg'],

['bad-fg', 'bad-bg'],

['info-fg', 'info-bg'],

]



describe('contraste de texto (WCAG AA: 4,5:1)', () => {

it.each(TEXT_PAIRS)('%s sobre %s', (foreground, background) => {

const ratio = contrast(token(foreground), token(background))

expect(

ratio,

`${foreground} sobre ${background} = ${ratio.toFixed(2)}:1`,

).toBeGreaterThanOrEqual(4.5)

})

})



describe('contraste de componentes (WCAG 1.4.11: 3:1)', () => {

it('borda dos campos de formulário (ink-500 sobre branco)', () => {

// A classe de campo usa border-ink-500 (index.css). Antes era ink-400 (2,56:1, abaixo de 3:1):

// a borda é a única indicação visual do campo para quem tem baixa visão.

expect(CSS).toMatch(/border border-ink-500 bg-white/)

const ratio = contrast(token('ink-500'), token('white'))

expect(ratio, `ink-500 sobre branco = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)

})

})
