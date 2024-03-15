import {StringSelectMenuInteraction} from "discord.js";
import pino from "pino";
import {handleCoffeeType} from "./CoffeeTypeResponseHandler";
import {handleMilkType} from "./MilkTypeResponseHandler";

const logger = pino({
    name: 'coffee-bot-generic-select-handler',
    level: 'debug',
    transport: {
        target: 'pino-pretty'
    },
})

export async function handleInteraction(interaction: StringSelectMenuInteraction) {
    const customId = interaction.customId
    const sessionId = await getSessionId(customId)
    const responseType = await getResponseType(customId)

    logger.info(`Handling select interaction for ${interaction.user.displayName} - session ${sessionId} - type ${responseType}`)

    if (responseType === 'coffee-type') {
        return handleCoffeeType(interaction, sessionId)
    }

    if (responseType === 'milk-type') {
        return handleMilkType(interaction, sessionId)
    }

    return interaction.reply({content: 'Hi'})
}

const getSessionId = async (customId: string) => {
    return customId.split("|")[0]
};

const getResponseType = async (customId: string) => {
    return customId.split("|")[1]
};