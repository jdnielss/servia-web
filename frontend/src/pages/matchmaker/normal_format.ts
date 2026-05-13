/** Normal (tennis-style) scoring formats for matchmaker. Legacy DB values are normalized at runtime. */

export type NormalFormatNew =
  | 'FIRST_TO_3'
  | 'FIRST_TO_4'
  | 'FIRST_TO_5'
  | 'FIRST_TO_6'
  | 'FIRST_TO_7'
  | 'TOTAL_OF_3'
  | 'TOTAL_OF_4'
  | 'TOTAL_OF_5'
  | 'TOTAL_OF_6'
  | 'TOTAL_OF_7';

export type NormalFormatStored =
  | NormalFormatNew
  | 'BEST_OF_3'
  | 'TOTAL_GAMES_4'
  | 'TOTAL_GAMES_6';

export const NORMAL_FORMAT_OPTIONS: { value: NormalFormatNew; label: string }[] = [
  { value: 'FIRST_TO_3', label: 'First to 3' },
  { value: 'FIRST_TO_4', label: 'First to 4' },
  { value: 'FIRST_TO_5', label: 'First to 5' },
  { value: 'FIRST_TO_6', label: 'First to 6' },
  { value: 'FIRST_TO_7', label: 'First to 7' },
  { value: 'TOTAL_OF_3', label: 'Total of 3' },
  { value: 'TOTAL_OF_4', label: 'Total of 4' },
  { value: 'TOTAL_OF_5', label: 'Total of 5' },
  { value: 'TOTAL_OF_6', label: 'Total of 6' },
  { value: 'TOTAL_OF_7', label: 'Total of 7' },
];

const LEGACY_TO_NEW: Record<string, NormalFormatNew> = {
  BEST_OF_3: 'FIRST_TO_7',
  TOTAL_GAMES_4: 'FIRST_TO_4',
  TOTAL_GAMES_6: 'FIRST_TO_6',
};

const NEW_SET = new Set(NORMAL_FORMAT_OPTIONS.map((o) => o.value));

export function normalizeNormalFormat(raw: string | undefined): NormalFormatNew {
  if (!raw) return 'FIRST_TO_7';
  if (LEGACY_TO_NEW[raw]) return LEGACY_TO_NEW[raw];
  if (NEW_SET.has(raw as NormalFormatNew)) return raw as NormalFormatNew;
  return 'FIRST_TO_7';
}

export function labelForNormalFormat(fmt: NormalFormatNew): string {
  return NORMAL_FORMAT_OPTIONS.find((o) => o.value === fmt)?.label ?? fmt;
}

export type TennisLimits =
  | { mode: 'first_to'; cap: number }
  | { mode: 'total_of'; cap: number };

export function tennisLimits(fmt: NormalFormatNew): TennisLimits {
  if (fmt.startsWith('FIRST_TO_')) {
    const cap = Number(fmt.replace('FIRST_TO_', ''));
    return { mode: 'first_to', cap };
  }
  if (fmt.startsWith('TOTAL_OF_')) {
    const cap = Number(fmt.replace('TOTAL_OF_', ''));
    return { mode: 'total_of', cap };
  }
  return { mode: 'first_to', cap: 7 };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Pair of games in one set after editing team 1’s games. */
export function clampPairAfterEditTeam1(a: number, b: number, limits: TennisLimits): [number, number] {
  if (limits.mode === 'first_to') {
    const c = limits.cap;
    return [clamp(a, 0, c), clamp(b, 0, c)];
  }
  const cap = limits.cap;
  let aa = clamp(a, 0, cap);
  let bb = clamp(b, 0, cap);
  if (aa + bb > cap) bb = Math.max(0, cap - aa);
  return [aa, bb];
}

/** Pair of games in one set after editing team 2’s games. */
export function clampPairAfterEditTeam2(a: number, b: number, limits: TennisLimits): [number, number] {
  if (limits.mode === 'first_to') {
    const c = limits.cap;
    return [clamp(a, 0, c), clamp(b, 0, c)];
  }
  const cap = limits.cap;
  let aa = clamp(a, 0, cap);
  let bb = clamp(b, 0, cap);
  if (aa + bb > cap) aa = Math.max(0, cap - bb);
  return [aa, bb];
}
