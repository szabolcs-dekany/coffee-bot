export const COFFEE_TYPES = {
  WITH_MILK: '🥛',
  BLACK: '☕️',
} as const

export const AROMA_STRENGTHS = {
  LEVEL_1: '🫘',
  LEVEL_2: '🫘🫘',
  LEVEL_3: '🫘🫘🫘',
  LEVEL_4: '🫘🫘🫘🫘',
  LEVEL_5: '🫘🫘🫘🫘🫘',
} as const

export const SUGAR_LEVELS = {
  NONE: 'none',
  ONE: '🍰',
  TWO: '🍰🍰',
  THREE: '🍰🍰🍰',
  FOUR: '🍰🍰🍰🍰',
} as const

export const TEMPERATURES = {
  HOT: '🥵',
  ROOM: '🏡🛋️',
  COLD: '🧊',
} as const

export const AROMA_STRENGTH_MAP: Record<string, number> = {
  '🫘': 1,
  '🫘🫘': 2,
  '🫘🫘🫘': 3,
  '🫘🫘🫘🫘': 4,
  '🫘🫘🫘🫘🫘': 5,
}

export const SUGAR_MAP: Record<string, number> = {
  none: 0,
  '🍰': 1,
  '🍰🍰': 2,
  '🍰🍰🍰': 3,
  '🍰🍰🍰🍰': 4,
}

export const TEMPERATURE_LABELS: Record<string, string> = {
  '🥵': 'Hot',
  '🏡🛋️': 'Room Temp',
  '🧊': 'Cold',
}

export const COFFEE_TYPE_LABELS: Record<string, string> = {
  '🥛': 'With Milk',
  '☕️': 'Black Coffee',
}
