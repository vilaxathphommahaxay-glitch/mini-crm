import { useHistory } from '../api/hooks'
import { HistoryList } from '../components/HistoryList'
import { Select } from '../components/ui/form'
import { Card, PageHeader } from '../components/ui/layout'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { useUrlFilters } from '../lib/hooks'
import { t, type MessageKey } from '../i18n'

const PAGE_SIZE = 50
const TYPES: [string, MessageKey][] = [
  ['contact', 'nav.contacts'],
  ['company', 'nav.companies'],
  ['deal', 'history.deals'],
  ['quote', 'quote.title'],
  ['activity', 'history.activities'],
  ['user', 'nav.users'],
]

/** Admins: every change anyone made, e.g. to find out who deleted something. */
export function HistoryPage() {
  const { values, page, set } = useUrlFilters(['entity_type'] as const)
  const list = useHistory({ entity_type: values.entity_type || undefined, page, size: PAGE_SIZE })

  return (
    <>
      <PageHeader
        title={t('nav.history')}
        subtitle={t('history.subtitle')}
        actions={
          <div className="w-48">
            <Select
              aria-label={t('history.filterType')}
              value={values.entity_type}
              onChange={(e) => set({ entity_type: e.target.value })}
            >
              <option value="">{t('history.allTypes')}</option>
              {TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      <Card>
        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t('history.empty')}>{t('history.emptyHint')}</EmptyState>
        ) : (
          <HistoryList events={list.data.items} links />
        )}
        {list.data && (
          <Pagination
            page={page}
            size={PAGE_SIZE}
            total={list.data.total}
            onPageChange={(p) => set({ page: p })}
          />
        )}
      </Card>
    </>
  )
}
