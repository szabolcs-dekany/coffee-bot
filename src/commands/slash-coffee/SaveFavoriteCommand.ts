import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeFavoriteDocument } from '../../documents/CoffeeFavorite'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-save-favorite-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('savefavorite')
  .setDescription(
    'Save your current or custom coffee preferences as a favorite',
  )
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Name for this favorite (e.g., "Morning Boost")')
      .setRequired(true),
  )
  .addStringOption(option =>
    option
      .setName('coffee-type')
      .setDescription('Coffee type')
      .setRequired(true)
      .addChoices(
        { name: 'With Milk 🥛', value: '🥛' },
        { name: 'Black Coffee ☕️', value: '☕️' },
      ),
  )
  .addStringOption(option =>
    option
      .setName('aroma-strength')
      .setDescription('Aroma strength')
      .setRequired(true)
      .addChoices(
        { name: '🫘 (Mild)', value: '🫘' },
        { name: '🫘🫘', value: '🫘🫘' },
        { name: '🫘🫘🫘 (Medium)', value: '🫘🫘🫘' },
        { name: '🫘🫘🫘🫘', value: '🫘🫘🫘🫘' },
        { name: '🫘🫘🫘🫘🫘 (Strong)', value: '🫘🫘🫘🫘🫘' },
      ),
  )
  .addStringOption(option =>
    option
      .setName('sugar')
      .setDescription('Sugar level')
      .setRequired(true)
      .addChoices(
        { name: 'None', value: 'none' },
        { name: '🍰 (1 sugar)', value: '🍰' },
        { name: '🍰🍰 (2 sugars)', value: '🍰🍰' },
        { name: '🍰🍰🍰 (3 sugars)', value: '🍰🍰🍰' },
        { name: '🍰🍰🍰🍰 (4 sugars)', value: '🍰🍰🍰🍰' },
      ),
  )
  .addStringOption(option =>
    option
      .setName('temperature')
      .setDescription('Temperature preference')
      .setRequired(true)
      .addChoices(
        { name: 'Hot 🥵', value: '🥵' },
        { name: 'Room Temp 🏡🛋️', value: '🏡🛋️' },
        { name: 'Cold 🧊', value: '🧊' },
      ),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const userName = interaction.user.displayName || interaction.user.username
  const userId = interaction.user.id
  const favoriteName = interaction.options.getString('name', true)
  const coffeeType = interaction.options.getString('coffee-type', true)
  const aromaStrength = interaction.options.getString('aroma-strength', true)
  const sugar = interaction.options.getString('sugar', true)
  const temperature = interaction.options.getString('temperature', true)

  logger.info(
    `🚀 ${userName} is saving a favorite coffee preset: "${favoriteName}"`,
  )

  try {
    // Check if favorite name already exists for this user
    logger.info(
      `🔍 Checking if favorite "${favoriteName}" already exists for ${userName}`,
    )
    const existingFavorite = await CoffeeFavoriteDocument.findOne({
      userId: userId,
      favoriteName: favoriteName,
    })

    if (existingFavorite) {
      logger.info(
        `🔄 Updating existing favorite "${favoriteName}" for ${userName}`,
      )
      existingFavorite.coffeeType = coffeeType
      existingFavorite.aromaStrength = aromaStrength
      existingFavorite.sugar = sugar
      existingFavorite.temperature = temperature
      await existingFavorite.save()
      logger.info('✅ Favorite updated successfully')

      const coffeeTypeLabel = coffeeType === '🥛' ? 'With Milk' : 'Black Coffee'
      const temperatureLabel =
        temperature === '🥵'
          ? 'Hot'
          : temperature === '🧊'
            ? 'Cold'
            : 'Room Temp'

      await interaction.followUp({
        content: `✅ **Favorite "${favoriteName}" updated!**\n\n**Coffee Type:** ${coffeeTypeLabel} ${coffeeType}\n**Aroma:** ${aromaStrength}\n**Sugar:** ${sugar}\n**Temperature:** ${temperatureLabel} ${temperature}\n\nUse \`/usefavorite\` to quickly order this coffee!`,
        ephemeral: true,
      })
      logger.info(
        `🎉 ${userName} successfully updated favorite "${favoriteName}"`,
      )
    } else {
      logger.info(`💾 Creating new favorite "${favoriteName}" for ${userName}`)
      const favorite = new CoffeeFavoriteDocument({
        userId: userId,
        userName: userName,
        favoriteName: favoriteName,
        coffeeType: coffeeType,
        aromaStrength: aromaStrength,
        sugar: sugar,
        temperature: temperature,
      })
      await favorite.save()
      logger.info('✅ Favorite created successfully')

      const coffeeTypeLabel = coffeeType === '🥛' ? 'With Milk' : 'Black Coffee'
      const temperatureLabel =
        temperature === '🥵'
          ? 'Hot'
          : temperature === '🧊'
            ? 'Cold'
            : 'Room Temp'

      await interaction.followUp({
        content: `✅ **Favorite "${favoriteName}" saved!**\n\n**Coffee Type:** ${coffeeTypeLabel} ${coffeeType}\n**Aroma:** ${aromaStrength}\n**Sugar:** ${sugar}\n**Temperature:** ${temperatureLabel} ${temperature}\n\nUse \`/usefavorite\` to quickly order this coffee!`,
        ephemeral: true,
      })
      logger.info(
        `🎉 ${userName} successfully saved new favorite "${favoriteName}"`,
      )
    }
  } catch (error) {
    logger.error('Error saving favorite coffee preset:', error)
    await interaction.followUp({
      content: 'There was an error saving your favorite coffee preset.',
      ephemeral: true,
    })
  }
}
