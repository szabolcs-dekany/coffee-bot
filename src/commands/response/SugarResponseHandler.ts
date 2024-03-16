import { StringSelectMenuInteraction } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'

export async function handleSugar(
  interaction: StringSelectMenuInteraction,
  sessionId: string,
) {
  const userId = interaction.user.id
  const displayName = interaction.user.displayName
  const sugar = interaction.values[0]

  const coffeeDocument = await CoffeeRequestDocument.findOne({
    sessionId: sessionId,
    coffeeCrewPerson: userId,
  })

  if (coffeeDocument) {
    coffeeDocument.sugar = sugar
    await coffeeDocument.save()
  } else {
    await new CoffeeRequestDocument({
      sessionId: sessionId,
      sugar: sugar,
      coffeeCrewPerson: userId,
      coffeeCrewPersonName: displayName,
    }).save()
  }

  return coffeeDocument
}
