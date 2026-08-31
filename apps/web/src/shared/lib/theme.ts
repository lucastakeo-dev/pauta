import { useCallback, useState } from 'react'

export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

/** A mesma chave lida pelo script embutido no `index.html`. Mudar aqui exige mudar lá. */
export const THEME_KEY = 'pauta.theme'

const PADRAO: Theme = 'dark'

/**
 * O tema.
 *
 * Ele mora na classe da tag `<html>`, e não num contexto do React, por dois motivos:
 * o `color-scheme` do CSS precisa dele para pintar barra de rolagem e campos nativos,
 * que não leem os nossos tokens; e o `index.html` o aplica antes do primeiro pixel,
 * o que só é possível fora do React. Aqui a gente só troca e guarda.
 *
 * Guardado como texto puro, sem JSON, para o script embutido caber numa linha.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => ler())

  const escolher = useCallback((proximo: Theme) => {
    aplicar(proximo)
    gravar(proximo)
    setTheme(proximo)
  }, [])

  return [theme, escolher]
}

function ler(): Theme {
  // A classe é a verdade: o `index.html` já a aplicou, e ler dela evita divergir do
  // que está na tela caso o `localStorage` falhe.
  return document.documentElement.classList.contains('light') ? 'light' : PADRAO
}

function aplicar(theme: Theme): void {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function gravar(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Não poder lembrar a preferência não é motivo para quebrar a tela.
  }
}
