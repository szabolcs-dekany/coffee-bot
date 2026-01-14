import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import { FeedbackDocument } from '../../documents/FeedbackDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-rate-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('rate')
  .setDescription('Rate the coffee from the latest or a specific session')
  .addIntegerOption(option =>
    option
      .setName('rating')
      .setDescription('Your rating (1-5 stars)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(5),
  )
  .addStringOption(option =>
    option
      .setName('comment')
      .setDescription('Optional comment about the coffee')
      .setRequired(false),
  )
  .addStringOption(option =>
    option
      .setName('session-id')
      .setDescription('Optional session ID (defaults to latest)')
      .setRequired(false),
  )

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const userName = interaction.user.displayName || interaction.user.username
  const userId = interaction.user.id
  const rating = interaction.options.data.find(opt => opt.name === 'rating')
    ?.value as number
  const comment = interaction.options.data.find(opt => opt.name === 'comment')
    ?.value as string | undefined
  const sessionIdOption = interaction.options.data.find(
    opt => opt.name === 'session-id',
  )?.value as string | undefined

  logger.info(`🚀 ${userName} is rating coffee with ${rating} stars`)

  try {
    let targetSessionId = sessionIdOption

    if (!targetSessionId) {
      logger.info('📋 Fetching latest coffee session')
      const latestSession = await CoffeeSessionDocument.findOne().sort({
        startDateTime: -1,
      })

      if (!latestSession) {
        logger.info('❌ No coffee sessions found')
        await interaction.followUp({
          content: 'No coffee sessions found to rate!',
          ephemeral: true,
        })
        return
      }

      targetSessionId = latestSession.sessionId
      logger.info(`✅ Using latest session: ${targetSessionId}`)
    }

    logger.info(
      `🔍 Checking if user ordered coffee in session ${targetSessionId}`,
    )
    const userOrder = await CoffeeRequestDocument.findOne({
      sessionId: targetSessionId,
      coffeeCrewPerson: userId,
    })

    if (!userOrder) {
      logger.info(`❌ ${userName} did not order coffee in this session`)
      await interaction.followUp({
        content: 'You didn\'t order coffee in this session! ☕️',
        ephemeral: true,
      })
      return
    }

    logger.info('🔍 Checking if user already rated this session')
    const existingFeedback = await FeedbackDocument.findOne({
      sessionId: targetSessionId,
      userId: userId,
    })

    if (existingFeedback) {
      logger.info(`🔄 Updating existing feedback for ${userName}`)
      existingFeedback.rating = rating
      existingFeedback.comment = comment
      await existingFeedback.save()
      logger.info('✅ Feedback updated successfully')
    } else {
      logger.info(`💾 Creating new feedback for ${userName}`)
      const feedback = new FeedbackDocument({
        sessionId: targetSessionId,
        userId: userId,
        userName: userName,
        rating: rating,
        comment: comment,
      })
      await feedback.save()
      logger.info('✅ Feedback created successfully')
    }

    const ratingStars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
    const responseText = `Thanks for your feedback! ${ratingStars}\n\nYour rating: **${rating}/5**${comment ? `\nYour comment: "${comment}"` : ''}`

    await interaction.followUp({
      content: responseText,
      ephemeral: true,
    })
    logger.info(`🎉 ${userName} successfully rated coffee with ${rating} stars`)
  } catch (error) {
    logger.error('Error saving coffee rating:', error)
    await interaction.followUp({
      content: 'There was an error saving your rating.',
      ephemeral: true,
    })
  }
}
