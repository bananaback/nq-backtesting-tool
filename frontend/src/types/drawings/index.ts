export type { FvgDrawing, VerticalLineDrawing } from './fvg'
export type { FibDrawing, FibLevel, FibLineStyle, FibTemplateKey } from './fib'
export type { OrgDrawing } from './org'
export type { LineDrawing } from './line'
export type { ObDrawing } from './ob'
export type { EntryDrawing, EntryDirection, EntryStatus, EntryPlacementState } from './entry'

import type { FvgDrawing } from './fvg'
import type { FibDrawing } from './fib'
import type { OrgDrawing } from './org'
import type { LineDrawing } from './line'
import type { ObDrawing } from './ob'
import type { EntryDrawing } from './entry'
import type { VerticalLineDrawing } from './fvg'

export type Drawing = FvgDrawing | LineDrawing | ObDrawing | OrgDrawing | VerticalLineDrawing | FibDrawing | EntryDrawing

export type DrawingDraft = Omit<FvgDrawing, 'id'> | Omit<LineDrawing, 'id'> | Omit<ObDrawing, 'id'> | Omit<OrgDrawing, 'id'> | Omit<VerticalLineDrawing, 'id'> | Omit<FibDrawing, 'id'> | Omit<EntryDrawing, 'id'>
