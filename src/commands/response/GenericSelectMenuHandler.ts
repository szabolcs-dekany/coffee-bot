import { StringSelectMenuInteraction } from 'discord.js'
import { handleCoffeeType } from './CoffeeTypeResponseHandler'
import { handleAromaStrength } from './AromaStrengthResponseHandler'
import { handleSugar } from './SugarResponseHandler'
import { isCompleteCoffeeDocument } from '../CoffeeDocumentHelper'
import { handleTemperature } from './TemperatureResponseHandler'
import { updateUserChallengeProgress } from '../../utils/challengeUtils'
import { createLogger } from '../../utils/logger'

const logger = createLogger('generic-select-handler')

export async function handleInteraction(
  interaction: StringSelectMenuInteraction,
) {
  const customId = interaction.customId

  try {
    const sessionId = getSessionId(customId)
    const responseType = getResponseType(customId)

    logger.info(
      `Handling select interaction for ${interaction.user.displayName} - session ${sessionId} - type ${responseType}`,
    )

    let coffeeDocument = undefined

    if (responseType === 'coffee-type') {
      coffeeDocument = await handleCoffeeType(interaction, sessionId)
    }

    if (responseType === 'aroma-strength') {
      coffeeDocument = await handleAromaStrength(interaction, sessionId)
    }

    if (responseType === 'sugar') {
      coffeeDocument = await handleSugar(interaction, sessionId)
    }

    if (responseType === 'temperature') {
      coffeeDocument = await handleTemperature(interaction, sessionId)
    }

    await interaction.deferUpdate()

    if (coffeeDocument && isCompleteCoffeeDocument(coffeeDocument)) {
      const userName = interaction.user.displayName || interaction.user.username
      const userId = interaction.user.id
      await updateUserChallengeProgress(userId, userName)

      await interaction.followUp({
        content: 'Your coffee order is complete! 🎉, See you soon! ☕️',
        components: [],
      })
    }
  } catch (error) {
    logger.error('Error handling select menu interaction:', error)
    await interaction.deferUpdate()
  }
}

function getSessionId(customId: string): string {
  const parts = customId.split('|')
  if (!customId || parts.length < 2 || !parts[0]) {
    logger.error(`Invalid customId format for sessionId: "${customId}"`)
    throw new Error('Invalid customId format: missing sessionId')
  }
  return parts[0]
}

function getResponseType(customId: string): string {
  const parts = customId.split('|')
  if (!customId || parts.length < 2 || !parts[1]) {
    logger.error(`Invalid customId format for responseType: "${customId}"`)
    throw new Error('Invalid customId format: missing responseType')
  }
  return parts[1]
}
