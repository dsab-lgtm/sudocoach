import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TestRouter } from '../test/TestRouter'
import { TrainingAnnotationScreen } from './TrainingAnnotationScreen'

const renderScreen = () => render(<TestRouter><TrainingAnnotationScreen /></TestRouter>)
const cell = (row: number, column: number) => screen.getByRole('gridcell', { name: new RegExp(`Row ${row}, column ${column}`) })

describe('TrainingAnnotationScreen keyboard controls', () => {
  it('moves focus with every arrow key and wraps at grid edges', () => {
    renderScreen()
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(cell(9, 1)).toHaveFocus()
    fireEvent.keyDown(cell(9, 1), { key: 'ArrowDown' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(cell(1, 9)).toHaveFocus()
    fireEvent.keyDown(cell(1, 9), { key: 'ArrowRight' })
    expect(first).toHaveFocus()
  })

  it('enters top-row and numpad digits, advances right, and wraps after the final cell', () => {
    renderScreen()
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: '4', code: 'Digit4' })
    expect(cell(1, 1)).toHaveTextContent('4')
    expect(cell(1, 2)).toHaveFocus()

    const final = cell(9, 9)
    fireEvent.click(final)
    final.focus()
    fireEvent.keyDown(final, { key: '8', code: 'Numpad8' })
    expect(final).toHaveTextContent('8')
    expect(cell(1, 1)).toHaveFocus()
  })

  it('clears a selected cell without moving focus', () => {
    renderScreen()
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: '7' })
    const second = cell(1, 2)
    fireEvent.keyDown(second, { key: 'Backspace' })
    expect(second).toHaveFocus()
    expect(second).toBeEmptyDOMElement()
  })

  it('does not intercept keyboard input outside annotation cells', () => {
    renderScreen()
    const first = cell(1, 1)
    const fileInput = screen.getByLabelText('Preparation index')
    fileInput.focus()
    fireEvent.keyDown(fileInput, { key: '9' })
    expect(first).toBeEmptyDOMElement()

    const save = screen.getByRole('button', { name: 'Save this annotation' })
    save.focus()
    fireEvent.keyDown(save, { key: '6' })
    expect(first).toBeEmptyDOMElement()
  })
})
