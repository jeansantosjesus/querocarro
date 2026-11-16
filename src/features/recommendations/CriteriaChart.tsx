import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface CriteriaChartDatum {
  name: string

  score: number
}

/** Gráfico de notas (0-100) por critério. Carregado sob demanda; a tabela equivalente fica na página. */

export default function CriteriaChart({ data }: { data: CriteriaChartDatum[] }) {
  return (
    <div className="h-72 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis type="number" domain={[0, 100]} />

          <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} />

          <Tooltip formatter={(value) => [`${value} / 100`, 'Nota']} />

          <Bar dataKey="score" fill="#0f766e" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
