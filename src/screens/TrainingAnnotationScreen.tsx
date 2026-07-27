import { type ChangeEvent, type KeyboardEvent, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { emptyGrid } from '../engine/board'
import { findSolutions } from '../engine/fullSolver'
import type { Digit, Grid } from '../engine/types'
import { validatePuzzle } from '../engine/validatePuzzle'
import { cluesToGrid, gridToClues, parsePreparationIndex, type ManifestEntry, type PreparationImage } from '../training/manifest'

const hashFile = async (file: File) => {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const keyFor = (row: number, col: number) => `${row}:${col}`

export function TrainingAnnotationScreen() {
  const [preparation, setPreparation] = useState<Map<string, PreparationImage>>(new Map())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [grid, setGrid] = useState<Grid>(emptyGrid())
  const [selected, setSelected] = useState({ row: 0, col: 0 })
  const [entries, setEntries] = useState<ManifestEntry[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])

  const validation = useMemo(() => validatePuzzle(grid), [grid])
  const conflicts = useMemo(() => new Set(validation.conflicts.map(({ row, col }) => keyFor(row, col))), [validation])
  const preparationImage = selectedFile ? preparation.get(selectedFile.name) : undefined

  const chooseIndex = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = parsePreparationIndex(await file.text())
      setPreparation(parsed)
      setMessage(`Loaded ${parsed.size} prepared-photo records.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read the preparation index.')
    }
  }

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setFileHash(await hashFile(file))
    const saved = entries.find((entry) => entry.preparedFile === file.name)
    setGrid(saved ? cluesToGrid(saved.clues) : emptyGrid())
    setSelected({ row: 0, col: 0 })
    setMessage(null)
  }

  const setValue = (value: Digit | null) => {
    setGrid((current) => current.map((row, rowIndex) => row.map((cell, columnIndex) => rowIndex === selected.row && columnIndex === selected.col ? value : cell)))
  }

  const focusCell = (position: { row: number; col: number }) => {
    setSelected(position)
    cellRefs.current[position.row * 9 + position.col]?.focus()
  }

  const move = (rowDelta: number, colDelta: number) => {
    focusCell({ row: (selected.row + rowDelta + 9) % 9, col: (selected.col + colDelta + 9) % 9 })
  }

  const enterDigit = (digit: Digit) => {
    setValue(digit)
    focusCell({ row: selected.col === 8 ? (selected.row + 1) % 9 : selected.row, col: (selected.col + 1) % 9 })
  }

  const onCellKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]
    }
    const movement = arrows[event.key]
    if (movement) {
      event.preventDefault()
      move(...movement)
      return
    }
    const keypadDigit = /^Numpad([1-9])$/.exec(event.code)?.[1]
    const digit = /^[1-9]$/.test(event.key) ? event.key : keypadDigit
    if (digit) {
      event.preventDefault()
      enterDigit(Number(digit) as Digit)
      return
    }
    if (event.key === '0' || event.code === 'Numpad0' || event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      setValue(null)
    }
  }

  const saveAnnotation = () => {
    if (!selectedFile || !fileHash) return setMessage('Select a prepared JPEG first.')
    if (!preparationImage) return setMessage('That image is not listed in the loaded preparation index.')
    if (fileHash !== preparationImage.preparedSha256) return setMessage('Prepared JPEG hash does not match the index. Re-run preparation before annotating.')
    if (!validation.valid) return setMessage('Duplicate starting clues must be corrected before saving.')
    if (!findSolutions(grid, 2).length) return setMessage('This clue set has no solution. Correct the annotation before saving.')
    const entry: ManifestEntry = { ...preparationImage, clues: gridToClues(grid), annotatedAt: new Date().toISOString() }
    setEntries((current) => [...current.filter((candidate) => candidate.preparedFile !== entry.preparedFile), entry].sort((a, b) => a.preparedFile.localeCompare(b.preparedFile)))
    setMessage(`Saved annotation for ${entry.preparedFile}.`)
  }

  const downloadManifest = () => {
    if (entries.length !== 4) return setMessage('Save annotations for all four photos before downloading the manifest.')
    const payload = JSON.stringify({ schemaVersion: 1, entries }, null, 2)
    const url = URL.createObjectURL(new Blob([`${payload}\n`], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'manifest.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Manifest downloaded. Save it as training-data/manifest.json.')
  }

  return <section className="annotation-screen">
    <div className="screen-heading">
      <p className="eyebrow">Development only</p>
      <h1>Annotate private training photos</h1>
      <p>Load the private preparation index, select one prepared JPEG, and enter only the printed starting clues. Nothing is uploaded.</p>
    </div>
    <label className="file-field">Preparation index<input type="file" accept="application/json" onChange={chooseIndex} /></label>
    <label className="file-field">Prepared photo<input type="file" accept="image/jpeg" onChange={choosePhoto} /></label>
    {preview && <div className="annotation-photo"><img src={preview} alt="Private Sudoku photo being annotated" /></div>}
    {message && <p className="diagnostic" role="status">{message}</p>}
    {!validation.valid && <p className="form-error" role="alert">Duplicate clues are highlighted.</p>}
    <div className="board annotation-board" role="grid" aria-label="Annotated Sudoku starting clues">
      {grid.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
        const position = { row: rowIndex, col: columnIndex }
        const isSelected = selected.row === rowIndex && selected.col === columnIndex
        const className = ['board-cell', isSelected && 'is-selected', conflicts.has(keyFor(rowIndex, columnIndex)) && 'is-conflict'].filter(Boolean).join(' ')
        return <button type="button" role="gridcell" key={keyFor(rowIndex, columnIndex)} ref={(element) => { cellRefs.current[rowIndex * 9 + columnIndex] = element }} className={className} onClick={() => setSelected(position)} onKeyDown={onCellKeyDown} tabIndex={isSelected ? 0 : -1} aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}${value ? `, ${value}` : ', empty'}`} aria-selected={isSelected}>{value}</button>
      }))}
    </div>
    <div className="number-pad" aria-label="Annotation keypad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button key={digit} type="button" onClick={() => setValue(digit as Digit)}>{digit}</button>)}
      <button type="button" className="wide-key" onClick={() => setValue(null)}>Clear cell</button>
    </div>
    <button type="button" className="secondary-action wide" onClick={() => setGrid(emptyGrid())}>Clear this board</button>
    <button type="button" className="primary-action wide" onClick={saveAnnotation}>Save this annotation</button>
    <button type="button" className="primary-action wide" disabled={entries.length !== 4} onClick={downloadManifest}>Download manifest ({entries.length}/4)</button>
    <Link className="text-button annotation-back" to="/">Back to SudoCoach</Link>
  </section>
}
