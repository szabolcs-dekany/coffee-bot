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

  if (interaction.isCommand()) {
    const { commandName } = interaction
    logger.info(`Handling command ${commandName} 📲`)
    if (commands[commandName as keyof typeof commands]) {
      await commands[commandName as keyof typeof commands].execute(interaction)
    }
  }

  return
})

client.login(config.DISCORD_TOKEN).then(() => logger.info('Bot logged in! ⌨️'))
