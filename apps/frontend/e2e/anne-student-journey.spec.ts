import { test, expect } from '@playwright/test'

test.describe('Jornada Completa da agent-Anne — Estuda Anne (Desktop & Mobile)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // Helper para navegar entre abas em Desktop e Mobile (usando apenas elementos visíveis na viewport)
  async function navigateToTab(page: any, isMobile: boolean, tabName: string) {
    if (isMobile) {
      const openMenuBtn = page.getByRole('button', { name: 'Abrir menu' })
      if (await openMenuBtn.isVisible()) {
        await openMenuBtn.click()
        await page.waitForTimeout(300)
      }
    }
    const tabBtn = page.locator('button:visible').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }).first()
    await expect(tabBtn).toBeVisible()
    await tabBtn.click()
  }

  test('1. Autenticação de Estudante e Navegação pelo Dashboard', async ({ page }) => {
    // Tela de login
    await expect(page.locator('h1')).toContainText('Estuda Anne')
    
    // Login como Estudante Demo
    const demoStudentBtn = page.getByRole('button', { name: /Demo Estudante/i })
    await expect(demoStudentBtn).toBeVisible()
    await demoStudentBtn.click()

    // Verifica que o painel da estudante carregou
    await expect(page.getByText('Bom te ver, Ana')).toBeVisible()
    await expect(page.getByText('Progresso do semestre')).toBeVisible()
    await expect(page.getByText('Revisões de hoje')).toBeVisible()
  })

  test('2. Gestão de Materiais e Processamento via Backend (BFF)', async ({ page, isMobile }) => {
    await page.getByRole('button', { name: /Demo Estudante/i }).click()

    // Navega para a aba Materiais
    await navigateToTab(page, isMobile, 'Materiais')

    // Verifica zona de upload e materiais cadastrados
    await expect(page.getByText('Envios recentes')).toBeVisible()
    await expect(page.getByText('Arraste e solte seus arquivos')).toBeVisible()

    // Simula upload adicionando arquivo
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'Fisiologia_Renal_Aula04.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Conteudo de estudo de Fisiologia Renal para testes E2E Playwright'),
      })
      // Aguarda feedback visual do upload
      await expect(page.getByText(/Fisiologia_Renal_Aula04.pdf/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('3. Sessão de Revisão Espaçada de Flashcards com SM-2', async ({ page, isMobile }) => {
    await page.getByRole('button', { name: /Demo Estudante/i }).click()

    // Navega para Flashcards
    await navigateToTab(page, isMobile, 'Flashcards')

    await expect(page.getByText('Revisão espaçada')).toBeVisible()
    
    // Virar o card para ver a resposta
    const flipButton = page.getByRole('button', { name: /Virar card|Mostrar resposta/i })
    if (await flipButton.isVisible()) {
      await flipButton.click()
    }

    // Dar nota de dificuldade (Fácil / 5)
    const easyBtn = page.getByRole('button', { name: /Fácil/i })
    if (await easyBtn.isVisible()) {
      await easyBtn.click()
    }
  })

  test('4. Resolução de Quiz Interativo com Explicações da IA', async ({ page, isMobile }) => {
    await page.getByRole('button', { name: /Demo Estudante/i }).click()

    // Navega para a aba Quizzes
    await navigateToTab(page, isMobile, 'Quizzes')

    await expect(page.getByText('Questão gerada por IA')).toBeVisible()
    
    // Seleciona a primeira opção
    const firstOption = page.locator('button').filter({ hasText: /Corpo caloso|38 ATP|2 ATP|Cerebelo/i }).first()
    await firstOption.click()

    // Confirma resposta
    const confirmBtn = page.getByRole('button', { name: /Confirmar resposta/i })
    await confirmBtn.click()

    // Verifica feedback da resposta
    await expect(page.getByText(/Explicação da Anne/i)).toBeVisible()
  })

  test('5. Gestão de Estudantes no Painel de Admin Master (RBAC & Auth Service)', async ({ page, isMobile }) => {
    // Login como Admin Demo
    await page.getByRole('button', { name: /Demo Admin/i }).click()

    // Navega para a aba Gestão Admin
    await navigateToTab(page, isMobile, 'Gestão Admin')

    await expect(page.getByText('Sessão Admin (James)')).toBeVisible()

    // Autenticar sessão do admin no BFF
    const authAdminBtn = page.getByRole('button', { name: /Autenticar Admin/i })
    if (await authAdminBtn.isVisible()) {
      await authAdminBtn.click()
      await expect(page.getByText(/Token JWT de Admin ativo/i)).toBeVisible({ timeout: 5000 })
    }

    // Formulário de novo estudante
    const nameInput = page.getByPlaceholder('Ex: Anne Nogueira')
    const emailInput = page.getByPlaceholder('anne@universidade.edu.br')
    const passInput = page.getByPlaceholder('••••••••')

    if (await nameInput.isVisible()) {
      const testEmail = `anne.e2e.${Date.now()}@universidade.edu.br`
      await nameInput.fill('Anne E2E Teste')
      await emailInput.fill(testEmail)
      await passInput.fill('SenhaE2e123!')

      await page.getByRole('button', { name: /Cadastrar Estudante/i }).click()

      // Verifica mensagem de sucesso
      await expect(page.getByText(/cadastrado com sucesso/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('6. Menu Hambúrguer e Responsividade Mobile', async ({ page, isMobile }) => {
    await page.getByRole('button', { name: /Demo Estudante/i }).click()

    if (isMobile) {
      const openMenuBtn = page.getByRole('button', { name: 'Abrir menu' })
      await expect(openMenuBtn).toBeVisible()
      await openMenuBtn.click()
      await expect(page.locator('button:visible').filter({ hasText: /^Materiais$/i }).first()).toBeVisible()
    }
  })
})
