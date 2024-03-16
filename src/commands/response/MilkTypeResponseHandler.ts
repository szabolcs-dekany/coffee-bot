import { StringSelectMenuInteraction } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import { isCompleteCoffeeDocument } from '../CoffeeDocumentHelper'

export async function handleMilkType(
  interaction: StringSelectMenuInteraction,
  sessionId: string,
) {
  const userId = interaction.user.id
  const displayName = interaction.user.displayName
  const milkType = interaction.values[0]

  const coffeeDocument = await CoffeeRequestDocument.findOne({
    sessionId: sessionId,
    coffeeCrewPerson: userId,
  })

  if (coffeeDocument) {
    coffeeDocument.milkType = milkType
    await coffeeDocument.save()
  } else {
    await new CoffeeRequestDocument({
      sessionId: sessionId,
      coffeeType: milkType,
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
