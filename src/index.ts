import { Client, Events } from 'discord.js'
import { config } from './config'
import { commands } from './commands'
import { deployCommandsGlobally } from './deploy-command'
import { connect } from './MongoConfig'
import { handleInteraction } from './commands/response/GenericSelectMenuHandler'
import { CoffeeFavoriteDocument } from './documents/CoffeeFavorite'
import {
  initializeDefaultChallenges,
  archiveExpiredChallenges,
  evaluateTeamChallenges,
} from './utils/challengeUtils'
import { createLogger } from './utils/logger'

const logger = createLogger('main')

/**
 * Escape regex metacharacters to prevent ReDoS attacks
 * @param str - The string to escape
 * @returns The escaped string safe for regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const client = new Client({
  intents: [
    'Guilds',
    'GuildMessages',
    'DirectMessages',
    'GuildMembers',
    'GuildPresences',
  ],
})

client.once(Events.ClientReady, async () => {
  await deployCommandsGlobally()
  await connect()

  // Initialize challenges
  await initializeDefaultChallenges()
  await archiveExpiredChallenges()

  // Schedule weekly challenge refresh at midnight every Monday
  scheduleWeeklyChallengeRefresh()

  // Schedule team challenge evaluation every 6 hours
  scheduleTeamChallengeEvaluation()

  logger.info('Discord bot is ready! 🤖')
})

client.on(Events.InteractionCreate, async interaction => {
  logger.info(`Interaction received: ${interaction.type}`)

  if (interaction.isStringSelectMenu()) {
    logger.info('Handling select menu! 📝')
    await handleInteraction(interaction)
  }

  if (interaction.isAutocomplete()) {
    logger.info('Handling autocomplete! 🔍')
    const { commandName } = interaction

    if (commandName === 'usefavorite' || commandName === 'deletefavorite') {
      try {
        const focusedValue = interaction.options.getFocused()
        const userId = interaction.user.id
        const escapedValue = escapeRegex(focusedValue)

        const favorites = await CoffeeFavoriteDocument.find({
          userId: userId,
          favoriteName: { $regex: escapedValue, $options: 'i' },
        })
          .limit(25)
          .sort({ favoriteName: 1 })

        const choices = favorites.map(fav => ({
          name: fav.favoriteName,
          value: fav.favoriteName,
        }))

        await interaction.respond(choices)
        logger.info(
          `Autocomplete response sent with ${choices.length} choices for ${commandName}`,
        )
      } catch (error) {
        logger.error('Error handling autocomplete:', {
          error,
          commandName,
          userId: interaction.user.id,
        })
        await interaction.respond([])
      }
    }
    return
  }

  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction
    if (commands[commandName as keyof typeof commands]) {
      logger.info(`Handling command ${commandName} 📲`)
      await commands[commandName as keyof typeof commands].execute(interaction)
    } else {
      logger.error(`Command ${commandName} not found! 🤷‍♂️`)
    }
  }

  return
})

/**
 * Schedule weekly challenge refresh for Monday at midnight
 */
function scheduleWeeklyChallengeRefresh(): void {
  const now = new Date()
  const nextMonday = new Date()
  nextMonday.setDate(nextMonday.getDate() - nextMonday.getDay() + 1)
  nextMonday.setHours(0, 0, 0, 0)

  // If it's already past Monday this week, schedule for next week
  if (nextMonday <= now) {
    nextMonday.setDate(nextMonday.getDate() + 7)
  }

  const timeUntilNextMonday = nextMonday.getTime() - now.getTime()

  logger.info(
    `📅 Weekly challenge refresh scheduled for ${nextMonday.toISOString()}`,
  )

  setTimeout(async () => {
    try {
      await archiveExpiredChallenges()
      await initializeDefaultChallenges()
      logger.info('🔄 Weekly challenges refreshed!')
    } catch (error) {
      logger.error('Error refreshing weekly challenges:', error)
    }

    // Schedule again for next week
    setInterval(
      async () => {
        try {
          await archiveExpiredChallenges()
          await initializeDefaultChallenges()
          logger.info('🔄 Weekly challenges refreshed!')
        } catch (error) {
          logger.error('Error refreshing weekly challenges:', error)
        }
      },
      7 * 24 * 60 * 60 * 1000,
    ) // Every 7 days
  }, timeUntilNextMonday)
}

/**
 * Schedule team challenge evaluation every 6 hours
 */
function scheduleTeamChallengeEvaluation(): void {
  logger.info('👥 Team challenge evaluation scheduled (every 6 hours)')

  // Run immediately
  evaluateTeamChallenges().catch(error => {
    logger.error('Error evaluating team challenges:', error)
  })

  // Then run every 6 hours
  setInterval(
    async () => {
      try {
        await evaluateTeamChallenges()
        logger.info('✅ Team challenges evaluated')
      } catch (error) {
        logger.error('Error evaluating team challenges:', error)
      }
    },
    6 * 60 * 60 * 1000,
  ) // Every 6 hours
}

client.login(config.DISCORD_TOKEN).then(() => logger.info('Bot logged in! ⌨️'))
