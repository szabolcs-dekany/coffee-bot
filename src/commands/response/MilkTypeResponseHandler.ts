import {StringSelectMenuInteraction} from "discord.js";
import {CoffeeRequestDocument} from "../../documents/CoffeeDocument";

export async function handleCoffeeType(interaction: StringSelectMenuInteraction, sessionId: string) {
    const userId = interaction.user.id
    const coffeeType = interaction.values[0]

    const coffeeDocument = await CoffeeRequestDocument.findOne({
        sessionId: sessionId,
        coffeeCrewPerson: userId
    })

    if (coffeeDocument) {
        coffeeDocument.coffeeType = coffeeType
        await coffeeDocument.save()
    } else {
        await new CoffeeRequestDocument({
            sessionId: sessionId,
            coffeeType: coffeeType,
            coffeeCrewPerson: userId
        }).save()
    }

    await interaction.reply({content: 'Coffee type saved! ☕️'});
}