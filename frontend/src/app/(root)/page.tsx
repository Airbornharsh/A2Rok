'use client'
import { useEffect, useMemo, useState } from 'react'
import { AxiosClient } from '@/utils/axios'

type Limit = { total: number; used: number }

export default function Home() {
  const [limit, setLimit] = useState<Limit>({ total: 0, used: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const remaining = useMemo(
    () => Math.max(0, (limit?.total || 0) - (limit?.used || 0)),
    [limit],
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await AxiosClient.get('/api/v1/auth/user')
        const serverLimit = res.data?.data?.user?.limit || { total: 0, used: 0 }
        setLimit(serverLimit)
      } catch (e: any) {
        setError(e?.message || 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allowedTotals = [1000, 2000, 5000]
  const nextOptions = allowedTotals.filter((t) => t > (limit?.total || 0))
  const canIncrease = remaining >= 100 && nextOptions.length > 0

  const onIncrease = async (newTotal: number) => {
    try {
      setUpdating(true)
      setError(null)
      const res = await AxiosClient.post('/api/v1/auth/limit', {
        total: newTotal,
      })
      const data = res.data?.data
      setLimit({
        total: data?.total ?? newTotal,
        used: data?.used ?? limit.used,
      })
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage & Limits</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your request quota. You can increase when remaining ≥ 100.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 p-4">
          {loading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Used</span>
                <span className="font-medium text-zinc-200">{limit.used}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total</span>
                <span className="font-medium text-zinc-200">{limit.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Remaining</span>
                <span
                  className={`font-medium ${remaining < 100 ? 'text-yellow-400' : 'text-zinc-200'}`}
                >
                  {remaining}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-zinc-400">Increase total to:</div>
                <div className="flex flex-wrap gap-2">
                  {nextOptions.map((opt) => (
                    <button
                      key={opt}
                      disabled={!canIncrease || updating}
                      onClick={() => onIncrease(opt)}
                      className={`rounded-md px-3 py-1 text-sm ${
                        canIncrease && !updating
                          ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          : 'cursor-not-allowed bg-zinc-900 text-zinc-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {!canIncrease && (
                  <div className="mt-2 text-xs text-zinc-500">
                    You can increase only when remaining is at least 100.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
