import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupplyData() {
  const [pedidos, setPedidos] = useState([])
  const [nfs, setNfs] = useState([])
  const [alertasMulta, setAlertasMulta] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: p, error: ep }, { data: n, error: en }, { data: a }] =
        await Promise.all([
          supabase
            .from('pedidos_abertos')
            .select('*')
            .order('prioridade', { ascending: true })
            .order('data_embarque', { ascending: true }),
          supabase
            .from('nfs_entrada')
            .select('*')
            .order('data_recebimento', { ascending: false }),
          supabase
            .from('alertas_multa')
            .select('*')
            .order('criado_em', { ascending: false }),
        ])

      if (ep) throw ep
      if (en) throw en

      setPedidos(p || [])
      setNfs(n || [])
      setAlertasMulta(a || [])
      setLastSync(new Date())
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { pedidos, nfs, alertasMulta, loading, error, lastSync, reload: load }
}
