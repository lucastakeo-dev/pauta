import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export type ConnectionState = 'offline' | 'salvando' | 'lendo' | 'ok'

/**
 * O que o app está fazendo com o servidor agora.
 *
 * A escrita é otimista em quase toda ação: a tela muda antes da resposta chegar. O
 * rodapé é onde essa dívida fica visível — "salvando" enquanto há escrita em voo,
 * "sem conexão" quando não há para onde mandar. Sem isso, "aplicado" e "salvo" são
 * indistinguíveis até algo dar errado.
 */
export function useConnection(): ConnectionState {
  const buscando = useIsFetching()
  const escrevendo = useIsMutating()
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const ligou = () => setOnline(true)
    const caiu = () => setOnline(false)

    window.addEventListener('online', ligou)
    window.addEventListener('offline', caiu)

    return () => {
      window.removeEventListener('online', ligou)
      window.removeEventListener('offline', caiu)
    }
  }, [])

  if (!online) return 'offline'
  if (escrevendo > 0) return 'salvando'
  if (buscando > 0) return 'lendo'

  return 'ok'
}
