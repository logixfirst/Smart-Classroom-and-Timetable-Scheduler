'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Variant {
  id: string
  name: string
  score: number
  conflicts: number
  faculty_satisfaction: number
  room_utilization: number
  compactness_score: number
  workload_balance: number
  generation_time: number
}

export default function CompareVariantsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api'
  const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001'

  useEffect(() => {
    fetchVariants()
  }, [jobId])

  const fetchVariants = async () => {
    try {
      const res = await fetch(`${FASTAPI_BASE}/api/variants/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setVariants(data.variants || [])
      } else {
        alert('Failed to load variants')
      }
    } catch (err) {
      console.error('Failed to fetch variants:', err)
      alert('Failed to load variants')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to select this variant? This will be the final timetable.')) {
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/generation-jobs/${jobId}/select-variant/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ variant_id: variantId })
      })

      if (res.ok) {
        router.push(`/admin/timetables/${jobId}/review`)
      } else {
        alert('Failed to select variant')
      }
    } catch (err) {
      console.error('Failed to select variant:', err)
      alert('Failed to select variant')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compare Timetable Variants</h1>
          <p className="text-gray-600 mt-1">
            Select the best variant based on quality metrics
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-600">No variants available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`card p-6 space-y-4 cursor-pointer transition-all ${
                selectedVariant === variant.id
                  ? 'ring-2 ring-blue-600 shadow-lg'
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedVariant(variant.id)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{variant.name}</h3>
                {variant.conflicts === 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Zero Conflicts
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <MetricBar
                  label="Overall Score"
                  value={variant.score}
                  max={100}
                  color="blue"
                />
                <MetricBar
                  label="Faculty Satisfaction"
                  value={variant.faculty_satisfaction}
                  max={100}
                  color="green"
                />
                <MetricBar
                  label="Room Utilization"
                  value={variant.room_utilization}
                  max={100}
                  color="purple"
                />
                <MetricBar
                  label="Compactness"
                  value={variant.compactness_score}
                  max={100}
                  color="orange"
                />
                <MetricBar
                  label="Workload Balance"
                  value={variant.workload_balance}
                  max={100}
                  color="pink"
                />
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Conflicts:</span>
                  <span className={variant.conflicts === 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                    {variant.conflicts}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Generation Time:</span>
                  <span>{variant.generation_time.toFixed(1)}s</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectVariant(variant.id)
                }}
                disabled={submitting}
                className={`w-full py-2 rounded font-medium transition-colors ${
                  selectedVariant === variant.id
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting ? 'Selecting...' : 'Select This Variant'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = (value / max) * 100
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    pink: 'bg-pink-600'
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
