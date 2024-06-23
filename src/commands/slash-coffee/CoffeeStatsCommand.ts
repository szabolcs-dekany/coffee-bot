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

    let reply = '**Coffee Statistics**\n\n'

    reply += '**Top 5 Coffee Types:**\n'
    coffeeTypeStats.forEach(stat => {
      reply += `**${stat._id}:** ${stat.count} requests\n`
    })

    reply += '\n**Top 5 Coffee Drinkers:**\n'
    coffeeCrewStats.forEach(stat => {
      reply += `**${stat._id}:** ${stat.count} coffees\n`
    })

    await interaction.followUp(reply)
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp('There was an error fetching the coffee statistics.')
  }
}