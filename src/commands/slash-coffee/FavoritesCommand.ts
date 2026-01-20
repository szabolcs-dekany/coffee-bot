import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeFavoriteDocument } from '../../documents/CoffeeFavorite'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-favorites-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('favorites')
  .setDescription('View all your saved coffee favorites')

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const userName = interaction.user.displayName || interaction.user.username
  const userId = interaction.user.id

  logger.info(`🚀 ${userName} is viewing their favorite coffee presets`)

  try {
    logger.info(`🔍 Fetching all favorites for ${userName}`)
    const favorites = await CoffeeFavoriteDocument.find({
      userId: userId,
    }).sort({ favoriteName: 1 })

    if (favorites.length === 0) {
      logger.info(`❌ No favorites found for ${userName}`)
      await interaction.followUp({
        content:
          "You don't have any saved favorites yet! ☕️\n\nUse `/savefavorite` to create your first favorite coffee preset.",
        ephemeral: true,
      })
      return
    }

    logger.info(`✅ Found ${favorites.length} favorite(s) for ${userName}`)

    let reply = '# ⭐ **Your Coffee Favorites** ⭐\n\n'
    reply += `You have **${favorites.length}** saved favorite(s):\n\n`

    favorites.forEach((favorite, index) => {
      const coffeeTypeLabel =
        favorite.coffeeType === '🥛' ? 'With Milk' : 'Black Coffee'
      const temperatureLabel =
        favorite.temperature === '🥵'
          ? 'Hot'
          : favorite.temperature === '🧊'
            ? 'Cold'
            : 'Room Temp'

      reply += `### ${index + 1}. **${favorite.favoriteName}**\n`
      reply += `- **Coffee Type:** ${coffeeTypeLabel} ${favorite.coffeeType}\n`
      reply += `- **Aroma:** ${favorite.aromaStrength}\n`
      reply += `- **Sugar:** ${favorite.sugar}\n`
      reply += `- **Temperature:** ${temperatureLabel} ${favorite.temperature}\n\n`
    })

    reply +=
      '---\n*Use `/usefavorite` to quickly order one of these favorites!*\n'
    reply += '*Use `/deletefavorite` to remove a favorite.*'

    await interaction.followUp({
      content: reply,
      ephemeral: true,
    })
    logger.info(
      `🎉 ${userName} successfully viewed their ${favorites.length} favorite(s)`,
    )
  } catch (error) {
    logger.error('Error fetching favorite coffee presets:', error)
    await interaction.followUp({
      content: 'There was an error fetching your favorite coffee presets.',
      ephemeral: true,
    })
  }
}
