import { Client, Events } from 'discord.js'
import { config } from './config'
import { commands } from './commands'
import { deployCommandsGlobally } from './deploy-command'
import pino from 'pino'
import { connect } from './MongoConfig'
import { handleInteraction } from './commands/response/GenericSelectMenuHandler'

const logger = pino({
  name: 'coffee-bot-main',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

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
    const { CoffeeFavoriteDocument } = await import(
      './documents/CoffeeFavorite'
    )
    const { commandName } = interaction

    if (commandName === 'usefavorite' || commandName === 'deletefavorite') {
      const focusedValue = interaction.options.getFocused()
      const userId = interaction.user.id

      const favorites = await CoffeeFavoriteDocument.find({
        userId: userId,
        favoriteName: { $regex: focusedValue, $options: 'i' },
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
    }
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
