import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupplyData(filtros = {}) {
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
      let qPedidos = supabase
        .from('pedidos_abertos')
        .select('*')
        .order('prioridade', { ascending: true })
        .order('data_embarque', { ascending: true })

      let qNfs = supabase
        .from('nfs_entrada')
        .select('*')
        .order('data_recebimento', { ascending: false })

      // Filtros de data
      if (filtros.dataInicio) {
        qPedidos = qPedidos.gte('data_pedido', filtros.dataInicio)
        qNfs = qNfs.gte('data_recebimento', filtros.dataInicio)
      }
      if (filtros.dataFim) {
        qPedidos = qPedidos.lte('data_pedido', filtros.dataFim)
        qNfs = qNfs.lte('data_recebimento', filtros.dataFim)
      }

      const [{ data: p, error: ep }, { data: n, error: en }, { data: a }] =
        await Promise.all([
          qPedidos,
          qNfs,
          supabase.from('alertas_multa').select('*').order('criado_em', { ascending: false }),
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
  }, [filtros.dataInicio, filtros.dataFim])

  useEffect(() => { load() }, [load])

  return { pedidos, nfs, alertasMulta, loading, error, lastSync, reload: load }
}
