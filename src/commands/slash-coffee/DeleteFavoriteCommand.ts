import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeFavoriteDocument } from '../../documents/CoffeeFavorite'
import { createLogger } from '../../utils/logger'

const logger = createLogger('delete-favorite-command')

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
    logger.info(`🔍 Deleting favorite "${favoriteName}" for ${userName}`)
    const deletedFavorite = await CoffeeFavoriteDocument.findOneAndDelete({
      userId: userId,
      favoriteName: favoriteName,
    })

    if (!deletedFavorite) {
      logger.info(`❌ Favorite "${favoriteName}" not found for ${userName}`)
      await interaction.followUp({
        content: `Favorite "${favoriteName}" not found! ☕️\n\nUse \`/favorites\` to see your saved favorites.`,
        ephemeral: true,
      })
      return
    }

    logger.info(
      `🎉 ${userName} successfully deleted favorite "${favoriteName}"`,
    )
    await interaction.followUp({
      content: `✅ **Favorite "${favoriteName}" deleted successfully!**\n\nUse \`/favorites\` to see your remaining favorites.`,
      ephemeral: true,
    })
  } catch (error) {
    logger.error('Error deleting favorite coffee preset:', error)
    await interaction.followUp({
      content: 'There was an error deleting your favorite coffee preset.',
      ephemeral: true,
    })
  }
}
