import { CommandInteraction, GuildMember } from 'discord.js'
import { ROLES } from '../constants'

export interface PermissionCheckResult {
  valid: boolean
  member?: GuildMember
}

export class PermissionService {
  static hasRole(member: GuildMember | undefined, roleName: string): boolean {
    return member?.roles.cache.some(role => role.name === roleName) ?? false
  }

  static hasCoffeeCrewCoreRole(interaction: CommandInteraction): boolean {
    const member = interaction.guild?.members.cache.get(interaction.user.id)
    return this.hasRole(member, ROLES.COFFEE_CREW_CORE)
  }

  static requireCoffeeCrewCore(
    interaction: CommandInteraction,
  ): PermissionCheckResult {
    const member = interaction.guild?.members.cache.get(interaction.user.id)
    const hasRole = this.hasRole(member, ROLES.COFFEE_CREW_CORE)
    return { valid: hasRole, member }
  }
}
