import { REST, Routes } from 'discord.js'
import { config } from './config'
import { commands } from './commands'
import pino from 'pino'

const commandsData = Object.values(commands).map(command => command.data)

const rest = new REST().setToken(config.DISCORD_TOKEN)

const logger = pino({
  name: 'coffee-bot-deploy-commands',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export async function deployCommandsGlobally() {
  try {
    logger.info('Started refreshing application (/) commands. 🗡️')
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
      body: commandsData,
    })

    logger.info('Successfully reloaded application (/) commands. 🗡️')
  } catch (error) {
    logger.error(error)
  }
}
