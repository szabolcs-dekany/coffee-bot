import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeFavoriteDocument } from '../../documents/CoffeeFavorite'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-delete-favorite-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('deletefavorite')
  .setDescription('Delete one of your saved coffee favorites')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Name of the favorite to delete')
      .setRequired(true)
      .setAutocomplete(true),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const userName = interaction.user.displayName || interaction.user.username
  const userId = interaction.user.id
  const favoriteName = interaction.options.getString('name', true)

  logger.info(
    `🚀 ${userName} is deleting their favorite coffee preset: "${favoriteName}"`,
  )

  try {
    logger.info(`🔍 Searching for favorite "${favoriteName}" for ${userName}`)
    const favorite = await CoffeeFavoriteDocument.findOne({
      userId: userId,
      favoriteName: favoriteName,
    })

    if (!favorite) {
      logger.info(`❌ Favorite "${favoriteName}" not found for ${userName}`)
      await interaction.followUp({
        content: `Favorite "${favoriteName}" not found! ☕️\n\nUse \`/favorites\` to see your saved favorites.`,
        ephemeral: true,
      })
      return
    }

    logger.info(`✅ Found favorite "${favoriteName}", deleting...`)
    await CoffeeFavoriteDocument.deleteOne({
      userId: userId,
      favoriteName: favoriteName,
    })

    await interaction.followUp({
      content: `✅ **Favorite "${favoriteName}" deleted successfully!**\n\nUse \`/favorites\` to see your remaining favorites.`,
      ephemeral: true,
    })
    logger.info(
      `🎉 ${userName} successfully deleted favorite "${favoriteName}"`,
    )
  } catch (error) {
    logger.error('Error deleting favorite coffee preset:', error)
    await interaction.followUp({
      content: 'There was an error deleting your favorite coffee preset.',
      ephemeral: true,
    })
  }
}
