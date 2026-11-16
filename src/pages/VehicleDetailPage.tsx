import { lazy, Suspense } from 'react'

import { Link, Navigate, useParams } from 'react-router-dom'

import { Alert } from '../components/ui/Alert'

import { OriginBadge } from '../components/ui/OriginBadge'

import { PageTitle } from '../components/ui/PageTitle'

import { Spinner } from '../components/ui/Spinner'

import { CRITERIA } from '../config/criteria'

import { DISCLAIMERS } from '../config/copy'

import { ADHERENCE_LABELS, PRESSURE_LABELS } from '../domain/analytics/classify'

import { describeFinancialStatus, describeSource } from '../domain/decision/explain'

import { buildCostLines } from '../domain/finance/estimates'

import { CostBreakdownTable } from '../features/recommendations/CostBreakdownTable'

import { inverseSimulationPath } from '../features/recommendations/paths'

import { RegionalTaxSection } from '../features/recommendations/RegionalTaxSection'

import { TcoSection } from '../features/recommendations/TcoSection'

import { useSimulation } from '../features/simulation/SimulationContext'

import { useCatalog } from '../features/vehicles/CatalogContext'

import { VehiclePhoto } from '../features/vehicles/images/VehiclePhoto'

import type { AffordabilityClass } from '../types/decision'

import { formatBRL, formatNumber, formatPercent } from '../utils/format'

const AFFORDABILITY_LABEL: Record<AffordabilityClass, string> = {
  confortavel: 'confortável',

  adequada: 'adequada',

  proxima_do_limite: 'próxima do limite',

  acima_do_limite: 'acima do limite',

  inviavel: 'inviável',
}

const CriteriaChart = lazy(() => import('../features/recommendations/CriteriaChart'))

const VEHICLE_ID_PATTERN = /^[A-Za-z0-9_:-]{1,64}$/

export function VehicleDetailPage() {
  const { id = '' } = useParams()

  const { input, result } = useSimulation()

  const { catalog } = useCatalog()

  if (!input || !result || !catalog) return <Navigate to="/simulacao" replace />

  const item = VEHICLE_ID_PATTERN.test(id)
    ? result.ranking.find((entry) => entry.vehicle.id === id)
    : undefined

  if (!item) {
    return (
      <div>
        <PageTitle title="Veículo não encontrado" />

        <Alert tone="warn">
          Este veículo não está entre as opções elegíveis da simulação atual.{' '}
          <Link to="/resultado" className="font-semibold underline">
            Voltar ao resultado
          </Link>
        </Alert>
      </div>
    )
  }

  const { vehicle, costs, financial } = item

  const lines = buildCostLines(item, input, catalog.referenceMonth)

  const chartData = CRITERIA.map((criterion) => ({
    name: criterion.label,

    score: Math.round(item.normalized[criterion.id] ?? 0),

    available: item.normalized[criterion.id] !== null,
  }))

  const unavailable = chartData.filter((entry) => !entry.available)

  const clustering = result.analytics.clustering

  const group = clustering.groups.find((entry) => entry.id === item.analytics.groupId)

  const composition = item.analytics.tcoComposition

  return (
    <div className="space-y-8">
      <PageTitle
        title={`${vehicle.brand} ${vehicle.model} ${vehicle.modelYear}`}

        subtitle="Detalhes desta opção compatível com os parâmetros da simulação."

        actions={
          <Link to="/resultado" className="qc-btn-secondary">
            Voltar ao resultado
          </Link>
        }
      />

      <VehiclePhoto vehicle={vehicle} className="max-w-xl" />

      <section aria-labelledby="origin-title" className="space-y-2 text-sm">
        <h2 id="origin-title" className="sr-only">
          Origem dos dados deste veículo
        </h2>

        <p className="flex flex-wrap items-center gap-2">
          <span className="text-ink-700">Preço de referência:</span>

          {vehicle.priceBRL === null ? (
            <OriginBadge origin="unavailable" label="Preço indisponível" />
          ) : (
            <OriginBadge
              origin="fipe"

              label={
                vehicle.priceSource === 'fipe_online'
                  ? 'FIPE (consulta online)'
                  : 'FIPE (referência salva)'
              }
            />
          )}
        </p>

        {vehicle.hasSupplement ? (
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-ink-700">Consumo, manutenção, seguro e depreciação:</span>

            <OriginBadge origin="demonstration" />
          </p>
        ) : null}
      </section>

      <section aria-labelledby="fin-title" className="qc-card p-6">
        <h2 id="fin-title" className="text-xl font-bold">
          Indicadores financeiros estimados
        </h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-ink-600">Custo mensal estimado</dt>

            <dd className="text-xl font-bold">{formatBRL(costs.monthlyTotal)}</dd>
          </div>

          <div>
            <dt className="text-sm text-ink-600">Comprometimento da renda</dt>

            <dd className="text-xl font-bold">{formatPercent(financial.commitmentRatio)}</dd>
          </div>

          <div>
            <dt className="text-sm text-ink-600">Margem mensal restante</dt>

            <dd className="text-xl font-bold">{formatBRL(financial.remainingMargin)}</dd>
          </div>

          <div>
            <dt className="text-sm text-ink-600">Situação financeira</dt>

            <dd className="text-xl font-bold">{formatNumber(financial.financialScore, 0)} / 100</dd>
          </div>

          <div>
            <dt className="text-sm text-ink-600">Aderência ao cenário</dt>

            <dd className="text-xl font-bold">{formatNumber(item.index, 0)} / 100</dd>
          </div>
        </dl>

        <p className="mt-3 text-sm text-ink-700">
          {describeFinancialStatus(financial)}. Classe estimada:{' '}
          {financial.affordabilityClass
            ? AFFORDABILITY_LABEL[financial.affordabilityClass]
            : 'não disponível'}
          . Capacidade de aquisição estimada: {formatBRL(financial.acquisitionCapacity)}. Isso não é
          uma garantia.
        </p>

        <p className="mt-4 text-sm">
          Quer ver quais entradas e prazos cabem neste carro?{' '}
          <Link
            to={inverseSimulationPath(vehicle.id)}

            className="font-semibold text-brand-800 underline"
          >
            Quero este carro: ver condições de compra
          </Link>
        </p>
      </section>

      <section aria-labelledby="cost-title" className="qc-card p-6">
        <h2 id="cost-title" className="mb-4 text-xl font-bold">
          Composição do custo
        </h2>

        <CostBreakdownTable lines={lines} />

        {costs.notes.length > 0 ? (
          <ul className="mt-4 list-disc pl-5 text-sm text-ink-700">
            {costs.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <RegionalTaxSection tax={costs.regionalTax} />

      <TcoSection item={item} />

      <section aria-labelledby="analytics-title" className="qc-card p-6">
        <h2 id="analytics-title" className="text-xl font-bold">
          Análise complementar
        </h2>

        <p className="mt-1 text-sm text-ink-700">
          Leituras descritivas desta opção. Não alteram o índice de aderência nem a ordem das
          opções.
        </p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-600">Grupo analítico</dt>

            <dd className="font-semibold">{group ? group.label : 'Informação não disponível'}</dd>

            {group ? <dd className="text-sm text-ink-700">{group.description}</dd> : null}
          </div>

          <div>
            <dt className="text-sm text-ink-600">Aderência ao uso</dt>

            <dd className="font-semibold">
              {item.analytics.adherence
                ? ADHERENCE_LABELS[item.analytics.adherence]
                : 'Informação não disponível'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-600">Pressão financeira</dt>

            <dd className="font-semibold">
              {financial.pressureLevel
                ? PRESSURE_LABELS[financial.pressureLevel]
                : 'Informação não disponível'}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-sm text-ink-700">
          {clustering.reason} A letra identifica o grupo; não indica qualidade.
        </p>

        <h3 className="mt-5 text-base font-semibold">Participação no custo mensal</h3>

        {composition ? (
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {composition.components.map((component) => (
              <li key={component.id} className="flex justify-between gap-3">
                <span>{component.label}</span>

                <span className="tabular-nums">{formatPercent(component.share)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-700">Informação não disponível.</p>
        )}
      </section>

      <section aria-labelledby="crit-title" className="qc-card p-6">
        <h2 id="crit-title" className="mb-1 text-xl font-bold">
          Desempenho por critério
        </h2>

        <p className="mb-4 text-sm text-ink-700">
          Notas de 0 a 100 em relação às demais opções elegíveis (100 = melhor entre as avaliadas no
          critério).
        </p>

        <Suspense fallback={<Spinner label="Carregando gráfico…" />}>
          <CriteriaChart
            data={chartData

              .filter((entry) => entry.available)

              .map(({ name, score }) => ({ name, score }))}
          />
        </Suspense>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">Notas, pesos e contribuições por critério</caption>

            <thead>
              <tr className="border-b border-ink-300">
                <th scope="col" className="py-2 pr-3">
                  Critério
                </th>

                <th scope="col" className="py-2 pr-3">
                  Nota (0–100)
                </th>

                <th scope="col" className="py-2 pr-3">
                  Peso efetivo
                </th>

                <th scope="col" className="py-2">
                  Contribuição ao índice
                </th>
              </tr>
            </thead>

            <tbody>
              {CRITERIA.map((criterion) => {
                const normalized = item.normalized[criterion.id]

                return (
                  <tr key={criterion.id} className="border-b border-ink-100">
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {criterion.label}
                    </th>

                    <td className="py-2 pr-3">
                      {normalized === null
                        ? 'Informação não disponível'
                        : formatNumber(normalized, 0)}
                    </td>

                    <td className="py-2 pr-3">
                      {formatNumber(item.effectiveWeights[criterion.id], 1)}%
                    </td>

                    <td className="py-2">
                      {formatNumber(item.contributions[criterion.id], 1)} pts
                    </td>
                  </tr>
                )
              })}
            </tbody>

            <tfoot>
              <tr>
                <th scope="row" className="py-2 pr-3 text-left">
                  Índice (soma{item.penalty > 0 ? ' − penalidade' : ''})
                </th>

                <td colSpan={3} className="py-2 font-semibold">
                  {formatNumber(item.baseIndex, 1)}
                  {item.penalty > 0 ? ` − ${formatNumber(item.penalty, 1)}` : ''} ={' '}
                  {formatNumber(item.index, 1)} / 100
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {unavailable.length > 0 ? (
          <p className="mt-3 text-sm text-ink-700">
            Informação não disponível para:{' '}
            {unavailable.map((entry) => entry.name.toLowerCase()).join(', ')}. O peso desses
            critérios foi redistribuído.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="just-title" className="grid gap-5 md:grid-cols-2">
        <div className="qc-card p-6">
          <h2 id="just-title" className="text-xl font-bold">
            Pontos favoráveis
          </h2>

          {item.pros.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {item.pros.map((pro) => (
                <li key={pro.code}>{pro.text}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-700">
              Nenhum critério se destacou de forma relevante nesta simulação.
            </p>
          )}
        </div>

        <div className="qc-card p-6">
          <h2 className="text-xl font-bold">Pontos de atenção</h2>

          {item.alerts.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {item.alerts.map((alert) => (
                <li key={alert.code + alert.text}>{alert.text}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-700">
              Nenhum ponto de atenção identificado pelo modelo.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="src-title" className="qc-card p-6">
        <h2 id="src-title" className="text-xl font-bold">
          Fontes e limitações
        </h2>

        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-800">
          <li>Preço de referência: {describeSource(vehicle)}.</li>

          <li>{DISCLAIMERS.demonstrativeData}</li>

          {DISCLAIMERS.items.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>

        <p className="mt-4 text-sm">
          Quer testar outra importância para os critérios?{' '}
          <Link to="/resultado" className="font-semibold text-brand-800 underline">
            Ajuste os pesos no resultado
          </Link>{' '}
          e volte aqui: os valores são recalculados.
        </p>
      </section>
    </div>
  )
}
