import { StringSelectMenuInteraction } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import { isCompleteCoffeeDocument } from '../CoffeeDocumentHelper'

export async function handleCoffeeType(
  interaction: StringSelectMenuInteraction,
  sessionId: string,
) {
  const userId = interaction.user.id
  const displayName = interaction.user.displayName
  const coffeeType = interaction.values[0]

  const coffeeDocument = await CoffeeRequestDocument.findOne({
    sessionId: sessionId,
    coffeeCrewPerson: userId,
  })

  if (coffeeDocument) {
    coffeeDocument.coffeeType = coffeeType
    await coffeeDocument.save()
  } else {
    await new CoffeeRequestDocument({
      sessionId: sessionId,
      coffeeType: coffeeType,
      coffeeCrewPerson: userId,
      coffeeCrewPersonName: displayName,
    }).save()
  }

  await interaction.deferUpdate()

  if (coffeeDocument && isCompleteCoffeeDocument(coffeeDocument)) {
    await interaction.followUp({
      content: 'Your coffee order is complete! 🎉, See you soon!',
      components: [],
    })
  }
}
