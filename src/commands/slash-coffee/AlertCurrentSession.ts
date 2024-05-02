import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-alert-crew-members',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('alert')
  .setDescription('Alert latest session coffee crew that their ☕️ is ready')
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('Optional message to send to coffee crew members')
      .setRequired(false),
  )

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

  await interaction.deferReply()

  const coffeeRequests = await CoffeeRequestDocument.find({
    sessionId: latestSession.sessionId,
  })

  const userIdsToAlert = coffeeRequests.map(request => request.coffeeCrewPerson)

  logger.info(`User IDs to alert: ${userIdsToAlert}`)
  const optionalMessage = interaction.options.data[0].value

  const actualMessage = optionalMessage
    ? optionalMessage
    : 'Hey, your coffee is ready! ☕️'

  for (const userId of userIdsToAlert) {
    const user = await interaction.guild?.members.fetch(userId)
    if (user) {
      try {
        const dmChannel = await user.createDM()
        await dmChannel.send({
          content: actualMessage.toString(),
        })
      } catch (error) {
        logger.error(
          `Could not send coffee order DM to ${user.user.tag} \n${error}`,
        )
      }
    }
  }
  //Send DMs to the user ids in the userIdsToAlert array

  return interaction.followUp('Alerted coffee crew members! ☕️')
}
