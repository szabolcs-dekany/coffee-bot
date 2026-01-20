import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeFavoriteDocument } from '../../documents/CoffeeFavorite'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-use-favorite-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('usefavorite')
  .setDescription('Quickly order coffee using one of your saved favorites')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Name of your favorite coffee preset')
      .setRequired(true)
      .setAutocomplete(true),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const userName = interaction.user.displayName || interaction.user.username
  const userId = interaction.user.id
  const favoriteName = interaction.options.getString('name', true)

  logger.info(
    `🚀 ${userName} is using their favorite coffee preset: "${favoriteName}"`,
  )

  try {
    // Find the favorite
    logger.info(`🔍 Fetching favorite "${favoriteName}" for ${userName}`)
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

    logger.info(`✅ Found favorite "${favoriteName}"`)

    // Find the latest active coffee session
    logger.info('🔍 Fetching latest coffee session')
    const latestSession = await CoffeeSessionDocument.findOne().sort({
      startDateTime: -1,
    })

    if (!latestSession) {
      logger.info('❌ No active coffee session found')
      await interaction.followUp({
        content:
          'No active coffee session found! ☕️\n\nWait for a coffee crew core member to start a session with `/coffee`.',
        ephemeral: true,
      })
      return
    }

    logger.info(`✅ Using session: ${latestSession.sessionId}`)

    // Check if user already has an order in this session
    logger.info(
      `🔍 Checking if ${userName} already has an order in session ${latestSession.sessionId}`,
    )
    const existingOrder = await CoffeeRequestDocument.findOne({
      sessionId: latestSession.sessionId,
      coffeeCrewPerson: userId,
    })

    if (existingOrder) {
      logger.info(`🔄 Updating existing order for ${userName}`)
      existingOrder.coffeeType = favorite.coffeeType
      existingOrder.aromaStrength = favorite.aromaStrength
      existingOrder.sugar = favorite.sugar
      existingOrder.temperature = favorite.temperature
      await existingOrder.save()
      logger.info('✅ Order updated successfully')
    } else {
      logger.info(`💾 Creating new order for ${userName}`)
      const newOrder = new CoffeeRequestDocument({
        sessionId: latestSession.sessionId,
        coffeeCrewPerson: userId,
        coffeeCrewPersonName: userName,
        coffeeType: favorite.coffeeType,
        aromaStrength: favorite.aromaStrength,
        sugar: favorite.sugar,
        temperature: favorite.temperature,
      })
      await newOrder.save()
      logger.info('✅ Order created successfully')
    }

    const coffeeTypeLabel =
      favorite.coffeeType === '🥛' ? 'With Milk' : 'Black Coffee'
    const temperatureLabel =
      favorite.temperature === '🥵'
        ? 'Hot'
        : favorite.temperature === '🧊'
          ? 'Cold'
          : 'Room Temp'

    await interaction.followUp({
      content: `✅ **Coffee ordered using "${favoriteName}"!**\n\n**Your order:**\n- **Coffee Type:** ${coffeeTypeLabel} ${favorite.coffeeType}\n- **Aroma:** ${favorite.aromaStrength}\n- **Sugar:** ${favorite.sugar}\n- **Temperature:** ${temperatureLabel} ${favorite.temperature}\n\n☕️ Your coffee will be ready soon!`,
      ephemeral: true,
    })
    logger.info(
      `🎉 ${userName} successfully ordered coffee using favorite "${favoriteName}"`,
    )
  } catch (error) {
    logger.error('Error using favorite coffee preset:', error)
    await interaction.followUp({
      content: 'There was an error using your favorite coffee preset.',
      ephemeral: true,
    })
  }
}
