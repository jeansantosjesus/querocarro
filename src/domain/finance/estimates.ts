import { ASSUMPTIONS_REFERENCE_MONTH, resolveAssumptions } from '../../config/assumptions'
import type { SimulationInput } from '../../schemas/simulation'
import type { RankedVehicle } from '../../types/decision'
import type { EstimateMeta } from '../../types/estimate'
import { formatBRL, formatNumber } from '../../utils/format'
import { resolveScenario } from '../decision/scenarios'

export type CostLineKey =
  | 'price'
  | 'installment'
  | 'ipva'
  | 'licensing'
  | 'insurance'
  | 'maintenance'
  | 'energy'
  | 'depreciation'
  | 'total'

export interface CostLine {
  key: CostLineKey
  /** Valor mensal equivalente (ou valor único, para o preço). null = informação não disponível. */
  amount: number | null
  meta: EstimateMeta
}

/**
 * Monta as linhas de custo de um veículo com os metadados exigidos para toda estimativa:
 * origem, premissa, periodicidade, referência, confiabilidade e se é ajustável.
 */
export function buildCostLines(
  item: RankedVehicle,
  input: SimulationInput,
  referenceMonth: string | null,
): CostLine[] {
  const { costs, vehicle } = item
  const assumptions = resolveAssumptions(input.assumptionOverrides)
  const scenario = resolveScenario(input.objective)
  const priceRef = referenceMonth ?? vehicle.referenceMonth ?? ASSUMPTIONS_REFERENCE_MONTH
  const monthly = (annual: number | null) => (annual === null ? null : annual / 12)
  const insuranceRate =
    vehicle.insuranceCategory === null
      ? null
      : assumptions.insuranceRateByCategoryPct[vehicle.insuranceCategory]

  return [
    {
      key: 'price',
      amount: costs.priceBRL,
      meta: {
        label: 'Preço de referência do veículo',
        origin: vehicle.priceSource,
        assumption:
          'Valor de referência da tabela FIPE; o preço negociado pode ser diferente. Não é oferta de venda.',
        periodicity: 'unico',
        reference: priceRef,
        reliability: vehicle.priceSource === 'fipe_online' ? 'alta' : 'media',
        adjustable: false,
      },
    },
    {
      key: 'installment',
      amount: costs.monthlyInstallment,
      meta: {
        label: 'Parcela do financiamento',
        origin: 'calculado',
        assumption:
          input.objective.purchaseMode === 'avista'
            ? 'Compra à vista: sem parcela.'
            : `Tabela Price: ${input.finance.installments} parcelas a ${formatNumber(input.finance.monthlyRatePct, 2)}% ao mês sobre ${formatBRL(costs.financedAmount)} financiados (entrada de ${formatBRL(costs.downPaymentUsed)}).`,
        periodicity: 'mensal',
        reference: priceRef,
        reliability: 'media',
        adjustable: true,
      },
    },
    {
      key: 'ipva',
      amount: monthly(costs.ipvaAnnual),
      meta: {
        label: 'IPVA (equivalente mensal)',
        origin:
          costs.regionalTax.confidence === 'manual'
            ? 'informado_usuario'
            : costs.regionalTax.confidence === 'oficial'
              ? 'calculado'
              : costs.regionalTax.confidence === 'demonstracao'
                ? 'estimativa_demonstrativa'
                : 'premissa_configuravel',
        assumption: `${costs.regionalTax.explanation} Licenciamento não entra nesta linha.`,
        periodicity: 'anual',
        reference: ASSUMPTIONS_REFERENCE_MONTH,
        reliability:
          costs.regionalTax.confidence === 'oficial'
            ? 'alta'
            : costs.regionalTax.confidence === 'manual'
              ? 'media'
              : 'baixa',
        adjustable: true,
      },
    },
    {
      key: 'licensing',
      amount: monthly(costs.licensingAnnual),
      meta: {
        label: 'Licenciamento (equivalente mensal)',
        origin: 'premissa_configuravel',
        assumption: `${formatBRL(assumptions.licensingAnnualBRL)} por ano, dividido por 12. O valor real varia por estado.`,
        periodicity: 'anual',
        reference: ASSUMPTIONS_REFERENCE_MONTH,
        reliability: 'media',
        adjustable: true,
      },
    },
    {
      key: 'insurance',
      amount: monthly(costs.insuranceAnnual),
      meta: {
        label: 'Seguro (equivalente mensal)',
        origin: 'estimativa_demonstrativa',
        assumption:
          insuranceRate === null
            ? 'Categoria de seguro não disponível para este veículo.'
            : `${formatNumber(insuranceRate, 1)}% do valor FIPE ao ano (categoria ${vehicle.insuranceCategory}) × ${formatNumber(scenario.multipliers.insurance, 2)} (margem do cenário). O prêmio real depende do perfil do condutor e da região.`,
        periodicity: 'anual',
        reference: ASSUMPTIONS_REFERENCE_MONTH,
        reliability: 'baixa',
        adjustable: false,
      },
    },
    {
      key: 'maintenance',
      amount: monthly(costs.maintenanceAnnual),
      meta: {
        label: 'Manutenção (equivalente mensal)',
        origin: 'estimativa_demonstrativa',
        assumption: `Manutenção preventiva da base demonstrativa, com reserva corretiva de ${formatNumber(assumptions.correctiveMaintenanceReservePct, 0)}%, acréscimo por idade do veículo e × ${formatNumber(scenario.multipliers.maintenance, 2)} (margem do cenário).`,
        periodicity: 'anual',
        reference: ASSUMPTIONS_REFERENCE_MONTH,
        reliability: 'baixa',
        adjustable: false,
      },
    },
    {
      key: 'energy',
      amount: costs.energyMonthly,
      meta: {
        label: 'Combustível ou energia',
        origin: 'premissa_configuravel',
        assumption: `${costs.usedFuelLabel}; ${formatNumber(costs.monthlyKm, 0)} km por mês; consumo efetivo de ${formatNumber(costs.effectiveConsumption, 1)} ${vehicle.consumptionUnit}; × ${formatNumber(scenario.multipliers.energy, 2)} (margem do cenário).`,
        periodicity: 'mensal',
        reference: ASSUMPTIONS_REFERENCE_MONTH,
        reliability: 'media',
        adjustable: true,
      },
    },
    {
      key: 'depreciation',
      amount: monthly(costs.depreciationAnnual),
      meta: {
        label: 'Depreciação (equivalente mensal)',
        origin: 'estimativa_demonstrativa',
        assumption:
          vehicle.depreciationAnnualPct === null
            ? 'Depreciação não disponível para este veículo.'
            : `${formatNumber(vehicle.depreciationAnnualPct, 1)}% do valor FIPE ao ano. Não é um desembolso mensal, mas uma perda estimada de valor.`,
        periodicity: 'anual',
        reference: ASSUMPTIONS_REFERENCE_MONTH,
        reliability: 'baixa',
        adjustable: false,
      },
    },
    {
      key: 'total',
      amount: costs.monthlyTotal,
      meta: {
        label: 'Custo mensal total estimado',
        origin: 'calculado',
        assumption:
          'Parcela + IPVA/12 + licenciamento/12 + seguro/12 + manutenção/12 + energia mensal + depreciação/12. Fica indisponível se algum componente estiver ausente.',
        periodicity: 'mensal',
        reference: priceRef,
        reliability: 'baixa',
        adjustable: false,
      },
    },
  ]
}
