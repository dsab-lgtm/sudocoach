import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemePreferenceProvider } from '../components/ThemePreferenceProvider'
import { CandidateAssistantProvider } from '../components/CandidateAssistantProvider'
import { database } from '../storage/database'
import { SettingsScreen } from './SettingsScreen'

vi.mock('../storage/database', () => ({
  database: {
    puzzles: { clear: vi.fn() },
    settings: { get: vi.fn(), put: vi.fn() }
  }
}))

const getSetting = vi.mocked(database.settings.get)
const putSetting = vi.mocked(database.settings.put)
const clearPuzzles = vi.mocked(database.puzzles.clear)

function renderSettings() {
  return render(<ThemePreferenceProvider><CandidateAssistantProvider><SettingsScreen/></CandidateAssistantProvider></ThemePreferenceProvider>)
}

beforeEach(() => {
  getSetting.mockResolvedValue(undefined)
  putSetting.mockResolvedValue('theme')
  clearPuzzles.mockResolvedValue(undefined)
})

afterEach(() => {
  getSetting.mockReset()
  putSetting.mockReset()
  clearPuzzles.mockReset()
  delete document.documentElement.dataset.theme
})

describe('SettingsScreen', () => {
  it('renders only persisted preferences and factual product information', async () => {
    renderSettings()
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Solving assistance' })).toBeInTheDocument()
    expect(screen.getByLabelText('Candidate assistance')).toHaveValue('manual')
    expect(screen.getByRole('heading', { name: 'Data and privacy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText('Offline-ready')).toBeInTheDocument()
    expect(screen.getByText('Version 0.1.0')).toBeInTheDocument()
    expect(screen.queryByLabelText(/automatic candidate notes/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/default hint level/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/scanner behavior|training annotation/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear saved puzzles' })).toHaveAttribute('aria-describedby', 'clear-saved-puzzles-description')
    expect(putSetting).not.toHaveBeenCalled()
  })

  it('loads the saved theme and associates the native control with its description', async () => {
    getSetting.mockResolvedValue({ key: 'theme', value: 'dark' })
    renderSettings()
    const select = await screen.findByLabelText('Color theme')

    await waitFor(() => expect(select).toHaveValue('dark'))
    expect(select).toHaveAttribute('aria-describedby')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getSetting).toHaveBeenCalledWith('theme')
    expect(putSetting).not.toHaveBeenCalled()
  })

  it('applies and persists every supported theme preference from the keyboard-accessible native select', async () => {
    renderSettings()
    const select = await screen.findByLabelText('Color theme')
    await waitFor(() => expect(select).toBeEnabled())
    select.focus()
    fireEvent.keyDown(select, { key: 'ArrowDown' })

    for (const theme of ['light', 'dark', 'system'] as const) {
      fireEvent.change(select, { target: { value: theme } })
      expect(select).toHaveFocus()
      expect(select).toHaveValue(theme)
      expect(document.documentElement.dataset.theme).toBe(theme)
    }

    await waitFor(() => expect(putSetting).toHaveBeenLastCalledWith({ key: 'theme', value: 'system' }))
    expect(putSetting).toHaveBeenCalledTimes(3)
  })

  it('announces a theme persistence failure without reverting the current appearance', async () => {
    putSetting.mockRejectedValue(new Error('quota'))
    renderSettings()
    const select = await screen.findByLabelText('Color theme')
    await waitFor(() => expect(select).toBeEnabled())
    fireEvent.change(select, { target: { value: 'dark' } })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved')
  })

  it('confirms destructive clearing and restores focus when cancelled', async () => {
    renderSettings()
    const trigger = await screen.findByRole('button', { name: 'Clear saved puzzles' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Clear saved puzzles?' })
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })

    expect(cancel).toHaveFocus()
    expect(dialog).toHaveTextContent('theme preference, current unsaved puzzle, and scanner session stay unchanged')
    fireEvent.keyDown(cancel, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Clear saved puzzles?' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(clearPuzzles).not.toHaveBeenCalled()
  })

  it('clears saved puzzle records only after confirmation and announces completion', async () => {
    renderSettings()
    const trigger = await screen.findByRole('button', { name: 'Clear saved puzzles' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Clear saved puzzles?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear saved puzzles' }))

    await waitFor(() => expect(clearPuzzles).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog', { name: 'Clear saved puzzles?' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved puzzles cleared from this device.')
  })

  it('keeps the confirmation open and announces a clearing failure', async () => {
    clearPuzzles.mockRejectedValue(new Error('blocked'))
    renderSettings()
    fireEvent.click(await screen.findByRole('button', { name: 'Clear saved puzzles' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear saved puzzles?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear saved puzzles' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('could not be cleared')
    expect(screen.getByRole('dialog', { name: 'Clear saved puzzles?' })).toBeInTheDocument()
  })
})
