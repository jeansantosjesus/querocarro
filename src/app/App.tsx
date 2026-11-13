import { HashRouter } from 'react-router-dom'
import { AppRoutes } from '../routes/AppRoutes'
import { AppProviders } from './AppProviders'

/**
 * HashRouter: escolhido para compatibilidade com o GitHub Pages (hospedagem estática,
 * sem fallback de servidor). A atualização direta de qualquer rota (F5) funciona,
 * pois o caminho fica após o "#".
 */
export function App() {
  return (
    <HashRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </HashRouter>
  )
}
