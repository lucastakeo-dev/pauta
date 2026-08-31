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

/**
 * Uma escolha entre opções conhecidas, guardada no navegador — a tela do planner.
 *
 * Valida na leitura: valor de uma versão antiga, ou mexido à mão, cai no padrão em vez
 * de deixar a tela num modo que não existe mais.
 */
export function usePersistentChoice<T extends string>(
  key: string,
  opcoes: readonly T[],
  padrao: T,
): [T, (valor: T) => void] {
  const [escolha, setEscolha] = useState<T>(() => lerEscolha(key, opcoes, padrao))

  const escolher = useCallback(
    (valor: T) => {
      gravarJson(key, valor)
      setEscolha(valor)
    },
    [key],
  )

  return [escolha, escolher]
}

function lerEscolha<T extends string>(key: string, opcoes: readonly T[], padrao: T): T {
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(key) ?? '""')
    return opcoes.find((opcao) => opcao === bruto) ?? padrao
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
