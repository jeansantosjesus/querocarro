import { SEATS_FIT, TRUNK_REQUIRED_LITERS, USAGE_CATEGORY_FIT } from '../../config/fit'

import type { SimulationInput } from '../../schemas/simulation'

import type { Vehicle } from '../../types/vehicle'

import { clamp } from '../../utils/stats'

import { brandMatches, isRecentVehicle } from './filters'



function average(values: number[]): number | null {

if (values.length === 0) return null

return values.reduce((sum, value) => sum + value, 0) / values.length

}



/**

* Aderência ao tipo de uso (0-100): média dos subíndices disponíveis

* (lugares, porta-malas, categoria x tipo de uso).

* Retorna null se nenhum subíndice puder ser calculado (nunca assume zero).

*/

export function calculateUsageFit(

vehicle: Vehicle,

usage: SimulationInput['usage'],

): number | null {

const parts: number[] = []



if (vehicle.seats !== null) {

const extra = Math.max(vehicle.seats - usage.passengers, 0)

parts.push(clamp(SEATS_FIT.base + SEATS_FIT.perExtraSeat * extra, 0, 100))

}

if (vehicle.trunkLiters !== null) {

const required = TRUNK_REQUIRED_LITERS[usage.trunkNeed]

parts.push(clamp((vehicle.trunkLiters / required) * 100, 0, 100))

}

if (vehicle.category !== null) {

parts.push(USAGE_CATEGORY_FIT[usage.type][vehicle.category])

}

return average(parts)

}



/**

* Atendimento às preferências (0-100): média das preferências efetivamente informadas.

* Retorna null quando o usuário não informou nenhuma preferência aplicável

* (critério "não aplicável"; não é tratado como zero nem como 100).

*/

export function calculatePreferenceScore(

vehicle: Vehicle,

input: Pick<SimulationInput, 'objective' | 'preferences'>,

referenceYear: number,

): number | null {

const { preferences, objective } = input

const parts: number[] = []



if (preferences.wantedBrands.length > 0) {

parts.push(brandMatches(vehicle.brand, preferences.wantedBrands) ? 100 : 0)

}

if (preferences.fuel !== 'indiferente' && vehicle.fuel !== null) {

const matches =

vehicle.fuel === preferences.fuel ||

(vehicle.fuel === 'flex' &&

(preferences.fuel === 'gasolina' || preferences.fuel === 'etanol'))

parts.push(matches ? 100 : 0)

}

if (preferences.transmission !== 'indiferente' && vehicle.transmission !== null) {

parts.push(vehicle.transmission === preferences.transmission ? 100 : 0)

}

if (objective.condition !== 'indiferente') {

const recent = isRecentVehicle(vehicle, referenceYear)

parts.push((objective.condition === 'novo') === recent ? 100 : 0)

}

return average(parts)

}
