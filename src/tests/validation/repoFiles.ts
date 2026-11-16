/**

* Leitura de arquivos do repositório (a partir da raiz) para os testes de validação.

*

* Por que não `import ... ?raw`: o Vitest não entrega CSS como texto (`css: false` em

* vite.config.ts), e o Vite bloqueia arquivos `.env*`. Por isso lemos do disco, com o

* módulo `fs` embutido do Node (disponível via `process.getBuiltinModule`, Node 22.3+).

* Não há dependência nova: os tipos do Node não entram no tsconfig do app.

*/



interface FsLike {

readFileSync(path: string, encoding: 'utf8'): string

}



interface NodeProcessLike {

cwd(): string

getBuiltinModule?(id: 'node:fs'): FsLike | undefined

}



/** Lê um arquivo relativo à raiz do repositório. Os testes rodam a partir da raiz (`npm test`). */

export function readRepoFile(relativePath: string): string {

const proc = (globalThis as unknown as { process?: NodeProcessLike }).process

const fs = proc?.getBuiltinModule?.('node:fs')

if (!proc || !fs) {

throw new Error('Leitura de arquivos indisponível: é preciso Node 22.3 ou superior.')

}

return fs.readFileSync(`${proc.cwd()}/${relativePath}`, 'utf8')

}
