import { createContext, useContext, type ReactNode } from 'react'

import type { Repositories } from '../../repositories/types'

const RepositoriesContext = createContext<Repositories | null>(null)

/**

* Fornece os repositórios do usuário autenticado. No modo demonstração ou sem login

* o valor é null: nada é persistido.

*/

export function RepositoriesProvider({
  repositories,

  children,
}: {
  repositories: Repositories | null

  children: ReactNode
}) {
  return (
    <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components

export function useRepositories(): Repositories | null {
  return useContext(RepositoriesContext)
}
