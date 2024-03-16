import { StringSelectMenuInteraction } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'

export async function handleAromaStrength(
  interaction: StringSelectMenuInteraction,
  sessionId: string,
) {
  const userId = interaction.user.id
  const displayName = interaction.user.displayName
  const aromaStrength = interaction.values[0]

  const coffeeDocument = await CoffeeRequestDocument.findOne({
    sessionId: sessionId,
    coffeeCrewPerson: userId,
  })

  if (coffeeDocument) {
    coffeeDocument.aromaStrength = aromaStrength
    await coffeeDocument.save()
  } else {
    await new CoffeeRequestDocument({
      sessionId: sessionId,
      aromaStrength: aromaStrength,
      coffeeCrewPerson: userId,
      coffeeCrewPersonName: displayName,
    }).save()
  }

  return coffeeDocument
}
