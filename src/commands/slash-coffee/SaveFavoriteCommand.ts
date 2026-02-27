import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeFavoriteDocument } from '../../documents/CoffeeFavorite'
import {
  getCoffeeTypeLabel,
  getTemperatureLabel,
} from '../../utils/coffeeLabels'
import { createLogger } from '../../utils/logger'

const logger = createLogger('save-favorite-command')

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
    logger.info(`💾 Upserting favorite "${favoriteName}" for ${userName}`)
    await CoffeeFavoriteDocument.findOneAndUpdate(
      { userId: userId, favoriteName: favoriteName },
      {
        $set: {
          coffeeType: coffeeType,
          aromaStrength: aromaStrength,
          sugar: sugar,
          temperature: temperature,
        },
        $setOnInsert: { userName: userName },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const coffeeTypeLabel = getCoffeeTypeLabel(coffeeType)
    const temperatureLabel = getTemperatureLabel(temperature)

    logger.info(`🎉 ${userName} successfully saved favorite "${favoriteName}"`)
    await interaction.followUp({
      content: `✅ **Favorite "${favoriteName}" saved!**\n\n**Coffee Type:** ${coffeeTypeLabel} ${coffeeType}\n**Aroma:** ${aromaStrength}\n**Sugar:** ${sugar}\n**Temperature:** ${temperatureLabel} ${temperature}\n\nUse \`/usefavorite\` to quickly order this coffee!`,
      ephemeral: true,
    })
  } catch (error) {
    logger.error('Error saving favorite coffee preset:', error)
    await interaction.followUp({
      content: 'There was an error saving your favorite coffee preset.',
      ephemeral: true,
    })
  }
}
