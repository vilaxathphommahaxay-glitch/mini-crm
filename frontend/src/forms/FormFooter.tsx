import { Button } from '../components/ui/Button'

/** Cancel / Save row at the bottom of a form inside a Modal. */
export function FormFooter({
  onCancel,
  saving,
  submitLabel = 'Save',
}: {
  onCancel: () => void
  saving: boolean
  submitLabel?: string
}) {
  return (
    <div className="-mx-5 mt-5 -mb-4 flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" loading={saving}>
        {submitLabel}
      </Button>
    </div>
  )
}
