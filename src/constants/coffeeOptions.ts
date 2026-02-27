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

export type AromaKey = (typeof AROMA_STRENGTHS)[keyof typeof AROMA_STRENGTHS]
export type SugarKey = (typeof SUGAR_LEVELS)[keyof typeof SUGAR_LEVELS]
export type TemperatureKey = (typeof TEMPERATURES)[keyof typeof TEMPERATURES]
export type CoffeeTypeKey = (typeof COFFEE_TYPES)[keyof typeof COFFEE_TYPES]

export const AROMA_STRENGTH_MAP: Readonly<Record<AromaKey, number>> = {
  '🫘': 1,
  '🫘🫘': 2,
  '🫘🫘🫘': 3,
  '🫘🫘🫘🫘': 4,
  '🫘🫘🫘🫘🫘': 5,
}

export const SUGAR_MAP: Readonly<Record<SugarKey, number>> = {
  none: 0,
  '🍰': 1,
  '🍰🍰': 2,
  '🍰🍰🍰': 3,
  '🍰🍰🍰🍰': 4,
}

export const TEMPERATURE_LABELS: Readonly<Record<TemperatureKey, string>> = {
  '🥵': 'Hot',
  '🏡🛋️': 'Room Temp',
  '🧊': 'Cold',
}

export const COFFEE_TYPE_LABELS: Readonly<Record<CoffeeTypeKey, string>> = {
  '🥛': 'With Milk',
  '☕️': 'Black Coffee',
}
