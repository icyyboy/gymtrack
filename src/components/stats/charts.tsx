'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

const axis = { stroke: '#8A919E', fontSize: 11, tickLine: false, axisLine: false }
const tooltipStyle = {
  background: '#171A1F',
  border: '1px solid #2E333C',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff'
}

export function VolumeTrend({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#1A1D23" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={44} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
        <Bar dataKey="value" fill="#2FD671" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ProgressLine({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#1A1D23" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={44} domain={['auto', 'auto']} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke="#2FD671" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MuscleBars({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={86} {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
        <Bar dataKey="value" fill="#2FD671" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}
