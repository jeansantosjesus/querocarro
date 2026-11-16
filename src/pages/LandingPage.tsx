import { useEffect } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { APP_NAME, APP_TAGLINE, DISCLAIMERS } from '../config/copy'

import { useAuth } from '../features/auth/AuthContext'

import { useSimulation } from '../features/simulation/SimulationContext'



const STEPS = [

{

title: 'Conte sobre você',

text: 'Objetivo, finanças e uso do veículo. Sem CPF, endereço ou dados bancários.',

},

{

title: 'Defina o que importa',

text: 'Escolha um cenário e ajuste a importância de cada critério.',

},

{

title: 'Compare um grupo de opções',

text: 'Veja de 3 a 5 alternativas compatíveis, com custos, fontes e premissas visíveis.',

},

]



const PRINCIPLES = [

{

title: 'Um grupo, não um vencedor',

text: 'As opções recomendadas têm o mesmo destaque. A decisão é sua.',

},

{

title: 'Transparência',

text: 'Cada estimativa mostra origem, premissa e confiabilidade. A fórmula é explicada.',

},

{

title: 'Privacidade',

text: 'Seus dados financeiros ficam só na memória do navegador, a menos que você escolha salvar.',

},

]



export function LandingPage() {

const { status, isDemo, enterDemo } = useAuth()

const { startNew } = useSimulation()

const navigate = useNavigate()

const loggedIn = status === 'authenticated'



useEffect(() => {

document.title = `${APP_NAME} · Compare veículos compatíveis com a sua realidade`

}, [])



function handleDemo() {

enterDemo()

startNew('demo')

navigate('/painel')

}



return (

<div className="space-y-12">

<section className="rounded-3xl bg-brand-900 px-6 py-12 text-white sm:px-10">

<p className="text-sm font-semibold uppercase tracking-wide text-brand-100">

Sistema de apoio à decisão

</p>

<h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{APP_NAME}</h1>

<p className="mt-4 max-w-2xl text-lg text-brand-50">{APP_TAGLINE}</p>

<div className="mt-8 flex flex-wrap gap-3">

{loggedIn || isDemo ? (

<Link to="/painel" className="qc-btn bg-white text-brand-900 hover:bg-brand-50">

Ir para o painel

</Link>

) : (

<>

<Link to="/cadastro" className="qc-btn bg-white text-brand-900 hover:bg-brand-50">

Criar conta

</Link>

<Link

to="/entrar"

className="qc-btn border border-white text-white hover:bg-brand-800"

>

Entrar

</Link>

<button

type="button"

className="qc-btn border border-white text-white hover:bg-brand-800"

onClick={handleDemo}

>

Experimentar a demonstração

</button>

</>

)}

</div>

</section>



<section aria-labelledby="how">

<h2 id="how" className="mb-4 text-2xl font-bold">

Como funciona

</h2>

<ol className="grid gap-4 md:grid-cols-3">

{STEPS.map((step, index) => (

<li key={step.title} className="qc-card p-5">

<span

aria-hidden="true"

className="mb-2 grid size-9 place-items-center rounded-full bg-brand-100 font-bold text-brand-900"

>

{index + 1}

</span>

<h3 className="font-bold">{step.title}</h3>

<p className="mt-1 text-sm text-ink-700">{step.text}</p>

</li>

))}

</ol>

</section>



<section aria-labelledby="principles">

<h2 id="principles" className="mb-4 text-2xl font-bold">

Nossos princípios

</h2>

<ul className="grid gap-4 md:grid-cols-3">

{PRINCIPLES.map((item) => (

<li key={item.title} className="qc-card p-5">

<h3 className="font-bold">{item.title}</h3>

<p className="mt-1 text-sm text-ink-700">{item.text}</p>

</li>

))}

</ul>

</section>



<section aria-labelledby="warn" className="rounded-2xl bg-warn-bg p-6 text-warn-fg">

<h2 id="warn" className="text-lg font-bold">

Importante

</h2>

<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">

{DISCLAIMERS.items.map((item) => (

<li key={item}>{item}</li>

))}

</ul>

<p className="mt-3 text-sm">

Projeto acadêmico.{' '}

<Link to="/ajuda/metodologia" className="font-semibold underline">

Leia a metodologia e as limitações

</Link>

.

</p>

</section>

</div>

)

}
