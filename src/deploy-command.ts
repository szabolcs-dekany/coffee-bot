import { REST, Routes } from 'discord.js'
import { config } from './config'
import { commands } from './commands'
import { createLogger } from './utils/logger'

const commandsData = Object.values(commands).map(command => command.data)

const rest = new REST().setToken(config.DISCORD_TOKEN)

const logger = createLogger('deploy-commands')

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
