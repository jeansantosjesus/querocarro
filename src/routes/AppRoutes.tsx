import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'

import { ComparePage } from '../pages/ComparePage'

import { DashboardPage } from '../pages/DashboardPage'

import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'

import { HistoryComparePage } from '../pages/HistoryComparePage'

import { HistoryDetailPage } from '../pages/HistoryDetailPage'

import { HistoryPage } from '../pages/HistoryPage'

import { InverseSimulationPage } from '../pages/InverseSimulationPage'

import { LandingPage } from '../pages/LandingPage'

import { LoginPage } from '../pages/LoginPage'

import { HelpArticlePage, HelpIndexPage, MethodologyRedirect } from '../pages/HelpPage'

import { NotFoundPage } from '../pages/NotFoundPage'

import { ProfilePage } from '../pages/ProfilePage'

import { ResetPasswordPage } from '../pages/ResetPasswordPage'

import { ResultPage } from '../pages/ResultPage'

import { SignUpPage } from '../pages/SignUpPage'

import { SimulationPage } from '../pages/SimulationPage'

import { VehicleDetailPage } from '../pages/VehicleDetailPage'

import { RequireAccess } from './RequireAccess'



export function AppRoutes() {

return (

<Routes>

<Route element={<AppLayout />}>

{/* Públicas */}

<Route index element={<LandingPage />} />

<Route path="entrar" element={<LoginPage />} />

<Route path="cadastro" element={<SignUpPage />} />

<Route path="recuperar-senha" element={<ForgotPasswordPage />} />

<Route path="redefinir-senha" element={<ResetPasswordPage />} />

<Route path="ajuda" element={<HelpIndexPage />} />

<Route path="ajuda/:slug" element={<HelpArticlePage />} />

<Route path="metodologia" element={<MethodologyRedirect />} />



{/* Privadas: usuário autenticado ou modo demonstração */}

<Route element={<RequireAccess allowDemo />}>

<Route path="painel" element={<DashboardPage />} />

<Route path="simulacao" element={<SimulationPage />} />

<Route path="resultado" element={<ResultPage />} />

<Route path="comparar" element={<ComparePage />} />

<Route path="veiculo/:id" element={<VehicleDetailPage />} />

<Route path="veiculo/:id/quero-este-carro" element={<InverseSimulationPage />} />

</Route>



{/* Privadas: somente usuário autenticado */}

<Route element={<RequireAccess />}>

<Route path="historico" element={<HistoryPage />} />

<Route path="historico/comparar" element={<HistoryComparePage />} />

<Route path="historico/:id" element={<HistoryDetailPage />} />

<Route path="perfil" element={<ProfilePage />} />

</Route>



<Route path="*" element={<NotFoundPage />} />

</Route>

</Routes>

)

}
