import { useCallback, useState } from 'react'

/**
 * Conjunto de ids que sobrevive à navegação e ao recarregar.
 *
 * Nasceu da árvore de projetos: ela é remontada a cada troca de tela, e sem isto o que
 * a pessoa recolheu voltava aberto toda vez. Estado de interface como este não é dado
 * de servidor — é preferência de quem está olhando, e vale só naquele navegador.
 *
 * Toda leitura e escrita é protegida: em aba anônima, com dados de site bloqueados ou
 * na captura de miniatura, o próprio acesso ao `localStorage` lança.
 */
export function usePersistentSet(key: string): [ReadonlySet<string>, (id: string) => void] {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => ler(key))

  const alternar = useCallback(
    (id: string) => {
      setIds((atuais) => {
        const proximo = new Set(atuais)
        if (proximo.has(id)) proximo.delete(id)
        else proximo.add(id)

        gravar(key, proximo)
        return proximo
      })
    },
    [key],
  )

  return [ids, alternar]
}

/**
 * Um liga/desliga que sobrevive ao recarregar — o painel do menu aberto ou recolhido.
 *
 * Mesmo raciocínio do conjunto acima: é preferência de quem está olhando, não dado de
 * servidor. Recolher o painel e reencontrá-lo aberto na tela seguinte seria trabalho
 * refeito a cada navegação.
 */
export function usePersistentFlag(key: string, padrao: boolean): [boolean, () => void] {
  const [ligado, setLigado] = useState(() => lerFlag(key, padrao))

  const alternar = useCallback(() => {
    setLigado((atual) => {
      const proximo = !atual
      gravarJson(key, proximo)
      return proximo
    })
  }, [key])

  return [ligado, alternar]
}

function lerFlag(key: string, padrao: boolean): boolean {
  try {
    const bruto = window.localStorage.getItem(key)
    return bruto === null ? padrao : bruto === 'true'
  } catch {
    return padrao
  }
}

function ler(key: string): ReadonlySet<string> {
  try {
    const bruto = window.localStorage.getItem(key)
    if (!bruto) return new Set()

    const valor: unknown = JSON.parse(bruto)
    return Array.isArray(valor) ? new Set(valor.filter((x) => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function gravar(key: string, ids: ReadonlySet<string>): void {
  gravarJson(key, [...ids])
}

function gravarJson(key: string, valor: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(valor))
  } catch {
    // Não poder lembrar a preferência não é motivo para quebrar a tela.
  }
}
