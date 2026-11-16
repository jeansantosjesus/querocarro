import type { Periodicity, Reliability } from '../../types/estimate'

import type { ValueOrigin } from '../../types/vehicle'

export const ORIGIN_LABEL: Record<ValueOrigin, string> = {
  fipe_online: 'FIPE (consulta online)',

  fipe_referencia_salva: 'FIPE (referência salva)',

  estimativa_demonstrativa: 'Estimativa demonstrativa do QC',

  premissa_configuravel: 'Premissa configurável do QC',

  informado_usuario: 'Informado por você',

  calculado: 'Calculado pelo QC',
}

export const PERIODICITY_LABEL: Record<Periodicity, string> = {
  mensal: 'Mensal',

  anual: 'Anual (dividido por 12)',

  unico: 'Valor único',

  por_km: 'Por km',
}

export const RELIABILITY_LABEL: Record<Reliability, string> = {
  alta: 'Alta',

  media: 'Média',

  baixa: 'Baixa',
}
