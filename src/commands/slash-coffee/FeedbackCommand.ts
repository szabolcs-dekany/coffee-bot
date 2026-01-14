import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { FeedbackDocument } from '../../documents/FeedbackDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-feedback-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('View feedback for a coffee session')
  .addStringOption(option =>
    option
      .setName('session-id')
      .setDescription('Session ID (defaults to latest)')
      .setRequired(false),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const sessionIdOption = interaction.options.getString('session-id')

  logger.info('🚀 Fetching coffee feedback...')

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
          content: 'No coffee sessions found!',
          ephemeral: true,
        })
        return
      }

      targetSessionId = latestSession.sessionId
      logger.info(`✅ Using latest session: ${targetSessionId}`)
    } else {
      logger.info(`🔍 Validating session ${targetSessionId} exists`)
      const session = await CoffeeSessionDocument.findOne({
        sessionId: targetSessionId,
      })

      if (!session) {
        logger.info(`❌ Session ${targetSessionId} not found`)
        await interaction.followUp({
          content: 'Session not found!',
          ephemeral: true,
        })
        return
      }
    }

    logger.info(`📊 Fetching feedback for session ${targetSessionId}`)
    const feedbacks = await FeedbackDocument.find({
      sessionId: targetSessionId,
    })

    if (feedbacks.length === 0) {
      logger.info('❌ No feedback found for this session')
      await interaction.followUp({
        content:
          'No feedback found for this session yet. Be the first to rate! ⭐',
        ephemeral: true,
      })
      return
    }

    logger.info(`✅ Found ${feedbacks.length} feedback entries`)

    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0)
    const averageRating = totalRating / feedbacks.length
    const ratingStars = '⭐'.repeat(Math.round(averageRating))

    let reply = '# ☕️ **Coffee Feedback Report** ☕️\n\n'
    reply += `**Session ID:** \`${targetSessionId}\`\n`
    reply += `**Total Ratings:** ${feedbacks.length}\n`
    reply += `**Average Rating:** ${averageRating.toFixed(1)}/5 ${ratingStars}\n\n`

    reply += '## 📝 **Individual Ratings**\n'
    feedbacks.forEach((feedback, index) => {
      const stars =
        '⭐'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating)
      reply += `${index + 1}. **${feedback.userName}**: ${feedback.rating}/5 ${stars}\n`
      if (feedback.comment) {
        reply += `   💬 "${feedback.comment}"\n`
      }
    })

    reply += '\n---\n*Use `/rate` to add your own rating!*\n'

    await interaction.followUp(reply)
    logger.info(`🎉 Feedback report displayed for session ${targetSessionId}`)
  } catch (error) {
    logger.error('Error fetching coffee feedback:', error)
    await interaction.followUp({
      content: 'There was an error fetching the feedback.',
      ephemeral: true,
    })
  }
}
