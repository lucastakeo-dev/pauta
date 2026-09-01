import { useCallback, useState } from 'react'

/**
 * A cor principal do app.
 *
 * O que a escolha troca é o **matiz** do acento — a claridade e o croma de cada degrau
 * continuam sendo os do sistema, definidos no CSS. É o que garante que nenhuma escolha
 * quebre o contraste: no tema claro o acento precisa passar de 4,5:1 sobre branco, e
 * quem decide isso é a claridade, não o matiz.
 *
 * O matiz de cada uma vive no CSS, junto dos tokens; aqui ele existe de novo só para a
 * **amostra** do menu. E a amostra é montada com a claridade do tema atual
 * (`--accent-l`), não com um valor bonito fixo: no claro o acento é mais escuro, e uma
 * bolinha viva prometendo laranja para entregar terracota seria propaganda enganosa.
 */
export type Accent = {
  key: string
  label: string
  hue: number
  /** Multiplicador de croma. Só o grafite foge de 1. */
  chroma: number
}

export const ACCENTS: Accent[] = [
  { key: 'laranja', label: 'Laranja', hue: 55, chroma: 1 },
  { key: 'vermelho', label: 'Vermelho', hue: 25, chroma: 1 },
  { key: 'azul', label: 'Azul', hue: 255, chroma: 1 },
  { key: 'verde', label: 'Verde', hue: 150, chroma: 1 },
  { key: 'ambar', label: 'Âmbar', hue: 85, chroma: 1 },
  { key: 'roxo', label: 'Roxo', hue: 285, chroma: 1 },
  { key: 'grafite', label: 'Grafite', hue: 285, chroma: 0.1 },
  { key: 'rosa', label: 'Rosa', hue: 350, chroma: 1 },
]

/** A cor da amostra, no tema em que ela está sendo desenhada. */
export function accentSwatch(accent: Accent): string {
  return `oklch(var(--accent-l) calc(0.18 * ${accent.chroma}) ${accent.hue})`
}

/** O acento de fábrica. É o íris que o app sempre teve. */
export const DEFAULT_ACCENT = 'roxo'

/** A mesma chave lida pelo script embutido no `index.html`. Mudar aqui exige mudar lá. */
export const ACCENT_KEY = 'pauta.accent'

const CLASSES = ACCENTS.map((accent) => `accent-${accent.key}`)

/**
 * Lê e troca a cor principal.
 *
 * Igual ao tema, a verdade mora na classe do `<html>`: o `index.html` a aplica antes do
 * primeiro pixel, e ler dela evita divergir do que já está na tela caso o
 * `localStorage` falhe.
 */
export function useAccent(): [string, (key: string) => void] {
  const [accent, setAccent] = useState<string>(() => ler())

  const escolher = useCallback((proximo: string) => {
    aplicar(proximo)
    gravar(proximo)
    setAccent(proximo)
  }, [])

  return [accent, escolher]
}

function ler(): string {
  const encontrada = ACCENTS.find((accent) =>
    document.documentElement.classList.contains(`accent-${accent.key}`),
  )

  return encontrada?.key ?? DEFAULT_ACCENT
}

function aplicar(key: string): void {
  // Remove todas antes de pôr a nova: duas classes de acento no mesmo elemento fariam
  // a ordem do CSS decidir a cor, e não a escolha.
  document.documentElement.classList.remove(...CLASSES)
  document.documentElement.classList.add(`accent-${key}`)
}

function gravar(key: string): void {
  try {
    window.localStorage.setItem(ACCENT_KEY, key)
  } catch {
    // Não poder lembrar a preferência não é motivo para quebrar a tela.
  }
}
