import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function Form({ onClose }: { onClose: () => void }) {
  return (
    <Modal open title="Test" onClose={onClose}>
      <input aria-label="First" />
      <input aria-label="Second" />
    </Modal>
  )
}

describe('<Modal>', () => {
  it('focuses the first field when it opens', () => {
    render(<Form onClose={() => {}} />)
    expect(screen.getByLabelText('First')).toHaveFocus()
  })

  it('keeps focus where the user is when the parent re-renders', async () => {
    // parents usually pass a new onClose arrow function on every render
    const { rerender } = render(<Form onClose={() => {}} />)
    await userEvent.click(screen.getByLabelText('Second'))

    rerender(<Form onClose={() => {}} />)

    expect(screen.getByLabelText('Second')).toHaveFocus()
  })

  it('closes on Escape using the latest onClose', async () => {
    const first = vi.fn()
    const latest = vi.fn()
    const { rerender } = render(<Form onClose={first} />)
    rerender(<Form onClose={latest} />)

    await userEvent.keyboard('{Escape}')

    expect(latest).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
  })
})
