export const ROLES = {
  COFFEE_CREW_CORE: 'coffee-crew-core',
  COFFEE_CREW: 'coffee-crew',
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]
