import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { StatsService } from '../../services/StatsService'
import { StatsFormatter } from '../../formatters/StatsFormatter'
import { createLogger } from '../../utils/logger'

const logger = createLogger('coffee-stats-command')

export const data = new SlashCommandBuilder()
  .setName('coffeestats')
  .setDescription('Displays statistics about coffee requests')

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply()
  logger.info('Starting coffee statistics generation...')

  try {
    const stats = await StatsService.getAllStats()
    const { reply1, reply2 } = StatsFormatter.formatStats(stats)

    await interaction.followUp(reply1)
    logger.info('Coffee statistics part 1 sent successfully')

    await new Promise(resolve => setTimeout(resolve, 500))

    await interaction.followUp(reply2)
    logger.info('Coffee statistics part 2 sent successfully', {
      totalSessions: stats.totals.sessions,
      totalRequests: stats.totals.requests,
      coffeeTypesFound: stats.coffeeTypes.length,
      topDrinkersFound: stats.topDrinkers.length,
      personalitiesFound: stats.personalities.length,
      combinationsFound: stats.combinations.length,
      participationStatsFound: stats.participation.length,
    })
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp(
      'There was an error fetching the coffee statistics.',
    )
  }
}
