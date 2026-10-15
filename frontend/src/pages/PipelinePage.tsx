import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessage } from '../api/client'
import { moveDeal, useBoard } from '../api/hooks'
import { STAGES, type Deal, type Stage } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { ExportButton } from '../components/ExportButton'
import { PageHeader } from '../components/ui/layout'
import { ErrorState, LoadingState } from '../components/ui/states'
import { DealFormModal } from '../forms/DealForm'
import { OwnerSelect } from '../forms/selects'
import { formatDate, formatMoney, formatTotals } from '../lib/format'
import { toId, useUrlFilters } from '../lib/hooks'
import {
  beforeIdOf,
  cardId,
  columnId,
  dropSlot,
  hasMoved,
  keyboardMove,
  locate,
  moveCard,
  parseDndId,
  reorderWithin,
  sumTotals,
  toColumns,
  type Columns,
} from '../lib/kanban'
import { t } from '../i18n'

const ACCENT: Record<Stage, string> = {
  lead: 'border-t-slate-400',
  qualified: 'border-t-sky-500',
  proposal: 'border-t-indigo-500',
  negotiation: 'border-t-amber-500',
  won: 'border-t-green-500',
  lost: 'border-t-red-500',
}

function DealCard({ deal, overlay = false }: { deal: Deal; overlay?: boolean }) {
  return (
    <div
      className={`rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm ${
        overlay ? 'rotate-2 shadow-lg ring-2 ring-indigo-500/30' : 'hover:border-slate-300'
      }`}
    >
      <p className="text-sm font-medium text-slate-900">{deal.title}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">
        {deal.contact.name}
        {deal.company && ` · ${deal.company.name}`}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900 tabular-nums">
          {formatMoney(deal.value, deal.currency)}
        </span>
        {deal.expected_close_date && !deal.closed_at && (
          <span className="text-xs text-slate-500">{formatDate(deal.expected_close_date)}</span>
        )}
        {deal.closed_at && (
          <span className="text-xs text-slate-500">
            {t('pipeline.closedOn', { date: formatDate(deal.closed_at) })}
          </span>
        )}
      </div>
    </div>
  )
}

interface CardProps {
  deal: Deal
  focus: boolean
  onOpen: (deal: Deal) => void
  onKeyMove: (deal: Deal, key: string) => void
}

const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

function SortableCard({ deal, focus, onOpen, onKeyMove }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId(deal.id),
  })
  // A div, not a <button>, so key presses don't also fire clicks. dnd-kit supplies
  // role="button" + tabIndex; arrows move the card, Enter opens it.
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
    >
      <div
        // keep keyboard focus on the card after it moves to another column (it remounts there)
        ref={(el) => {
          if (el && focus) el.focus()
        }}
        className="block w-full cursor-grab touch-none rounded-md focus-visible:outline-2 focus-visible:outline-indigo-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`${deal.title}, ${formatMoney(deal.value, deal.currency)}`}
        aria-description={t('pipeline.cardHint')}
        onClick={() => onOpen(deal)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onOpen(deal)
          } else if (MOVE_KEYS.includes(event.key)) {
            event.preventDefault()
            onKeyMove(deal, event.key)
          }
        }}
      >
        <DealCard deal={deal} />
      </div>
    </li>
  )
}

function BoardColumnView({
  stage,
  deals,
  focusId,
  onOpen,
  onAdd,
  onKeyMove,
}: {
  stage: Stage
  deals: Deal[]
  focusId: number | null
  onOpen: (deal: Deal) => void
  onAdd: (stage: Stage) => void
  onKeyMove: (deal: Deal, key: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(stage) })
  const totals = sumTotals(deals)
  return (
    <section
      ref={setNodeRef}
      aria-label={t('pipeline.column', { stage: t(`stage.${stage}`) })}
      className={`flex w-72 shrink-0 flex-col rounded-lg border-t-4 transition-colors ${ACCENT[stage]} ${
        isOver ? 'bg-indigo-50' : 'bg-slate-100'
      }`}
    >
      <header className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{t(`stage.${stage}`)}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
            {deals.length}
          </span>
        </div>
        <p className="mt-1 min-h-4 text-xs text-slate-600 tabular-nums">{formatTotals(totals)}</p>
      </header>
      <SortableContext
        items={deals.map((d) => cardId(d.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
          {deals.map((deal) => (
            <SortableCard
              key={deal.id}
              deal={deal}
              focus={deal.id === focusId}
              onOpen={onOpen}
              onKeyMove={onKeyMove}
            />
          ))}
          {deals.length === 0 && (
            <li className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
              {t('pipeline.drop')}
            </li>
          )}
        </ul>
      </SortableContext>
      {stage !== 'won' && stage !== 'lost' && (
        <button
          type="button"
          onClick={() => onAdd(stage)}
          className="mx-2 mb-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <Icon name="plus" className="size-3.5" /> {t('dealForm.new')}
        </button>
      )}
    </section>
  )
}

export function PipelinePage() {
  const isAdmin = useCurrentUser().role === 'admin'
  const { values, set } = useUrlFilters(['owner_id'] as const)
  const ownerId = toId(values.owner_id)
  const board = useBoard(ownerId)
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  const serverColumns = useMemo(() => toColumns(board.data), [board.data])
  // While dragging (and until the server confirms) the board shows this local copy.
  const [localColumns, setLocalColumns] = useState<Columns | null>(null)
  const columns = localColumns ?? serverColumns
  const startColumns = useRef<Columns | null>(null)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [dealForm, setDealForm] = useState<{ deal?: Deal; stage?: Stage } | null>(null)
  const [focusId, setFocusId] = useState<number | null>(null)

  /** Show `final` right away, save it, then fall back to fresh server data (or roll back). */
  async function commitMove(before: Columns, final: Columns, dealId: number) {
    setLocalColumns(final)
    const slot = locate(final, dealId)!
    try {
      await moveDeal(dealId, slot.stage, beforeIdOf(final, dealId))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      if (slot.stage !== locate(before, dealId)?.stage) {
        toast.success(t('dealPage.movedTo', { stage: t(`stage.${slot.stage}`) }))
      }
    } catch (error) {
      toast.error(t('pipeline.moveFailed', { reason: errorMessage(error) }))
    } finally {
      setLocalColumns(null)
    }
  }

  function onKeyMove(deal: Deal, key: string) {
    const final = keyboardMove(columns, deal.id, key)
    if (!final) return
    setFocusId(deal.id)
    void commitMove(columns, final, deal.id)
  }

  const sensors = useSensors(
    // a few pixels of movement before dragging, so a plain click still opens the deal
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function onDragStart({ active }: DragStartEvent) {
    const parsed = parseDndId(active.id)
    if (parsed?.kind !== 'deal') return
    startColumns.current = columns
    setLocalColumns(columns)
    const slot = locate(columns, parsed.id)
    setActiveDeal(slot ? columns[slot.stage][slot.index] : null)
  }

  // Crossing into another column moves the card there right away (live preview).
  function onDragOver({ active, over }: DragOverEvent) {
    const dragged = parseDndId(active.id)
    if (!over || dragged?.kind !== 'deal') return
    setLocalColumns((current) => {
      if (!current) return current
      const from = locate(current, dragged.id)
      const target = dropSlot(current, over.id)
      if (!from || !target || from.stage === target.stage) return current
      return moveCard(current, dragged.id, target)
    })
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveDeal(null)
    const dragged = parseDndId(active.id)
    const before = startColumns.current
    if (!over || dragged?.kind !== 'deal' || !before || !localColumns) {
      setLocalColumns(null)
      return
    }
    let final = localColumns
    const from = locate(final, dragged.id)
    const target = dropSlot(final, over.id)
    if (from && target && from.stage === target.stage && from.index !== target.index) {
      const to = Math.min(target.index, final[from.stage].length - 1)
      final = reorderWithin(final, from.stage, from.index, to)
    }
    if (!hasMoved(before, final, dragged.id)) {
      setLocalColumns(null)
      return
    }

    await commitMove(before, final, dragged.id)
  }

  function onDragCancel() {
    setActiveDeal(null)
    setLocalColumns(null)
  }

  const openCount = STAGES.filter((s) => s !== 'won' && s !== 'lost').reduce(
    (n, s) => n + columns[s].length,
    0,
  )

  return (
    <>
      <PageHeader
        title={t('nav.pipeline')}
        subtitle={board.data ? t('pipeline.subtitle', { count: openCount }) : undefined}
        actions={
          <>
            <ExportButton
              path="/deals/export"
              query={{ owner_id: values.owner_id || undefined }}
              fallbackName="deals.csv"
            />
            {isAdmin && (
              <div className="w-48">
                <OwnerSelect
                  aria-label={t('common.filterOwner')}
                  emptyLabel={t('select.allOwners')}
                  value={values.owner_id}
                  onChange={(e) => set({ owner_id: e.target.value })}
                />
              </div>
            )}
            <Button onClick={() => setDealForm({ stage: 'lead' })}>
              <Icon name="plus" className="size-4" />
              {t('dealForm.new')}
            </Button>
          </>
        }
      />

      {board.isPending ? (
        <LoadingState />
      ) : board.isError ? (
        <ErrorState error={board.error} onRetry={() => board.refetch()} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex items-start gap-4">
              {STAGES.map((stage) => (
                <BoardColumnView
                  key={stage}
                  stage={stage}
                  deals={columns[stage]}
                  focusId={focusId}
                  onOpen={(deal) => navigate(`/deals/${deal.id}`)}
                  onAdd={(s) => setDealForm({ stage: s })}
                  onKeyMove={onKeyMove}
                />
              ))}
            </div>
          </div>
          <DragOverlay>{activeDeal && <DealCard deal={activeDeal} overlay />}</DragOverlay>
        </DndContext>
      )}

      <p className="mt-2 text-xs text-slate-500">
        {t('pipeline.tip')}{' '}
        <Link to="/contacts" className="text-indigo-600 hover:underline">
          {t('pipeline.tipLink')}
        </Link>
      </p>

      <DealFormModal
        open={dealForm !== null}
        deal={dealForm?.deal}
        stage={dealForm?.stage}
        onClose={() => setDealForm(null)}
      />
    </>
  )
}
