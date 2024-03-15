import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-list-latest-coffee-session-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})
export const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Lists all coffee requests for the newest session')

export async function execute(interaction: CommandInteraction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id)
  const roles = member?.roles.cache

  const hasCoffeeCrewRole = roles?.some(
    role => role.name === 'coffee-crew-core',
  )

  if (!hasCoffeeCrewRole) {
    logger.info(
      `User ${interaction.user.tag} does not have the coffee crew role`,
    )
    return interaction.reply('You do not have the coffee crew core role! ☕️')
  }
  // Fetch the latest coffee session
  const latestSession = await CoffeeSessionDocument.findOne().sort({
    startDateTime: -1,
  })

  if (!latestSession) {
    return interaction.reply('No coffee sessions found.')
  }

  // Fetch all coffee requests for the latest session
  const coffeeRequests = await CoffeeRequestDocument.find({
    sessionId: latestSession.sessionId,
  })

  // Format the coffee requests into a string
  let reply = ''
  coffeeRequests.forEach((request, index) => {
    reply += `**Request ${index + 1}:**\n`
    reply += `**Coffee Type:** ${request.coffeeType}\n`
    reply += `**Milk Type:** ${request.milkType}\n`
    reply += `**Aroma Strength:** ${request.aromaStrength}\n`
    reply += `**Sugar:** ${request.sugar}\n`
    reply += `**Coffee Crew Person:** ${request.coffeeCrewPersonName}\n\n`
  })

  // If no requests were found, reply with a message saying so
  if (reply === '') {
    reply = 'No coffee requests found for the latest session.'
  }

  // Reply to the interaction with the list of coffee requests
  await interaction.reply(reply)
}
