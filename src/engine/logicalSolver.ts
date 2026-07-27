import { boxIndex } from './board'
import { candidateKey, getCandidates } from './candidates'
import { DIGITS, type CellPosition, type Digit, type Grid, type HintConstraint, type SolverStep, type UnitKind } from './types'

const unitCells = (kind: UnitKind, index: number): CellPosition[] => {
  if (kind === 'row') return Array.from({ length: 9 }, (_, col) => ({ row: index, col }))
  if (kind === 'column') return Array.from({ length: 9 }, (_, row) => ({ row, col: index }))
  const top = Math.floor(index / 3) * 3
  const left = (index % 3) * 3
  return Array.from({ length: 9 }, (_, i) => ({ row: top + Math.floor(i / 3), col: left + (i % 3) }))
}

const candidatesAt = (candidates: ReturnType<typeof getCandidates>, position: CellPosition) => candidates.get(candidateKey(position)) ?? []
const sameArray = (a: Digit[], b: Digit[]) => a.length === b.length && a.every((value, index) => value === b[index])
const samePosition = (a: CellPosition, b: CellPosition) => a.row === b.row && a.col === b.col
const positionText = ({ row, col }: CellPosition) => `R${row + 1}C${col + 1}`
const unitText = (kind: UnitKind, index: number) => kind === 'box' ? `box ${index + 1}` : `${kind} ${index + 1}`

const targetUnits = ({ row, col }: CellPosition) => [
  { kind: 'row' as const, index: row },
  { kind: 'column' as const, index: col },
  { kind: 'box' as const, index: boxIndex({ row, col }) }
]

const constraintsFor = (grid: Grid, position: CellPosition): HintConstraint[] => targetUnits(position).map((unit) => ({
  ...unit,
  values: unitCells(unit.kind, unit.index).map((cell) => grid[cell.row][cell.col]).filter(Boolean) as Digit[]
}))

const uniqueUnits = (units: Array<{ kind: UnitKind; index: number }>) =>
  units.filter((unit, index) => units.findIndex((candidate) => candidate.kind === unit.kind && candidate.index === unit.index) === index)

/** Rank equally valid deductions by how few placed facts a player must inspect. */
const compareClarity = (grid: Grid, a: SolverStep, b: SolverStep) => {
  const evidenceBurden = (step: SolverStep) => {
    const target = step.targetCells[0]
    const units = uniqueUnits([...targetUnits(target), ...step.focusUnits])
    return units.reduce((total, unit) => total + unitCells(unit.kind, unit.index).filter((cell) => Boolean(grid[cell.row][cell.col])).length, 0)
  }
  const aBurden = evidenceBurden(a)
  const bBurden = evidenceBurden(b)
  if (aBurden !== bBurden) return aBurden - bBurden
  if (a.targetCells.length !== b.targetCells.length) return a.targetCells.length - b.targetCells.length
  if (a.supportingCells.length !== b.supportingCells.length) return a.supportingCells.length - b.supportingCells.length
  const aTarget = a.targetCells[0]
  const bTarget = b.targetCells[0]
  return aTarget.row - bTarget.row || aTarget.col - bTarget.col
}

const clearest = (grid: Grid, steps: SolverStep[]) => steps.sort((a, b) => compareClarity(grid, a, b))[0] ?? null

const nakedSingle = (grid: Grid): SolverStep | null => {
  const candidates = getCandidates(grid)
  const steps: SolverStep[] = []
  for (const [key, values] of candidates) if (values.length === 1) {
    const [row, col] = key.split(':').map(Number)
    const target = { row, col }
    steps.push({
      technique: 'naked-single', action: 'place-number', targetCells: [target], supportingCells: [], focusUnits: targetUnits(target), value: values[0],
      evidence: { targetCandidates: values, constraints: constraintsFor(grid, target) },
      explanation: `${positionText(target)} has only one possible value: ${values[0]}.`
    })
  }
  return clearest(grid, steps)
}

const hiddenSingle = (grid: Grid): SolverStep | null => {
  const candidates = getCandidates(grid)
  const steps: SolverStep[] = []
  for (const kind of ['row', 'column', 'box'] as UnitKind[]) for (let index = 0; index < 9; index += 1) {
    const cells = unitCells(kind, index).filter((cell) => !grid[cell.row][cell.col])
    for (const value of DIGITS) {
      const matches = cells.filter((cell) => candidatesAt(candidates, cell).includes(value))
      if (matches.length !== 1) continue
      const target = matches[0]
      steps.push({
        technique: 'hidden-single', action: 'place-number', targetCells: [target], supportingCells: cells.filter((cell) => !samePosition(cell, target)), focusUnits: [{ kind, index }], value,
        evidence: { targetCandidates: candidatesAt(candidates, target) },
        explanation: `${value} can only go in ${positionText(target)} within ${unitText(kind, index)}.`
      })
    }
  }
  return clearest(grid, steps)
}

const nakedPair = (grid: Grid): SolverStep | null => {
  const candidates = getCandidates(grid)
  const steps: SolverStep[] = []
  for (const kind of ['row', 'column', 'box'] as UnitKind[]) for (let index = 0; index < 9; index += 1) {
    const cells = unitCells(kind, index).filter((cell) => !grid[cell.row][cell.col])
    for (let first = 0; first < cells.length; first += 1) {
      const pair = candidatesAt(candidates, cells[first])
      if (pair.length !== 2) continue
      const partner = cells.slice(first + 1).find((cell) => sameArray(candidatesAt(candidates, cell), pair))
      if (!partner) continue
      const targets = cells.filter((cell) => !samePosition(cell, cells[first]) && !samePosition(cell, partner) && candidatesAt(candidates, cell).some((value) => pair.includes(value)))
      if (targets.length) steps.push({
        technique: 'naked-pair', action: 'remove-candidate', targetCells: targets, supportingCells: [cells[first], partner], focusUnits: [{ kind, index }], removedCandidates: pair,
        explanation: `${pair.join(' and ')} are locked in ${positionText(cells[first])} and ${positionText(partner)}, so remove them from the other cells in ${unitText(kind, index)}.`
      })
    }
  }
  return clearest(grid, steps)
}

const pointingPair = (grid: Grid): SolverStep | null => {
  const candidates = getCandidates(grid)
  const steps: SolverStep[] = []
  for (let box = 0; box < 9; box += 1) for (const value of DIGITS) {
    const supporters = unitCells('box', box).filter((cell) => candidatesAt(candidates, cell).includes(value))
    if (supporters.length < 2) continue
    const sharedRow = supporters.every((cell) => cell.row === supporters[0].row)
    const sharedCol = supporters.every((cell) => cell.col === supporters[0].col)
    if (!sharedRow && !sharedCol) continue
    const kind: UnitKind = sharedRow ? 'row' : 'column'
    const index = sharedRow ? supporters[0].row : supporters[0].col
    const targets = unitCells(kind, index).filter((cell) => boxIndex(cell) !== box && candidatesAt(candidates, cell).includes(value))
    if (targets.length) steps.push({
      technique: 'pointing-pair', action: 'remove-candidate', targetCells: targets, supportingCells: supporters, focusUnits: [{ kind: 'box', index: box }, { kind, index }], removedCandidates: [value],
      explanation: `In box ${box + 1}, ${value} is confined to this ${kind}; remove it from the rest of ${unitText(kind, index)}.`
    })
  }
  return clearest(grid, steps)
}

const boxLineReduction = (grid: Grid): SolverStep | null => {
  const candidates = getCandidates(grid)
  const steps: SolverStep[] = []
  for (const kind of ['row', 'column'] as const) for (let index = 0; index < 9; index += 1) for (const value of DIGITS) {
    const supporters = unitCells(kind, index).filter((cell) => candidatesAt(candidates, cell).includes(value))
    if (supporters.length < 2 || !supporters.every((cell) => boxIndex(cell) === boxIndex(supporters[0]))) continue
    const box = boxIndex(supporters[0])
    const targets = unitCells('box', box).filter((cell) => !samePosition(cell, supporters[0]) && !supporters.some((supporter) => samePosition(cell, supporter)) && candidatesAt(candidates, cell).includes(value))
    if (targets.length) steps.push({
      technique: 'box-line-reduction', action: 'remove-candidate', targetCells: targets, supportingCells: supporters, focusUnits: [{ kind, index }, { kind: 'box', index: box }], removedCandidates: [value],
      explanation: `${value} is restricted to one box in ${unitText(kind, index)}, so remove it from the remaining cells in box ${box + 1}.`
    })
  }
  return clearest(grid, steps)
}

/** Returns the clearest available human-style next step; it never uses the full solution or mutates the grid. */
export const getNextLogicalStep = (grid: Grid): SolverStep | null =>
  nakedSingle(grid) ?? hiddenSingle(grid) ?? nakedPair(grid) ?? pointingPair(grid) ?? boxLineReduction(grid)
