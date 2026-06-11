'use client'

import { useRouter } from 'next/navigation'

interface Territory {
  id: string
  name: string
  display_order: number
  visual_theme: {
    color: string
    icon: string
    gradient: string[]
  }
}

interface TerritoryProgress {
  status: 'locked' | 'available' | 'in_progress' | 'captured'
}

interface Props {
  territories: Territory[]
  progress: Record<string, TerritoryProgress>
  currentTerritoryId: string
}

export default function MiniMap({ territories, progress, currentTerritoryId }: Props) {
  const router = useRouter()

  const handleTerritoryClick = (territoryId: string) => {
    if (territoryId !== currentTerritoryId) {
      router.push(`/lovemaps/territories/${territoryId}`)
    }
  }

  return (
    <div className="p-4 overflow-x-auto">
      <div className="flex items-center gap-3 min-w-max">
        <div className="text-sm font-semibold text-gray-600 whitespace-nowrap">Quick Travel:</div>
        <div className="flex gap-2">
          {territories.map(territory => {
            const territoryProgress = progress[territory.id]
            const status = territoryProgress?.status || 'available'
            const isCurrent = territory.id === currentTerritoryId

            return (
              <button
                key={territory.id}
                onClick={() => handleTerritoryClick(territory.id)}
                className={`
                  relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                  ${isCurrent
                    ? 'border-purple-500 bg-purple-100 ring-2 ring-purple-300'
                    : status === 'captured'
                    ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100'
                    : status === 'in_progress'
                    ? 'border-purple-300 bg-white hover:bg-purple-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                  }
                `}
                title={territory.name}
              >
                <span className="text-2xl">{territory.visual_theme.icon}</span>
                <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate">
                  {territory.name}
                </span>

                {/* Status Indicator */}
                {status === 'captured' && (
                  <div className="absolute -top-1 -right-1 text-sm">
                    ✓
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => router.push('/lovemaps')}
          className="ml-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          View Full Map
        </button>
      </div>
    </div>
  )
}
