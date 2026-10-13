import { ACTIVITY_LABELS, STAGE_LABELS, type ActivityType, type Stage } from '../api/types'
import { Badge } from './ui/layout'

const STAGE_COLORS = {
  lead: 'slate',
  qualified: 'sky',
  proposal: 'indigo',
  negotiation: 'amber',
  won: 'green',
  lost: 'red',
} as const

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge color={STAGE_COLORS[stage]}>{STAGE_LABELS[stage]}</Badge>
}

const ACTIVITY_COLORS = { call: 'sky', meeting: 'indigo', note: 'slate', task: 'amber' } as const

export function ActivityBadge({ type }: { type: ActivityType }) {
  return <Badge color={ACTIVITY_COLORS[type]}>{ACTIVITY_LABELS[type]}</Badge>
}

export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-slate-400">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} color="indigo">
          {tag}
        </Badge>
      ))}
    </div>
  )
}
