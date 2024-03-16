import { StringSelectMenuInteraction } from 'discord.js'
import pino from 'pino'
import { handleCoffeeType } from './CoffeeTypeResponseHandler'
import { handleMilkType } from './MilkTypeResponseHandler'
import { handleAromaStrength } from './AromaStrengthResponseHandler'
import { handleSugar } from './SugarResponseHandler'
import { isCompleteCoffeeDocument } from '../CoffeeDocumentHelper'

const logger = pino({
  name: 'coffee-bot-generic-select-handler',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export async function handleInteraction(
  interaction: StringSelectMenuInteraction,
) {
  const customId = interaction.customId
  const sessionId = await getSessionId(customId)
  const responseType = await getResponseType(customId)

  logger.info(
    `Handling select interaction for ${interaction.user.displayName} - session ${sessionId} - type ${responseType}`,
  )

  let coffeeDocument = undefined

  if (responseType === 'coffee-type') {
    coffeeDocument = await handleCoffeeType(interaction, sessionId)
  }

  if (responseType === 'milk-type') {
    coffeeDocument = await handleMilkType(interaction, sessionId)
  }

  if (responseType === 'aroma-strength') {
    coffeeDocument = await handleAromaStrength(interaction, sessionId)
  }

  if (responseType === 'sugar') {
    coffeeDocument = await handleSugar(interaction, sessionId)
  }

  await interaction.deferUpdate()

  if (coffeeDocument && isCompleteCoffeeDocument(coffeeDocument)) {
    await interaction.followUp({
      content: 'Your coffee order is complete! 🎉, See you soon! ☕️',
      components: [],
    })
  }
}

const getSessionId = async (customId: string) => {
  return customId.split('|')[0]
}

const getResponseType = async (customId: string) => {
  return customId.split('|')[1]
}
