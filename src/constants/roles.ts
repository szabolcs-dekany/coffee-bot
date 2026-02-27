// NOTE: These should be Discord role IDs (snowflakes), not role names
// Role IDs are more stable - they don't change if the role is renamed
export const ROLES = {
  COFFEE_CREW_CORE: 'coffee-crew-core', // TODO: Replace with actual role ID
  COFFEE_CREW: 'coffee-crew', // TODO: Replace with actual role ID
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]
