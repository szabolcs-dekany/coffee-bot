import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-coffee-stats-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('coffeestats')
  .setDescription('Displays statistics about coffee requests')

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply()

  try {
    // Get the most popular coffee types
    const coffeeTypeStats = await CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    // Get the person who drinks the most coffee
    const coffeeCrewStats = await CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeCrewPersonName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    const aromaStrengthMap = {
      '🫘': 1,
      '🫘🫘': 2,
      '🫘🫘🫘': 3,
      '🫘🫘🫘🫘': 4,
      '🫘🫘🫘🫘🫘': 5,
    }

    const averageAromaStrength = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: null,
          average: {
            $avg: {
              $switch: {
                branches: Object.entries(aromaStrengthMap).map(([emoji, value]) => ({
                  case: { $eq: ['$aromaStrength', emoji] },
                  then: value,
                })),
                default: 0,
              },
            },
          },
        },
      },
    ])

    const sugarMap = {
      'none': 0,
      '🍰': 1,
      '🍰🍰': 2,
      '🍰🍰🍰': 3,
      '🍰🍰🍰🍰': 4,
    }

    // Get the most popular sugar level
    const popularSugarLevel = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: '$sugar',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 1,
      },
    ])

    const temperatureMap = {
      '🥵': 1,
      '🏡🛋️': 2,
      '🧊': 3,
    }

    // Get the most popular temperature
    const popularTemperature = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: '$temperature',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 1,
      },
    ])

    let reply = '**Coffee Statistics**\n\n'

    reply += '**Top 5 Coffee Types:**\n'
    coffeeTypeStats.forEach(stat => {
      reply += `**${stat._id}:** ${stat.count} requests\n`
    })

    reply += '\n**Top 5 Coffee Drinkers:**\n'
    coffeeCrewStats.forEach(stat => {
      reply += `**${stat._id}:** ${stat.count} coffees\n`
    })

    reply += `\n**Average Aroma Strength:** ${averageAromaStrength[0]?.average.toFixed(2) || 'N/A'}\n`
    reply += `**Most Popular Sugar Level:** ${popularSugarLevel[0]?._id || 'N/A'} (${popularSugarLevel[0]?.count || 0} requests)\n`
    reply += `**Most Popular Temperature:** ${popularTemperature[0]?._id || 'N/A'} (${popularTemperature[0]?.count || 0} requests)\n`

    await interaction.followUp(reply)
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp('There was an error fetching the coffee statistics.')
  }
}