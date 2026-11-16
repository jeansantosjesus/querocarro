import { PASSWORD_RULES, passwordStrength } from '../../schemas/auth'



/** Lista de requisitos de senha. O estado é indicado por texto e símbolo, não só por cor. */

export function PasswordRequirements({ password, id }: { password: string; id: string }) {

const { ids } = passwordStrength(password)

return (

<ul id={id} className="mt-2 space-y-1 text-sm" aria-label="Requisitos da senha">

{PASSWORD_RULES.map((rule) => {

const met = ids.includes(rule.id)

return (

<li key={rule.id} className={met ? 'text-good-fg' : 'text-ink-600'}>

<span aria-hidden="true">{met ? '✓ ' : '○ '}</span>

{rule.label}

<span className="sr-only">{met ? ' (atendido)' : ' (pendente)'}</span>

</li>

)

})}

</ul>

)

}
