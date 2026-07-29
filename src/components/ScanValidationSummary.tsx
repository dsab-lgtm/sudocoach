import type { SolutionStatus } from '../engine/types'

type ScanValidationSummaryProps = {
  hasClues: boolean
  hasConflicts: boolean
  hasRiskItems: boolean
  status: SolutionStatus | 'checking'
}

export function ScanValidationSummary({ hasClues, hasConflicts, hasRiskItems, status }: ScanValidationSummaryProps) {
  const detail = !hasClues
    ? ['neutral', 'Add the starting clues you can see in the photo.'] as const
    : hasConflicts || status === 'invalid'
      ? ['error', 'Duplicate clues need correction before the puzzle can be solved.'] as const
      : status === 'checking'
        ? ['neutral', 'Checking whether the clues form one puzzle…'] as const
        : status === 'unsolvable'
          ? ['error', hasRiskItems ? 'These clues cannot form a Sudoku. Recheck added, edited, and lower-confidence clues.' : 'These clues cannot form a Sudoku. Recheck the source photo before continuing.'] as const
          : status === 'ambiguous'
            ? ['warning', 'More verified clues are needed; these clues allow multiple solutions.'] as const
            : status === 'unique'
              ? ['success', 'Ready to solve: the reviewed clues have one solution.'] as const
              : ['neutral', 'Review the source clues before continuing.'] as const
  return <p className={`scan-validation-summary scan-validation-summary--${detail[0]}`} role="status" aria-live="polite">{detail[1]}</p>
}
