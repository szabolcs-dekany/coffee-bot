import { Client, Events } from 'discord.js'
import { config } from './config'
import { commands } from './commands'
import { deployCommandsGlobally } from './deploy-command'
import pino from 'pino'
import { connect } from './MongoConfig'
import { handleInteraction } from './commands/response/GenericSelectMenuHandler'
import { CoffeeFavoriteDocument } from './documents/CoffeeFavorite'

const logger = pino({
  name: 'coffee-bot-main',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

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

client.login(config.DISCORD_TOKEN).then(() => logger.info('Bot logged in! ⌨️'))
