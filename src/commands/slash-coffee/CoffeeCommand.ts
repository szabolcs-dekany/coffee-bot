import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageActionRowComponentBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'
import { v4 as uuidv4 } from 'uuid'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { createLogger } from '../../utils/logger'
import { ROLES } from '../../constants'

const logger = createLogger('coffee-command')

export const data = new SlashCommandBuilder()
  .setName('coffee')
  .setDescription('Starts a coffee session')
  .addStringOption(option =>
    option
      .setName('etc')
      .setDescription('Estimate Time of Coffee')
      .setRequired(true),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const member = interaction.guild?.members.cache.get(interaction.user.id)
  const roles = member?.roles.cache

  const hasCoffeeCrewRole = roles?.some(
    role => role.name === ROLES.COFFEE_CREW_CORE,
  )

  if (!hasCoffeeCrewRole) {
    logger.info(
      `User ${interaction.user.tag} does not have the coffee crew role`,
    )
    return interaction.reply({
      content: 'You do not have the coffee crew core role! ☕️',
      ephemeral: true,
    })
  }

  logger.info('Fetching members with the coffee crew role...')
  const targetRole = interaction.guild?.roles.cache.find(
    role => role.name === ROLES.COFFEE_CREW,
  )
  const allMembers = await interaction.guild?.members.fetch()
  const membersWithRole =
    allMembers?.filter(member =>
      member.roles.cache.has(targetRole?.id || ''),
    ) || []

  const coffeeCrew = [...membersWithRole.values()]

  logger.info(
    `We have the coffee crew! Today there are ${coffeeCrew.length} crew member(s) 🔥`,
  )

  const sessionId = uuidv4()
  const estimatedTimeOfCoffee = interaction.options.getString('etc', true)

  logger.info(`Starting a new Coffee session with session id ${sessionId} ☕️`)
  const session = new CoffeeSessionDocument({
    sessionId: sessionId,
    estimatedTimeOfCoffee: estimatedTimeOfCoffee,
    startDateTime: new Date(),
    coffeeCrewNumber: coffeeCrew.length,
  })

  await session.save()

  const coffeeRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${sessionId}|coffee-type`)
        .setPlaceholder('Select your coffee type')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('I want the usual ☕️🥛')
            .setValue('🥛'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Im Mark and I like it black ☕️ 🍆')
            .setValue('☕️'),
        ),
    )

  const aromaTypeSelect =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${sessionId}|aroma-strength`)
        .setPlaceholder('Aroma strength')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('🫘').setValue('🫘'),
          new StringSelectMenuOptionBuilder().setLabel('🫘🫘').setValue('🫘🫘'),
          new StringSelectMenuOptionBuilder()
            .setLabel('🫘🫘🫘')
            .setValue('🫘🫘🫘'),
          new StringSelectMenuOptionBuilder()
            .setLabel('🫘🫘🫘🫘')
            .setValue('🫘🫘🫘🫘'),
          new StringSelectMenuOptionBuilder()
            .setLabel('🫘🫘🫘🫘🫘')
            .setValue('🫘🫘🫘🫘🫘'),
        ),
    )

  const sugarSelect =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${sessionId}|sugar`)
        .setPlaceholder('Sugar')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('None').setValue('none'),
          new StringSelectMenuOptionBuilder().setLabel('🍰').setValue('🍰'),
          new StringSelectMenuOptionBuilder().setLabel('🍰🍰').setValue('🍰🍰'),
          new StringSelectMenuOptionBuilder()
            .setLabel('🍰🍰🍰')
            .setValue('🍰🍰🍰'),
          new StringSelectMenuOptionBuilder()
            .setLabel('🍰🍰🍰🍰')
            .setValue('🍰🍰🍰🍰'),
        ),
    )

  const temperatureSelect =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${sessionId}|temperature`)
        .setPlaceholder('Milk temperature')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Hot 🥵').setValue('🥵'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Room temperature 🏡🛋️')
            .setValue('🏡🛋️'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Vanilla Ice 🧊')
            .setValue('🧊'),
        ),
    )

  const message = `Hi there! It's that time of the day again ☕️. Please send your coffee request by ${estimatedTimeOfCoffee} ⏰`
  for (const coffeeEnjoyer of coffeeCrew) {
    try {
      const dmChannel = await coffeeEnjoyer.createDM()
      await dmChannel.send({
        content: message,
        components: [
          coffeeRow,
          aromaTypeSelect,
          sugarSelect,
          temperatureSelect,
        ],
      })
    } catch (error) {
      logger.error(
        `Could not send coffee order DM to ${coffeeEnjoyer.user.tag} \n${error}`,
      )
    }
  }

  return interaction.followUp('Coffee requests sent! ☕️')
}
