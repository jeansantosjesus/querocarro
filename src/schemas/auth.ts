import { z } from 'zod'

import { INPUT_LIMITS } from '../config/limits'

export interface PasswordRule {
  id: string

  label: string

  test: (password: string) => boolean
}

/** Requisitos de senha mostrados no medidor. A senha é validada aqui, mas NUNCA armazenada pela aplicação. */

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: 'Pelo menos 10 caracteres', test: (p) => p.length >= 10 },

  { id: 'lower', label: 'Uma letra minúscula', test: (p) => /[a-z]/.test(p) },

  { id: 'upper', label: 'Uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },

  { id: 'digit', label: 'Um número', test: (p) => /\d/.test(p) },
]

export const PASSWORD_MAX_LENGTH = 128

export function passwordStrength(password: string): { met: number; total: number; ids: string[] } {
  const ids = PASSWORD_RULES.filter((rule) => rule.test(password)).map((rule) => rule.id)

  return { met: ids.length, total: PASSWORD_RULES.length, ids }
}

export const passwordSchema = z

  .string({ error: 'Informe uma senha.' })

  .max(PASSWORD_MAX_LENGTH, { error: `Use no máximo ${PASSWORD_MAX_LENGTH} caracteres.` })

  .superRefine((password, ctx) => {
    const missing = PASSWORD_RULES.filter((rule) => !rule.test(password))

    if (missing.length > 0) {
      ctx.addIssue({
        code: 'custom',

        message: `A senha precisa ter: ${missing.map((rule) => rule.label.toLowerCase()).join('; ')}.`,
      })
    }
  })

const emailSchema = z

  .string({ error: 'Informe o e-mail.' })

  .trim()

  .min(1, { error: 'Informe o e-mail.' })

  .max(254, { error: 'E-mail muito longo.' })

  .pipe(z.email({ error: 'Informe um e-mail válido.' }))

export const signUpSchema = z

  .object({
    name: z

      .string({ error: 'Informe seu nome.' })

      .trim()

      .min(1, { error: 'Informe seu nome.' })

      .max(INPUT_LIMITS.nameMaxLength, { error: 'Use até 80 caracteres.' }),

    email: emailSchema,

    password: passwordSchema,

    confirmPassword: z

      .string({ error: 'Confirme a senha.' })

      .min(1, { error: 'Confirme a senha.' }),

    acceptPrivacy: z.boolean().refine((value) => value === true, {
      error: 'É necessário aceitar o aviso de privacidade para criar a conta.',
    }),
  })

  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],

    error: 'As senhas não coincidem.',
  })

export const signInSchema = z.object({
  email: emailSchema,

  // No login não revelamos regras de senha: só exigimos que haja algo digitado.

  password: z

    .string({ error: 'Informe a senha.' })

    .min(1, { error: 'Informe a senha.' })

    .max(PASSWORD_MAX_LENGTH),

  remember: z.boolean(),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z

  .object({
    password: passwordSchema,

    confirmPassword: z.string().min(1, { error: 'Confirme a senha.' }),
  })

  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],

    error: 'As senhas não coincidem.',
  })

export type SignUpValues = z.infer<typeof signUpSchema>

export type SignInValues = z.infer<typeof signInSchema>

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
