import { useCallback, useEffect, useState } from 'react'
import { listMonthTransactions } from '../lib/api'
import type { Tx } from '../lib/supabase'

// A month's transactions, refreshed whenever the app comes back to the foreground.
export function useMonthTransactions(month: Date) {
  const [txs, setTxs] = useState<Tx[]>([])
  const reload = useCallback(() => { listMonthTransactions(month).then(setTxs, console.error) }, [month])

  useEffect(() => {
    reload()
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  return { txs, reload }
}
