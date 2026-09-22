import { Server, HardDrive, Database, Network } from 'lucide-react'

// Colours used by charts (kept in one place so the design stays consistent)
export const CHART = {
  cpu: '#38d5f5',
  memory: '#8b6cff',
  network: '#5b9dff',
  storage: '#34d399',
  cost: '#a78bfa',
  events: '#fb7185',
  grid: 'rgba(255,255,255,0.07)',
}

export const SEVERITY = {
  critical: { label: 'Critical', color: '#ff4d6d', cls: 'text-[#ff6b86] bg-[#ff4d6d]/15 border-[#ff4d6d]/40' },
  high: { label: 'High', color: '#fb923c', cls: 'text-orange-300 bg-orange-400/15 border-orange-400/40' },
  medium: { label: 'Medium', color: '#fbbf24', cls: 'text-amber-300 bg-amber-400/15 border-amber-400/40' },
  low: { label: 'Low', color: '#38d5f5', cls: 'text-sky-300 bg-sky-400/15 border-sky-400/40' },
}
export const SEVERITY_LIST = ['critical', 'high', 'medium', 'low']

export const TYPE_META = {
  compute: { label: 'Compute', icon: Server, color: '#38d5f5' },
  storage: { label: 'Storage', icon: HardDrive, color: '#34d399' },
  database: { label: 'Database', icon: Database, color: '#8b6cff' },
  network: { label: 'Network', icon: Network, color: '#5b9dff' },
}

export const REGIONS = ['us-east-1', 'us-west-2', 'ap-south-1', 'eu-west-1']

export const PRIORITY_CLS = {
  high: 'text-[#ff6b86] bg-[#ff4d6d]/15 border-[#ff4d6d]/40',
  medium: 'text-amber-300 bg-amber-400/15 border-amber-400/40',
  low: 'text-sky-300 bg-sky-400/15 border-sky-400/40',
}
