import { act, screen, waitFor } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MemoryAuthService } from '../../mocks/memoryAuthService'

import { TEST_USER, renderApp } from '../fixtures/renderApp'

vi.setConfig({ testTimeout: 30_000 })

beforeEach(() => {
  window.sessionStorage.clear()

  window.localStorage.clear()
})

async function fillSignUp(
  user: Awaited<ReturnType<typeof renderApp>>['user'],

  overrides: Partial<{ password: string; confirm: string; accept: boolean }> = {},
) {
  await user.type(screen.getByLabelText(/^Nome/), TEST_USER.name)

  await user.type(screen.getByLabelText(/^E-mail/), TEST_USER.email)

  await user.type(screen.getByLabelText(/^Senha/), overrides.password ?? TEST_USER.password)

  await user.type(
    screen.getByLabelText(/^Confirmar senha/),

    overrides.confirm ?? overrides.password ?? TEST_USER.password,
  )

  if (overrides.accept !== false) await user.click(screen.getByLabelText(/aviso de privacidade/i))
}

describe('proteção de rotas', () => {
  it.each(['/painel', '/simulacao', '/resultado', '/historico', '/perfil'])(
    'redireciona %s para o login quando anônimo',

    async (route) => {
      await renderApp({ route })

      expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    },
  )

  it('páginas públicas abrem sem login', async () => {
    await renderApp({ route: '/ajuda' })

    expect(
      await screen.findByRole('heading', {
        level: 1,

        name: /Central de ajuda/,
      }),
    ).toBeInTheDocument()
  })

  it('o histórico não é aberto no modo demonstração', async () => {
    const { user } = await renderApp({ route: '/entrar' })

    await user.click(await screen.findByRole('button', { name: /Experimentar a demonstração/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Demonstração' }),
    ).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: 'Histórico' })).not.toBeInTheDocument()
  })
})

describe('cadastro', () => {
  it('cria a conta e leva ao painel', async () => {
    const { user } = await renderApp({ route: '/cadastro' })

    await fillSignUp(user)

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: /Olá, Maria Silva/ }),
    ).toBeInTheDocument()
  })

  it('não envia ao serviço com senha fraca e mostra o que falta', async () => {
    const auth = new MemoryAuthService()

    const spy = vi.spyOn(auth, 'signUp')

    const { user } = await renderApp({ route: '/cadastro', auth })

    await fillSignUp(user, { password: 'fraca' })

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText(/A senha precisa ter/)).toBeInTheDocument()

    expect(spy).not.toHaveBeenCalled()
  })

  it('exige o aceite do aviso de privacidade', async () => {
    const auth = new MemoryAuthService()

    const spy = vi.spyOn(auth, 'signUp')

    const { user } = await renderApp({ route: '/cadastro', auth })

    await fillSignUp(user, { accept: false })

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByText(/É necessário aceitar o aviso de privacidade/),
    ).toBeInTheDocument()

    expect(spy).not.toHaveBeenCalled()
  })

  it('com confirmação de e-mail ativa, orienta a confirmar antes de entrar', async () => {
    const auth = new MemoryAuthService({ requireEmailConfirmation: true })

    const { user } = await renderApp({ route: '/cadastro', auth })

    await fillSignUp(user)

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Confirme seu e-mail' }),
    ).toBeInTheDocument()

    // Sem confirmar, o login falha

    const credentials = { email: TEST_USER.email, password: TEST_USER.password, remember: false }

    expect((await auth.signIn(credentials)).ok).toBe(false)

    auth.confirmEmailFor(TEST_USER.email)

    expect((await auth.signIn(credentials)).ok).toBe(true)
  })

  it('não revela se o e-mail já existe (mesma resposta)', async () => {
    const auth = new MemoryAuthService({ requireEmailConfirmation: true })

    await auth.signUp({ name: 'Outra', email: TEST_USER.email, password: 'OutraSenha123' })

    const { user } = await renderApp({ route: '/cadastro', auth })

    await fillSignUp(user)

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Confirme seu e-mail' }),
    ).toBeInTheDocument()

    expect(screen.queryByText(/já (está )?cadastrad/i)).not.toBeInTheDocument()
  })
})

describe('login e logout', () => {
  async function prepareUser(auth: MemoryAuthService) {
    await auth.signUp({
      name: TEST_USER.name,

      email: TEST_USER.email,

      password: TEST_USER.password,
    })

    await auth.signOut()
  }

  it('entra com credenciais corretas e sai com "Sair"', async () => {
    const auth = new MemoryAuthService()

    await prepareUser(auth)

    const { user } = await renderApp({ route: '/entrar', auth })

    await user.type(await screen.findByLabelText(/^E-mail/), TEST_USER.email)

    await user.type(screen.getByLabelText(/^Senha/), TEST_USER.password)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: /Olá, Maria Silva/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Quero Carro' }),
    ).toBeInTheDocument()

    expect(screen.queryByText(/sessão expirou/i)).not.toBeInTheDocument()
  })

  it('usa a mesma mensagem genérica para e-mail inexistente e senha incorreta', async () => {
    const auth = new MemoryAuthService()

    await prepareUser(auth)

    const first = await renderApp({ route: '/entrar', auth })

    await first.user.type(await screen.findByLabelText(/^E-mail/), TEST_USER.email)

    await first.user.type(screen.getByLabelText(/^Senha/), 'SenhaErrada999')

    await first.user.click(screen.getByRole('button', { name: 'Entrar' }))

    const wrongPassword = (await screen.findByRole('alert')).textContent

    first.unmount()

    const second = await renderApp({ route: '/entrar', auth })

    await second.user.type(await screen.findByLabelText(/^E-mail/), 'ninguem@example.com')

    await second.user.type(screen.getByLabelText(/^Senha/), 'SenhaErrada999')

    await second.user.click(screen.getByRole('button', { name: 'Entrar' }))

    const unknownEmail = (await screen.findByRole('alert')).textContent

    expect(wrongPassword).toBe(unknownEmail)

    expect(wrongPassword).toContain('E-mail ou senha incorretos')
  })

  it('volta à rota protegida pedida depois de entrar', async () => {
    const auth = new MemoryAuthService()

    await prepareUser(auth)

    const { user } = await renderApp({ route: '/perfil', auth })

    await user.type(await screen.findByLabelText(/^E-mail/), TEST_USER.email)

    await user.type(screen.getByLabelText(/^Senha/), TEST_USER.password)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Perfil e privacidade' }),
    ).toBeInTheDocument()
  })

  it('ignora destinos externos no redirecionamento (sem redirecionamento aberto)', async () => {
    const auth = new MemoryAuthService()

    await prepareUser(auth)

    const { user } = await renderApp({
      route: { pathname: '/entrar', state: { from: '//evil.example.com' } },

      auth,
    })
    await user.type(await screen.findByLabelText(/^E-mail/), TEST_USER.email)

    await user.type(screen.getByLabelText(/^Senha/), TEST_USER.password)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: /Olá, Maria Silva/ }),
    ).toBeInTheDocument()
  })

  it('avisa quando a sessão expira e pede novo login', async () => {
    const { auth } = await renderApp({ route: '/painel', signedIn: true })

    expect(
      await screen.findByRole('heading', { level: 1, name: /Olá, Maria Silva/ }),
    ).toBeInTheDocument()

    act(() => auth.expireSession())

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()

    expect(screen.getByText(/Sua sessão expirou/)).toBeInTheDocument()
  })
})

describe('recuperação de senha', () => {
  it('solicita o link sem revelar se o e-mail existe', async () => {
    const auth = new MemoryAuthService()

    const { user } = await renderApp({ route: '/recuperar-senha', auth })

    await user.type(await screen.findByLabelText(/^E-mail/), 'qualquer@example.com')

    await user.click(screen.getByRole('button', { name: /Enviar link/ }))

    expect(await screen.findByText(/Se o e-mail estiver cadastrado/)).toBeInTheDocument()

    expect(auth.requestedResets).toEqual(['qualquer@example.com'])
  })

  it('link inválido (sem sessão de recuperação) oferece pedir outro', async () => {
    await renderApp({ route: '/redefinir-senha' })

    expect(
      await screen.findByRole('heading', { level: 1, name: /Link inválido ou expirado/ }),
    ).toBeInTheDocument()
  })

  it('o evento de recuperação leva à tela de nova senha e a troca funciona', async () => {
    const auth = new MemoryAuthService()

    await auth.signUp({
      name: TEST_USER.name,

      email: TEST_USER.email,

      password: TEST_USER.password,
    })

    await auth.signOut()

    const { user } = await renderApp({ route: '/', auth })

    await screen.findByRole('heading', { level: 1, name: 'Quero Carro' })

    act(() => auth.triggerRecovery(TEST_USER.email))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Definir nova senha' }),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Nova senha/), 'NovaSenha12345')

    await user.type(screen.getByLabelText(/^Confirmar nova senha/), 'NovaSenha12345')

    await user.click(screen.getByRole('button', { name: /Salvar nova senha/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Senha atualizada' }),
    ).toBeInTheDocument()

    await auth.signOut()

    await waitFor(async () => {
      const result = await auth.signIn({
        email: TEST_USER.email,

        password: 'NovaSenha12345',

        remember: false,
      })

      expect(result.ok).toBe(true)
    })
  })
})
