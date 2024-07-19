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
    return interaction.reply({
      content: 'You do not have the coffee crew core role! ☕️',
      ephemeral: true,
    })
  }
  const latestSession = await CoffeeSessionDocument.findOne().sort({
    startDateTime: -1,
  })

  if (!latestSession) {
    return interaction.reply('No coffee sessions found.')
  }

  const coffeeRequests = await CoffeeRequestDocument.find({
    sessionId: latestSession.sessionId,
  })

  const aromaStrengthMap: { [key: string]: number } = {
    '🫘': 1,
    '🫘🫘': 2,
    '🫘🫘🫘': 3,
    '🫘🫘🫘🫘': 4,
    '🫘🫘🫘🫘🫘': 5,
  }

  coffeeRequests.sort((a, b) => {
    const aStrength = aromaStrengthMap[a.aromaStrength] || 0
    const bStrength = aromaStrengthMap[b.aromaStrength] || 0
    return aStrength - bStrength
  })

  let reply = ''

  reply += `**Session ID:** ${latestSession.sessionId}\n`
  reply += `**Start Date Time:** ${latestSession.startDateTime}\n`
  reply += `**Estimate Time of Coffee:** ${latestSession.estimatedTimeOfCoffee}\n`
  reply += `**Number of coffee crew people:** ${latestSession.coffeeCrewNumber}\n\n`

  coffeeRequests.forEach((request, index) => {
    reply += `**Request ${index + 1}:**\n`
    reply += `**Coffee Type:** ${request.coffeeType}\n`
    reply += `**Aroma Strength:** ${request.aromaStrength}\n`
    reply += `**Sugar:** ${request.sugar}\n`
    reply += `**Temperature:** ${request.temperature}\n`
    reply += `**Coffee Crew Person:** ${request.coffeeCrewPersonName}\n\n`
  })

  if (reply === '') {
    reply = 'No coffee requests found for the latest session.'
  }

  await interaction.reply(reply)
}
