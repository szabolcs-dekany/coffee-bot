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
    // Track challenge progress
    const userName = interaction.user.displayName || interaction.user.username
    const userId = interaction.user.id
    await updateUserChallengeProgress(userId, userName, sessionId)

    await interaction.followUp({
      content: 'Your coffee order is complete! 🎉, See you soon! ☕️',
      components: [],
    })
  }
}

function getSessionId(customId: string): string {
  return customId.split('|')[0]
}

function getResponseType(customId: string): string {
  return customId.split('|')[1]
}
