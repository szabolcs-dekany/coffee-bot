import {
    ActionRowBuilder,
    CommandInteraction,
    MessageActionRowComponentBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import pino from "pino";
import {v4 as uuidv4} from 'uuid';
import {CoffeeSessionDocument} from "../commands/slash-coffee/CoffeeSession";

const logger = pino({
    name: 'coffee-bot-coffee-command',
    level: 'debug',
    transport: {
        target: 'pino-pretty'
    },
})

export const data = new SlashCommandBuilder()
    .setName("coffee")
    .setDescription("Starts a coffee session")
    .addStringOption(option =>
        option.setName('etc')
            .setDescription('Estimate Time of Coffee')
            .setRequired(true))

export async function execute(interaction: CommandInteraction) {
    logger.info('Fetching members with the coffee crew role...')
    const targetRole = interaction.guild?.roles.cache.find(role => role.name === 'coffee-crew');
    const allMembers = await interaction.guild?.members.fetch();
    const membersWithRole = allMembers?.filter
    (member => member.roles.cache.has(targetRole?.id || ''))

    const onlineMembers = membersWithRole?.filter(
        member => member.presence?.status === 'online') || []
    const coffeeCrew = [...onlineMembers.values()];

    logger.info(`We have the coffee crew! Today there are ${coffeeCrew.length} crew member(s) 🔥`)

    const sessionId = uuidv4();
    const estimatedTimeOfCoffee = interaction.options.data[0].value

    logger.info(`Starting a new Coffee session with session id ${sessionId} ☕️`)
    const session = new CoffeeSessionDocument({
        sessionId: sessionId,
        estimatedTimeOfCoffee: estimatedTimeOfCoffee,
        startDateTime: new Date(),
        coffeeCrewNumber: coffeeCrew.length
    })

    await session.save()

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${sessionId}|coffee-type`)
                .setPlaceholder('Select your coffee type')
                .addOptions(new StringSelectMenuOptionBuilder().setLabel('Espresso').setValue('espresso'),
                    new StringSelectMenuOptionBuilder().setLabel('Cappuccino').setValue('cappuccino'),
                    new StringSelectMenuOptionBuilder().setLabel('Latte').setValue('Latte'))
        )

    const message = `Hi there! It's that time of the day again ☕️. Please send your coffee request by ${estimatedTimeOfCoffee} ⏰`
    for (const coffeeEnjoyer of coffeeCrew) {
        try {
            const dmChannel = await coffeeEnjoyer.createDM();
            await dmChannel.send({
                content: message,
                components: [row]
            });
        } catch (error) {
            logger.error(`Could not send coffee order DM to ${coffeeEnjoyer.user.tag} \n${error}`);
        }
    }


    return interaction.reply("Pong!");
}