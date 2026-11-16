export function vehicleDetailPath(vehicleId: string): string {

return `/veiculo/${encodeURIComponent(vehicleId)}`

}



/** Modalidade "Quero este carro": condições de aquisição para um veículo escolhido. */

export function inverseSimulationPath(vehicleId: string): string {

return `/veiculo/${encodeURIComponent(vehicleId)}/quero-este-carro`

}
