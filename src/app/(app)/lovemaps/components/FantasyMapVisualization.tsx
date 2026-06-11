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
  id: string
  territory_id: string
  total_points: number
  questions_answered: number
  status: 'locked' | 'available' | 'in_progress' | 'captured'
  captured_at: string | null
  ai_insight: string | null
}

interface Props {
  territories: Territory[]
  progress: Record<string, TerritoryProgress>
  onTerritoryClick: (territory: Territory) => void
}

export default function FantasyMapVisualization({ territories, progress, onTerritoryClick }: Props) {
  // Define territories with shared boundaries (like Risk board)
  // Coordinates carefully designed so adjacent territories share exact edge points
  const territoryData: Record<number, {
    path: string
    iconX: number
    iconY: number
    labelX: number
    labelY: number
  }> = {
    // Top row - northern territories
    1: { // Daily Rituals ☕ - northwest corner
      path: "M 5 15 L 5 5 L 28 5 L 28 15 Q 26 20, 22 22 L 15 22 Q 10 20, 5 15 Z",
      iconX: 16, iconY: 13,
      labelX: 16, labelY: 18
    },
    2: { // Morning & Evening 🌅 - north center
      path: "M 28 5 L 50 5 L 50 15 Q 48 20, 44 22 L 28 22 L 28 15 L 28 5 Z",
      iconX: 39, iconY: 13,
      labelX: 39, labelY: 18
    },
    3: { // Stress Mountains ⛰️ - northeast (mountainous)
      path: "M 50 5 L 72 5 L 72 15 L 70 18 L 65 22 L 56 22 Q 52 20, 50 15 L 50 5 Z",
      iconX: 61, iconY: 13,
      labelX: 61, labelY: 18
    },

    // Middle-upper row
    10: { // Conflict Canyon 🏜️ - west side
      path: "M 5 15 Q 10 20, 15 22 L 22 22 L 22 35 L 15 38 Q 10 36, 5 32 L 5 15 Z",
      iconX: 13, iconY: 28,
      labelX: 13, labelY: 33
    },
    11: { // Repair Harbor ⚓ - center-west (coastal harbor)
      path: "M 22 22 Q 26 20, 28 15 L 28 22 L 44 22 L 44 35 L 28 35 L 22 35 L 22 22 Z",
      iconX: 33, iconY: 28,
      labelX: 33, labelY: 33
    },
    12: { // Humor Hills 🎭 - center (hills)
      path: "M 44 22 Q 48 20, 50 15 L 50 22 L 56 22 L 60 28 L 60 35 L 44 35 L 44 22 Z",
      iconX: 52, iconY: 28,
      labelX: 52, labelY: 33
    },
    4: { // Support Valley 🏞️ - east side (valley)
      path: "M 56 22 L 65 22 L 70 18 L 72 15 L 72 32 Q 68 36, 64 38 L 60 35 L 60 28 L 56 22 Z",
      iconX: 66, iconY: 28,
      labelX: 66, labelY: 33
    },

    // Middle-lower row
    9: { // Identity Peaks ⛰️ - southwest mountains
      path: "M 5 32 Q 10 36, 15 38 L 22 38 L 22 52 L 15 55 Q 10 53, 5 48 L 5 32 Z",
      iconX: 13, iconY: 45,
      labelX: 13, labelY: 50
    },
    8: { // Dream Plains 🌾 - south-center (plains)
      path: "M 15 38 L 22 35 L 28 35 L 44 35 L 44 52 L 28 52 L 22 52 L 15 55 L 15 38 Z",
      iconX: 29, iconY: 43,
      labelX: 29, labelY: 48
    },
    7: { // Memory Lane 🛤️ - south-east
      path: "M 44 35 L 60 35 L 64 38 L 64 52 L 56 55 L 44 52 L 44 35 Z",
      iconX: 54, iconY: 43,
      labelX: 54, labelY: 48
    },
    5: { // Romance Ridge 🌹 - east coast
      path: "M 60 35 L 64 38 Q 68 36, 72 32 L 72 48 Q 68 52, 64 54 L 64 52 L 60 35 Z",
      iconX: 68, iconY: 43,
      labelX: 68, labelY: 48
    },

    // Bottom row
    6: { // Intimacy Isle 🏝️ - island in the south (separated by water)
      path: "M 48 62 Q 52 60, 56 62 Q 58 65, 58 68 Q 56 72, 52 73 Q 48 72, 46 68 Q 46 65, 48 62 Z",
      iconX: 52, iconY: 67,
      labelX: 52, labelY: 71
    }
  }

  return (
    <div
      className="relative rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-900"
      style={{
        height: '700px',
        background: 'linear-gradient(135deg, #f5e6d3 0%, #e8d4b8 50%, #d4c4a8 100%)',
      }}
    >
      {/* Parchment texture overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3CfeColorMatrix values='0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Map Title - Ornate */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center">
        <div className="bg-amber-100/90 backdrop-blur-sm px-6 py-3 rounded border-2 border-amber-900 shadow-lg">
          <h1 className="text-3xl font-bold text-amber-900" style={{ fontFamily: 'Georgia, serif' }}>
            The Love Map
          </h1>
          <p className="text-xs text-amber-800 mt-1 italic">Territories of the Heart</p>
        </div>
      </div>

      {/* Compass Rose */}
      <div className="absolute top-20 right-8 z-20">
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="28" fill="#f5e6d3" stroke="#8B4513" strokeWidth="1.5"/>
          <circle cx="30" cy="30" r="22" fill="none" stroke="#8B4513" strokeWidth="1"/>
          <path d="M 30 8 L 32 28 L 30 26 L 28 28 Z" fill="#8B4513"/>
          <text x="30" y="6" textAnchor="middle" className="text-xs font-bold" fill="#8B4513">N</text>
          <path d="M 30 52 L 32 32 L 30 34 L 28 32 Z" fill="#666"/>
          <path d="M 52 30 L 32 32 L 34 30 L 32 28 Z" fill="#666"/>
          <path d="M 8 30 L 28 32 L 26 30 L 28 28 Z" fill="#666"/>
        </svg>
      </div>

      {/* Main SVG for map */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          {/* Water pattern */}
          <pattern id="water" width="3" height="3" patternUnits="userSpaceOnUse">
            <path d="M 0 1.5 Q 0.75 1, 1.5 1.5 T 3 1.5" fill="none" stroke="#4A90E2" strokeWidth="0.1" opacity="0.4"/>
          </pattern>

          {/* Mountain pattern */}
          <pattern id="mountains" width="2" height="2" patternUnits="userSpaceOnUse">
            <path d="M 0 2 L 1 0 L 2 2" fill="none" stroke="#8B7355" strokeWidth="0.15"/>
          </pattern>

          {/* Forest pattern */}
          <pattern id="forest" width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.4" fill="#2D5016" opacity="0.3"/>
          </pattern>

          {/* Territory gradients */}
          {territories.map((territory) => {
            const progData = progress[territory.id]
            const status = progData?.status || 'available'
            const gradient = territory.visual_theme.gradient

            return (
              <linearGradient key={territory.id} id={`gradient-${territory.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradient[0]} stopOpacity={status === 'captured' ? '0.8' : '0.5'} />
                <stop offset="100%" stopColor={gradient[1]} stopOpacity={status === 'captured' ? '0.6' : '0.4'} />
              </linearGradient>
            )
          })}
        </defs>

        {/* Ocean - surrounds the landmass */}
        <rect x="0" y="0" width="100" height="100" fill="#6BA3D4" opacity="0.3"/>
        <rect x="0" y="0" width="100" height="100" fill="url(#water)"/>

        {/* Main landmass outline */}
        <path
          d="M 5 5 L 72 5 L 72 15 L 72 32 L 72 48 Q 68 52, 64 54 L 56 55 L 44 52 L 28 52 L 22 52 L 15 55 Q 10 53, 5 48 L 5 32 L 5 15 L 5 5 Z"
          fill="#e8d4b8"
          stroke="#8B6914"
          strokeWidth="0.4"
          opacity="0.3"
        />

        {/* Coastline detail */}
        <path
          d="M 5 5 L 72 5 L 72 15 L 72 32 L 72 48 Q 68 52, 64 54 L 56 55 L 44 52 L 28 52 L 22 52 L 15 55 Q 10 53, 5 48 L 5 32 L 5 15 L 5 5 Z"
          fill="none"
          stroke="#8B6914"
          strokeWidth="0.3"
          strokeDasharray="1,0.5"
          opacity="0.5"
        />

        {/* Rivers */}
        <path d="M 28 15 Q 30 20, 28 25 Q 26 30, 28 35" fill="none" stroke="#4A90E2" strokeWidth="0.4" opacity="0.6"/>
        <path d="M 50 15 Q 52 20, 50 25 Q 48 28, 50 32" fill="none" stroke="#4A90E2" strokeWidth="0.4" opacity="0.6"/>
        <path d="M 44 35 Q 48 40, 50 45" fill="none" stroke="#4A90E2" strokeWidth="0.3" opacity="0.6"/>

        {/* Territory regions with shared boundaries */}
        {territories.map((territory) => {
          const data = territoryData[territory.display_order]
          if (!data) return null

          const progData = progress[territory.id]
          const status = progData?.status || 'available'
          const progressPercent = Math.min(100, ((progData?.total_points || 0) / territory.points_to_capture) * 100)

          return (
            <g key={territory.id}>
              {/* Territory shape */}
              <path
                d={data.path}
                fill={`url(#gradient-${territory.id})`}
                stroke={status === 'captured' ? '#FFD700' : status === 'in_progress' ? '#9333EA' : '#654321'}
                strokeWidth={status === 'captured' ? '0.5' : status === 'in_progress' ? '0.4' : '0.25'}
                strokeDasharray={status === 'in_progress' ? '1,0.3' : 'none'}
                className="cursor-pointer hover:brightness-110 transition-all"
                onClick={() => onTerritoryClick(territory)}
                style={{
                  filter: status === 'captured' ? 'drop-shadow(0 0 2px rgba(255,215,0,0.8))' :
                          status === 'in_progress' ? 'drop-shadow(0 0 1.5px rgba(147,51,234,0.6))' : 'none'
                }}
              >
                <title>{territory.name} - {progData?.total_points || 0}/{territory.points_to_capture} points</title>
              </path>

              {/* Territory icon */}
              <g transform={`translate(${data.iconX}, ${data.iconY})`}>
                <circle
                  r="2.2"
                  fill="white"
                  stroke={status === 'captured' ? '#FFD700' : '#654321'}
                  strokeWidth="0.25"
                  className="cursor-pointer"
                  onClick={() => onTerritoryClick(territory)}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="cursor-pointer select-none"
                  onClick={() => onTerritoryClick(territory)}
                  style={{ fontSize: '3.5px' }}
                >
                  {territory.visual_theme.icon}
                </text>

                {/* Progress ring */}
                {status !== 'captured' && progressPercent > 0 && (
                  <circle
                    r="2.8"
                    fill="none"
                    stroke="#9333EA"
                    strokeWidth="0.35"
                    strokeDasharray={`${progressPercent * 0.176} 17.6`}
                    transform="rotate(-90)"
                    opacity="0.8"
                  />
                )}

                {/* Captured crown */}
                {status === 'captured' && (
                  <text
                    y="-3.2"
                    textAnchor="middle"
                    style={{ fontSize: '2.5px' }}
                  >
                    👑
                  </text>
                )}
              </g>

              {/* Territory name - improved readability */}
              <text
                x={data.labelX}
                y={data.labelY}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fill="#3E2723"
                stroke="#f5e6d3"
                strokeWidth="0.5"
                paintOrder="stroke"
                style={{
                  fontSize: '2.8px',
                  fontFamily: 'Georgia, serif',
                  fontWeight: '700',
                  letterSpacing: '0.02em'
                }}
              >
                {territory.name}
              </text>
            </g>
          )
        })}

        {/* Mountain ranges - decorative terrain on mountainous territories */}
        {/* Stress Mountains (territory 3) */}
        <g opacity="0.4">
          <path d="M 54 10 L 56 7 L 58 10" fill="none" stroke="#8B7355" strokeWidth="0.3"/>
          <path d="M 58 10 L 60 6 L 62 10" fill="none" stroke="#8B7355" strokeWidth="0.3"/>
          <path d="M 62 10 L 64 7 L 66 10" fill="none" stroke="#8B7355" strokeWidth="0.3"/>
          <path d="M 56 14 L 58 11 L 60 14" fill="none" stroke="#8B7355" strokeWidth="0.25"/>
          <path d="M 60 14 L 62 12 L 64 14" fill="none" stroke="#8B7355" strokeWidth="0.25"/>
        </g>

        {/* Identity Peaks (territory 9) */}
        <g opacity="0.4">
          <path d="M 8 40 L 10 37 L 12 40" fill="none" stroke="#8B7355" strokeWidth="0.3"/>
          <path d="M 12 40 L 14 36 L 16 40" fill="none" stroke="#8B7355" strokeWidth="0.3"/>
          <path d="M 9 44 L 11 41 L 13 44" fill="none" stroke="#8B7355" strokeWidth="0.25"/>
          <path d="M 14 44 L 16 42 L 18 44" fill="none" stroke="#8B7355" strokeWidth="0.25"/>
        </g>

        {/* Forest areas - Dream Plains (territory 8) */}
        <g opacity="0.25">
          <circle cx="20" cy="42" r="0.5" fill="#2D5016"/>
          <circle cx="22" cy="43" r="0.6" fill="#2D5016"/>
          <circle cx="24" cy="42.5" r="0.5" fill="#2D5016"/>
          <circle cx="21" cy="44.5" r="0.4" fill="#2D5016"/>
          <circle cx="32" cy="43" r="0.5" fill="#2D5016"/>
          <circle cx="34" cy="44" r="0.6" fill="#2D5016"/>
          <circle cx="36" cy="43.5" r="0.5" fill="#2D5016"/>
        </g>

        {/* Small island features around Intimacy Isle */}
        <ellipse cx="42" cy="68" rx="1.5" ry="1" fill="#e8d4b8" stroke="#8B6914" strokeWidth="0.2" opacity="0.6"/>
        <ellipse cx="62" cy="66" rx="1.2" ry="0.8" fill="#e8d4b8" stroke="#8B6914" strokeWidth="0.2" opacity="0.6"/>

        {/* Harbor detail at Repair Harbor (territory 11) */}
        <path d="M 26 30 Q 24 32, 26 34" fill="none" stroke="#4A90E2" strokeWidth="0.5" opacity="0.5"/>
        <circle cx="26" cy="32" r="1.5" fill="none" stroke="#4A90E2" strokeWidth="0.2" opacity="0.4"/>

        {/* Additional creative details */}
        {/* Decorative clouds */}
        <g opacity="0.15">
          <ellipse cx="18" cy="8" rx="2" ry="1" fill="white"/>
          <ellipse cx="20" cy="8.5" rx="1.5" ry="0.8" fill="white"/>
          <ellipse cx="65" cy="7" rx="2.5" ry="1.2" fill="white"/>
          <ellipse cx="67.5" cy="7.5" rx="1.8" ry="1" fill="white"/>
        </g>

        {/* Sea creatures/decorative elements in ocean */}
        <g opacity="0.2">
          <path d="M 80 60 Q 82 62, 84 60" fill="none" stroke="#4A90E2" strokeWidth="0.3"/>
          <circle cx="82" cy="61" r="0.3" fill="#4A90E2"/>
          <path d="M 15 75 Q 17 77, 19 75" fill="none" stroke="#4A90E2" strokeWidth="0.3"/>
          <circle cx="17" cy="76" r="0.3" fill="#4A90E2"/>
        </g>

        {/* Ancient runes/decorative border elements */}
        <g opacity="0.15" stroke="#8B4513" strokeWidth="0.2" fill="none">
          <circle cx="3" cy="3" r="0.8"/>
          <circle cx="75" cy="3" r="0.8"/>
          <circle cx="3" cy="57" r="0.8"/>
          <circle cx="75" cy="57" r="0.8"/>
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-amber-100/90 backdrop-blur-sm rounded border-2 border-amber-900 p-3 z-20 shadow-lg">
        <div className="text-xs font-bold text-amber-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Legend</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-amber-800 bg-amber-200/40" />
            <span className="text-amber-900">Unexplored</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-purple-600 bg-purple-200/40" />
            <span className="text-amber-900">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-yellow-600 bg-yellow-200/60" />
            <span className="text-amber-900">Conquered</span>
          </div>
        </div>
      </div>
    </div>
  )
}
