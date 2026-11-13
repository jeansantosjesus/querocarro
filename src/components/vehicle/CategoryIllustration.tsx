import type { VehicleCategory } from '../../types/vehicle'

interface Shape {
  body: string
  windows: string
}

/** Silhuetas simples (vista lateral). Não representam nenhum modelo específico. */
const SHAPES: Record<VehicleCategory, Shape> = {
  hatch: {
    body: 'M28 104 L28 82 Q28 72 44 70 L92 64 Q112 36 142 34 L198 34 Q224 36 240 62 L284 70 Q296 74 296 88 L296 104 Z',
    windows: 'M104 62 Q118 44 142 42 L196 42 Q214 44 226 62 Z',
  },
  sedan: {
    body: 'M16 104 L16 86 Q16 78 32 76 L102 68 L126 44 Q131 40 141 40 L196 40 Q206 40 213 46 L234 68 L296 74 Q310 78 310 90 L310 104 Z',
    windows: 'M112 66 L132 48 L194 48 L220 66 Z',
  },
  suv: {
    body: 'M24 104 L24 74 Q24 64 40 62 L82 58 L106 32 Q111 28 121 28 L226 28 Q236 30 246 50 L286 60 Q300 64 300 78 L300 104 Z',
    windows: 'M96 56 L114 38 L224 38 L238 56 Z',
  },
  picape: {
    body: 'M18 104 L18 80 Q18 72 34 70 L92 66 L116 40 Q121 36 131 36 L176 36 Q186 38 191 54 L193 66 L302 66 Q310 66 310 74 L310 104 Z',
    windows: 'M104 64 L122 46 L174 46 L180 64 Z',
  },
  minivan: {
    body: 'M18 104 L18 72 Q18 60 40 56 L92 34 Q102 30 114 30 L242 30 Q258 32 264 52 L292 64 Q304 70 304 82 L304 104 Z',
    windows: 'M96 54 L112 40 L240 40 L252 56 Z',
  },
}

interface CategoryIllustrationProps {
  category: VehicleCategory | null
  className?: string
}

/** Ilustração decorativa da categoria (sem texto alternativo: a legenda fica ao lado). */
export function CategoryIllustration({ category, className }: CategoryIllustrationProps) {
  const shape = SHAPES[category ?? 'hatch']
  return (
    <svg
      viewBox="0 0 330 140"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
    >
      <rect x="10" y="118" width="310" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
      <path d={shape.body} fill="currentColor" opacity="0.8" />
      <path d={shape.windows} fill="#fff" opacity="0.75" />
      {[90, 244].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="104" r="19" fill="#1f2937" />
          <circle cx={cx} cy="104" r="8" fill="#e5e7eb" />
        </g>
      ))}
    </svg>
  )
}
