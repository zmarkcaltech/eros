'use client'

interface Territory {
  id: string
  name: string
  display_order: number
  category: string
  depth_filter: string | null
  points_to_capture: number
  visual_theme: {
    color: string
    icon: string
    gradient: string[]
  }
  description: string
}

interface TerritoryProgress {
  total_points: number
  questions_answered: number
  status: 'locked' | 'available' | 'in_progress' | 'captured'
  captured_at: string | null
  ai_insight: string | null
}

interface Props {
  territory: Territory
  progress?: TerritoryProgress
  onClick: () => void
}

export default function TerritoryCard({ territory, progress, onClick }: Props) {
  const { visual_theme, name, description, points_to_capture } = territory
  const totalPoints = progress?.total_points || 0
  const status = progress?.status || 'available'
  const progressPercent = Math.min((totalPoints / points_to_capture) * 100, 100)

  // Status styling
  const statusConfig = {
    available: {
      border: 'border-gray-300',
      bg: 'bg-white hover:bg-gray-50',
      badge: 'bg-blue-100 text-blue-800',
      badgeText: 'Available'
    },
    in_progress: {
      border: 'border-purple-400',
      bg: 'bg-white hover:bg-purple-50',
      badge: 'bg-purple-100 text-purple-800',
      badgeText: 'In Progress'
    },
    captured: {
      border: 'border-yellow-400',
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-100 hover:from-yellow-100 hover:to-amber-200',
      badge: 'bg-yellow-400 text-yellow-900',
      badgeText: '✓ Captured'
    },
    locked: {
      border: 'border-gray-200',
      bg: 'bg-gray-100',
      badge: 'bg-gray-200 text-gray-600',
      badgeText: 'Locked'
    }
  }

  const config = statusConfig[status]

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl border-2 ${config.border} ${config.bg}
        p-6 cursor-pointer transition-all duration-300
        shadow-md hover:shadow-xl transform hover:-translate-y-1
        ${status === 'in_progress' ? 'animate-pulse-slow' : ''}
        ${status === 'captured' ? 'ring-2 ring-yellow-300' : ''}
      `}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <span className={`${config.badge} px-3 py-1 rounded-full text-xs font-semibold`}>
          {config.badgeText}
        </span>
      </div>

      {/* Territory Icon */}
      <div className="text-6xl mb-4" style={{ filter: status === 'captured' ? 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.5))' : 'none' }}>
        {visual_theme.icon}
      </div>

      {/* Territory Name */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span className="font-semibold">{totalPoints}/{points_to_capture} pts</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(to right, ${visual_theme.gradient[0]}, ${visual_theme.gradient[1]})`
            }}
          />
        </div>
      </div>

      {/* Questions Answered */}
      <div className="text-xs text-gray-500">
        {progress?.questions_answered || 0} questions answered
      </div>

      {/* Captured Flag */}
      {status === 'captured' && (
        <div className="absolute -top-2 -right-2 text-4xl animate-bounce">
          🏁
        </div>
      )}
    </div>
  )
}
