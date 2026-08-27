const STORAGE_KEY = 'pauta.token'

/**
 * Onde o JWT mora no navegador.
 *
 * Escolha consciente: `localStorage` é legível por JavaScript, então um XSS levaria o
 * token junto. O alternativo — cookie httpOnly — exige o mesmo domínio ou CORS com
 * credenciais mais proteção CSRF, e o app mobile depois precisaria de outro caminho de
 * qualquer forma. Para uma ferramenta pessoal, o custo de complexidade não se paga.
 * Está isolado neste módulo justamente para que trocar isso seja mexer num arquivo só.
 *
 * Os try/catch existem porque o acesso ao storage lança em janela anônima e com
 * cookies de site bloqueados — o app precisa continuar de pé, só deslogado.
 */
export function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Sessão só em memória: o app funciona até fechar a aba.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada a fazer — já não há token acessível.
  }
}
