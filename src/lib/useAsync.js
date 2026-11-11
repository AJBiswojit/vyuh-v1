import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Standard data-fetching hook. Every page uses this so the loading / empty /
 * success / error contract is identical across all three workspaces.
 *
 * const { data, error, loading, refresh, setData } = useAsync(() => service.get(), [deps])
 */
export default function useAsync(loader, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const mounted = useRef(true)
  const requestId = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(
    async ({ silent = false } = {}) => {
      requestId.current += 1
      const currentRequest = requestId.current
      if (!silent) setLoading(true)
      setError(null)
      try {
        const result = await loader()
        if (mounted.current && currentRequest === requestId.current) {
          setData(result)
        }
        return result
      } catch (caught) {
        if (mounted.current && currentRequest === requestId.current) {
          setError(caught)
        }
        return null
      } finally {
        if (mounted.current && currentRequest === requestId.current) {
          setLoading(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  useEffect(() => {
    if (immediate) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, refresh: run, setData, reload: () => run({ silent: true }) }
}

/** Mutation helper: tracks pending state and surfaces errors to the caller. */
export function useMutation(fn) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(
    async (...args) => {
      setPending(true)
      setError(null)
      try {
        const result = await fn(...args)
        return result
      } catch (caught) {
        setError(caught)
        throw caught
      } finally {
        setPending(false)
      }
    },
    [fn],
  )

  return { mutate, pending, error, setError }
}
