import { useState } from 'react'
import { CategoryIllustration } from '../../../components/vehicle/CategoryIllustration'
import { CATEGORY_LABEL } from '../../../config/categoryLabels'
import type { Vehicle } from '../../../types/vehicle'
import { useVehicleImage, useVehicleImagesSettings } from './imagesContext'

type PhotoVehicle = Pick<Vehicle, 'brand' | 'model' | 'modelYear' | 'category'>

interface VehiclePhotoProps {
  vehicle: PhotoVehicle
  className?: string
}

const FRAME = 'aspect-[16/9] w-full overflow-hidden rounded-xl bg-ink-100'

/**
 * Foto ilustrativa do veículo (Wikimedia Commons) com crédito e licença.
 * Sem foto, mostra uma ilustração genérica da categoria. O quadro tem proporção fixa para
 * que todos os cartões do grupo tenham o mesmo peso visual e não haja salto de layout.
 */
export function VehiclePhoto({ vehicle, className }: VehiclePhotoProps) {
  const { status, image } = useVehicleImage(vehicle)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const name = `${vehicle.brand} ${vehicle.model}`
  const showPhoto = status === 'ready' && image !== null && image.url !== failedUrl

  return (
    <figure className={className}>
      <div className={FRAME}>
        {showPhoto ? (
          <img
            src={image.url}
            alt={`Foto ilustrativa de ${name}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="size-full object-cover"
            onError={() => setFailedUrl(image.url)}
          />
        ) : status === 'loading' ? (
          <div className="size-full animate-pulse bg-ink-200 motion-reduce:animate-none" />
        ) : (
          <div className="flex size-full items-center justify-center p-4 text-brand-700">
            <CategoryIllustration category={vehicle.category} className="h-full max-h-40 w-auto" />
          </div>
        )}
      </div>
      <figcaption className="mt-1 min-h-[2.25rem] text-xs text-ink-600">
        {showPhoto ? (
          <>
            Foto: {image.author || 'autor não informado'} · {image.license} ·{' '}
            <a href={image.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Wikimedia Commons
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            . Imagem ilustrativa: pode ser de outra versão ou ano.
          </>
        ) : status === 'loading' ? (
          'Buscando foto…'
        ) : (
          <>
            Ilustração genérica
            {vehicle.category ? ` (${CATEGORY_LABEL[vehicle.category]})` : ''}: não representa este
            modelo.
          </>
        )}
      </figcaption>
    </figure>
  )
}

/** Controle para o usuário ligar ou desligar o carregamento de fotos externas. */
export function VehiclePhotosToggle() {
  const { available, enabled, setEnabled } = useVehicleImagesSettings()
  if (!available) return null
  return (
    <label className="no-print flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-5"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
      />
      <span>
        Mostrar fotos dos carros
        <span className="block text-xs text-ink-600">
          Carrega imagens da Wikimedia Commons. Só marca e modelo são consultados; o seu endereço IP
          fica visível para a Wikimedia.
        </span>
      </span>
    </label>
  )
}
