import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from './ChartCard'
import ChartTooltip from '../ui/ChartTooltip'
import Tabs from '../ui/Tabs'
import { Skeleton } from '../ui/LoadingSkeleton'
import { ErrorState } from '../ui/StateViews'
import { useApi } from '../../hooks/useApi'
import { api } from '../../services/api'
import { CHART } from '../../utils/constants'
import { tickFormatter, tooltipDate } from '../../utils/format'

const RANGES = [{ value: '1h', label: '1H' }, { value: '24h', label: '24H' }, { value: '7d', label: '7D' }, { value: '30d', label: '30D' }]
const SERIES = [['cpu', 'CPU', CHART.cpu], ['memory', 'Memory', CHART.memory], ['network', 'Network', CHART.network]]

export default function PerformanceChart() {
  const [range, setRange] = useState('24h')
  const { data, loading, error, retry } = useApi(() => api.metrics(range), [range])

  return (
    <ChartCard title="Cloud Performance" subtitle="CPU, memory and network usage across all resources"
      actions={<Tabs options={RANGES} value={range} onChange={setRange} />} className="h-full">
      <div className="mb-3 flex flex-wrap gap-4">
        {SERIES.map(([k, label, color]) => (
          <span key={k} className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>
        ))}
      </div>
      {error && !data ? <ErrorState compact message={error} onRetry={retry} /> : loading ? <Skeleton className="h-[290px] w-full" /> : (
        <div className="h-[290px] w-full">
          <ResponsiveContainer>
            <AreaChart data={data.series} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
              <defs>
                {SERIES.map(([k, , color]) => (
                  <linearGradient key={k} id={`perf-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.32} /><stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="ts" tickFormatter={tickFormatter(range)} tickLine={false} axisLine={false} minTickGap={36} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={48} />
              <Tooltip content={<ChartTooltip formatLabel={(l) => tooltipDate(l, range)} formatValue={(v) => `${Number(v).toFixed(1)}%`} />} />
              {SERIES.map(([k, label, color]) => (
                <Area key={k} type="monotone" dataKey={k} name={label} stroke={color} strokeWidth={2.2} fill={`url(#perf-${k})`}
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={900} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
