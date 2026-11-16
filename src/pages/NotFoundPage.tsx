import { Link } from 'react-router-dom'

import { PageTitle } from '../components/ui/PageTitle'



export function NotFoundPage() {

return (

<div className="mx-auto max-w-xl py-12 text-center">

<PageTitle

title="Página não encontrada"

subtitle="O endereço acessado não existe no Quero Carro."

/>

<Link to="/" className="qc-btn-primary">

Voltar ao início

</Link>

</div>

)

}
