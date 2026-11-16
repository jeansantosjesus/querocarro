import { zodResolver } from '@hookform/resolvers/zod'

import { useState } from 'react'

import { useForm, useWatch } from 'react-hook-form'

import { Link, useNavigate } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { Field } from '../components/ui/Field'

import { PageTitle } from '../components/ui/PageTitle'

import { Spinner } from '../components/ui/Spinner'

import { useAuth } from '../features/auth/AuthContext'

import { PasswordRequirements } from '../features/auth/PasswordRequirements'

import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/auth'



export function ResetPasswordPage() {

const { status, recovery, updatePassword } = useAuth()

const navigate = useNavigate()

const [formError, setFormError] = useState<string | null>(null)

const [done, setDone] = useState(false)



const {

register,

handleSubmit,

control,

formState: { errors, isSubmitting },

} = useForm<ResetPasswordValues>({

resolver: zodResolver(resetPasswordSchema),

defaultValues: { password: '', confirmPassword: '' },

})

const password = useWatch({ control, name: 'password' }) ?? ''



if (status === 'loading') return <Spinner label="Validando o link…" />



// Sem sessão de recuperação, o link é inválido ou expirou.

if (status !== 'authenticated' && !done) {

return (

<div className="mx-auto max-w-lg">

<PageTitle title="Link inválido ou expirado" />

<Alert tone="warn">

Não foi possível validar o link de redefinição. Solicite um novo para continuar.

</Alert>

<p className="mt-6">

<Link to="/recuperar-senha" className="qc-btn-primary">

Solicitar novo link

</Link>

</p>

</div>

)

}



async function onSubmit(values: ResetPasswordValues) {

setFormError(null)

const result = await updatePassword(values.password)

if (!result.ok) {

setFormError(result.message)

return

}

setDone(true)

}



if (done) {

return (

<div className="mx-auto max-w-lg">

<PageTitle title="Senha atualizada" />

<Alert tone="good">Sua senha foi alterada com sucesso.</Alert>

<p className="mt-6">

<button

type="button"

className="qc-btn-primary"

onClick​={() => navigate('/painel', { replace: true })}

>

Ir para o painel

</button>

</p>

</div>

)

}



return (

<div className="mx-auto max-w-lg">

<PageTitle

title={recovery ? 'Definir nova senha' : 'Alterar senha'}

subtitle="Escolha uma senha forte que você não use em outros serviços."

/>

<form onSubmit​={handleSubmit(onSubmit)} noValidate className="qc-card space-y-5 p-6">

{formError ? <Alert tone="bad">{formError}</Alert> : null}

<Field label="Nova senha" required error={errors.password?.message}>

{(props) => (

<>

<input

{...props}

type="password"

className="qc-input"

autoComplete="new-password"

{...register('password')}

/>

<PasswordRequirements password={password} id="reset-password-requirements" />

</>

)}

</Field>

<Field label="Confirmar nova senha" required error={errors.confirmPassword?.message}>

{(props) => (

<input

{...props}

type="password"

className="qc-input"

autoComplete="new-password"

{...register('confirmPassword')}

/>

)}

</Field>

<button type="submit" className="qc-btn-primary w-full" disabled={isSubmitting}>

{isSubmitting ? 'Salvando…' : 'Salvar nova senha'}

</button>

</form>

</div>

)

}
