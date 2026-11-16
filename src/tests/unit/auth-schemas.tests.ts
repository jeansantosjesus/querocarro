import { describe, expect, it } from 'vitest'

import {

forgotPasswordSchema,

passwordSchema,

passwordStrength,

resetPasswordSchema,

signInSchema,

signUpSchema,

} from '../../schemas/auth'



const validSignUp = {

name: 'Maria Silva',

email: 'maria@example.com',

password: 'SenhaForte123',

confirmPassword: 'SenhaForte123',

acceptPrivacy: true,

}



describe('senha', () => {

it('exige tamanho, minúscula, maiúscula e número', () => {

expect(passwordSchema.safeParse('curta1A').success).toBe(false)

expect(passwordSchema.safeParse('semmaiuscula123').success).toBe(false)

expect(passwordSchema.safeParse('SEMMINUSCULA123').success).toBe(false)

expect(passwordSchema.safeParse('SemNumeroAqui').success).toBe(false)

expect(passwordSchema.safeParse('SenhaForte123').success).toBe(true)

})



it('limita o tamanho máximo', () => {

expect(passwordSchema.safeParse('Aa1'.repeat(60)).success).toBe(false)

})



it('o medidor reporta os requisitos atendidos', () => {

expect(passwordStrength('').met).toBe(0)

expect(passwordStrength('SenhaForte123').met).toBe(passwordStrength('SenhaForte123').total)

expect(passwordStrength('abc').ids).toEqual(['lower'])

})

})



describe('cadastro', () => {

it('aceita dados válidos', () => {

expect(signUpSchema.safeParse(validSignUp).success).toBe(true)

})



it('exige confirmação igual da senha', () => {

const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'Outra123456' })

expect(result.success).toBe(false)

if (!result.success) expect(result.error.issues[0]?.path).toEqual(['confirmPassword'])

})



it('exige aceite do aviso de privacidade', () => {

expect(signUpSchema.safeParse({ ...validSignUp, acceptPrivacy: false }).success).toBe(false)

})



it('valida e-mail e nome', () => {

expect(signUpSchema.safeParse({ ...validSignUp, email: 'sem-arroba' }).success).toBe(false)

expect(signUpSchema.safeParse({ ...validSignUp, name: ' ' }).success).toBe(false)

expect(signUpSchema.safeParse({ ...validSignUp, name: 'x'.repeat(81) }).success).toBe(false)

})



it('remove espaços do e-mail', () => {

const parsed = signUpSchema.parse({ ...validSignUp, email: ' maria@example.com ' })

expect(parsed.email).toBe('maria@example.com')

})

})



describe('login e recuperação', () => {

it('login não revela regras de senha (só exige preenchimento)', () => {

expect(

signInSchema.safeParse({ email: 'a@b.co', password: 'x', remember: false }).success,

).toBe(true)

expect(signInSchema.safeParse({ email: 'a@b.co', password: '', remember: false }).success).toBe(

false,

)

})



it('recuperação exige e-mail válido', () => {

expect(forgotPasswordSchema.safeParse({ email: 'nao-e-email' }).success).toBe(false)

expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)

})



it('redefinição exige senha forte e confirmação', () => {

expect(

resetPasswordSchema.safeParse({ password: 'fraca', confirmPassword: 'fraca' }).success,

).toBe(false)

expect(

resetPasswordSchema.safeParse({ password: 'SenhaForte123', confirmPassword: 'SenhaForte124' })

.success,

).toBe(false)

expect(

resetPasswordSchema.safeParse({ password: 'SenhaForte123', confirmPassword: 'SenhaForte123' })

.success,

).toBe(true)

})

})
