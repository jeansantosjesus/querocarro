import { TCO_HORIZONS, type TcoHorizon } from '../../config/tco'

import type { RankedVehicle } from '../../types/decision'

import type { TcoResult } from '../../types/tco'

import { formatBRL } from '../../utils/format'

interface TcoSectionProps {
  item: RankedVehicle
}

function cell(result: TcoResult, view: 'economic' | 'cash'): string {
  if (result.missing.length > 0) return 'Informação não disponível'

  const total = view === 'economic' ? result.economic.total : result.cash.total

  return formatBRL(total)
}

function ComponentLine({ label, value }: { label: string; value: number | null }) {
  return (
    <>
      <dt className="text-ink-700">{label}</dt>

      <dd className="text-right tabular-nums">
        {value === null ? 'Informação não disponível' : formatBRL(value)}
      </dd>
    </>
  )
}

/**

* Custo total de propriedade por horizonte, em duas visões rotuladas:

* econômica (ao longo do tempo, com o residual subtraído) e de caixa (desembolsos reais).

*/

export function TcoSection({ item }: TcoSectionProps) {
  const { byHorizon, criterionHorizonMonths } = item.tco

  const detail = byHorizon[criterionHorizonMonths].price

  const notIncluded = detail.notIncluded

  const missing = Array.from(new Set(TCO_HORIZONS.flatMap((h) => byHorizon[h].price.missing)))

  return (
    <section aria-labelledby="tco-title" className="qc-card p-6">
      <h2 id="tco-title" className="text-xl font-bold">
        Custo total no horizonte (TCO)
      </h2>

      <p className="mt-1 text-sm text-ink-700">
        Mesmo custo, lido de duas formas. A visão econômica mostra quanto o veículo custa ao longo
        do tempo: o preço entra uma vez e o valor residual é descontado. A visão de caixa mostra o
        que sai do bolso. O ranking usa o horizonte de {criterionHorizonMonths} meses, com Price.
      </p>

      {missing.length > 0 ? (
        <p className="mt-3 text-sm text-warn-fg">
          Não é possível totalizar: {missing.join(', ').toLowerCase()} não disponível.
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Custo econômico e fluxo de caixa por horizonte, com Price e SAC
          </caption>

          <thead>
            <tr className="border-b border-ink-300">
              <th scope="col" rowSpan={2} className="py-2 pr-3 align-bottom">
                Horizonte
              </th>

              <th scope="col" colSpan={2} className="py-2 pr-3">
                Price
              </th>

              <th scope="col" colSpan={2} className="py-2">
                SAC
              </th>
            </tr>

            <tr className="border-b border-ink-300 text-ink-700">
              <th scope="col" className="py-2 pr-3 font-medium">
                Econômico
              </th>

              <th scope="col" className="py-2 pr-3 font-medium">
                Caixa
              </th>

              <th scope="col" className="py-2 pr-3 font-medium">
                Econômico
              </th>

              <th scope="col" className="py-2 font-medium">
                Caixa
              </th>
            </tr>
          </thead>

          <tbody>
            {TCO_HORIZONS.map((horizon: TcoHorizon) => {
              const pair = byHorizon[horizon]

              const isCriterion = horizon === criterionHorizonMonths

              return (
                <tr
                  key={horizon}

                  className={`border-b border-ink-100 ${isCriterion ? 'font-semibold' : ''}`}
                >
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {horizon} meses{isCriterion ? ' (ranking)' : ''}
                  </th>

                  <td className="py-2 pr-3 tabular-nums">{cell(pair.price, 'economic')}</td>

                  <td className="py-2 pr-3 tabular-nums">{cell(pair.price, 'cash')}</td>

                  <td className="py-2 pr-3 tabular-nums">{cell(pair.sac, 'economic')}</td>

                  <td className="py-2 tabular-nums">{cell(pair.sac, 'cash')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold">
            Composição econômica em {criterionHorizonMonths} meses (Price)
          </h3>

          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <ComponentLine label="Preço de referência" value={detail.economic.acquisition} />

            <ComponentLine
              label="Menos valor residual estimado"

              value={detail.economic.residual === null ? null : -detail.economic.residual}
            />

            <ComponentLine label="Juros pagos no horizonte" value={detail.economic.interest} />

            <ComponentLine label="IPVA e licenciamento" value={detail.economic.taxes} />

            <ComponentLine label="Seguro" value={detail.economic.insurance} />

            <ComponentLine label="Combustível ou energia" value={detail.economic.energy} />

            <ComponentLine label="Manutenção" value={detail.economic.maintenance} />

            <ComponentLine label="Itens informados pelo usuário" value={detail.economic.extras} />
          </dl>

          {detail.residualCapped ? (
            <p className="mt-2 text-xs text-ink-700">
              A depreciação projetada chegou a zero no horizonte; o valor residual foi limitado a
              zero.
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="text-base font-semibold">
            Caixa em {criterionHorizonMonths} meses (Price)
          </h3>

          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <ComponentLine label="Entrada" value={detail.cash.entry} />

            <ComponentLine label="Parcelas pagas no horizonte" value={detail.cash.installments} />

            <ComponentLine label="IPVA e licenciamento" value={detail.cash.taxes} />

            <ComponentLine label="Seguro" value={detail.cash.insurance} />

            <ComponentLine label="Combustível ou energia" value={detail.cash.energy} />

            <ComponentLine label="Manutenção" value={detail.cash.maintenance} />

            <ComponentLine label="Itens informados pelo usuário" value={detail.cash.extras} />

            <ComponentLine
              label="Saldo devedor ao fim do horizonte"

              value={detail.balanceAtHorizon}
            />

            <ComponentLine
              label="Posição líquida (residual − saldo devedor)"

              value={detail.cash.netResidualPosition}
            />
          </dl>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-700">
        {notIncluded.length > 0
          ? `Não incluídos por falta de fonte na base: ${notIncluded.join(', ').toLowerCase()}. Eles não entram no total e podem alterar o custo real.`
          : 'Todos os itens opcionais foram informados.'}{' '}
        Valores sem correção monetária: inflação, reajustes de seguro e de IPVA não são modelados.
      </p>
    </section>
  )
}
