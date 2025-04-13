import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import pino from 'pino'
import moment from 'moment'

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

    // Get peak coffee hours
    const peakHours = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ])

    // Get favorite combinations
    const popularCombos = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: {
            coffeeType: '$coffeeType',
            temperature: '$temperature'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ])

    // Get user variety scores
    const varietyScores = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: '$coffeeCrewPersonName',
          uniqueTypes: { $addToSet: '$coffeeType' },
        }
      },
      {
        $project: {
          _id: 1,
          varietyScore: { $size: '$uniqueTypes' }
        }
      },
      { $sort: { varietyScore: -1 } },
      { $limit: 3 }
    ])

    // Calculate total orders and daily average
    const totalOrders = await CoffeeRequestDocument.countDocuments()
    const firstOrder = await CoffeeRequestDocument.findOne().sort({ createdAt: 1 })
    const daysActive = firstOrder ? moment().diff(moment(firstOrder.createdAt), 'days') : 1
    const dailyAverage = (totalOrders / Math.max(daysActive, 1)).toFixed(2)

    // Get streak information
    const allOrders = await CoffeeRequestDocument.find().sort({ createdAt: 1 })

    // Group orders by user and date
    const ordersByUser: { [key: string]: Set<string> } = {}
    const streaksByUser: { [key: string]: { current: number, longest: number } } = {}

    allOrders.forEach(order => {
      const user = order.coffeeCrewPersonName
      const orderDate = moment(order.createdAt).format('YYYY-MM-DD')

      if (!ordersByUser[user]) {
        ordersByUser[user] = new Set()
      }
      ordersByUser[user].add(orderDate)
    })

    // Calculate streaks for each user
    Object.entries(ordersByUser).forEach(([user, dates]) => {
      const sortedDates = Array.from(dates).sort()
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0

      // Calculate current streak (backwards from today)
      let currentDate = moment()
      while (dates.has(currentDate.format('YYYY-MM-DD'))) {
        currentStreak++
        currentDate.subtract(1, 'day')
      }

      // Calculate longest streak
      sortedDates.forEach((date, index) => {
        if (index === 0) {
          tempStreak = 1
        } else {
          const prevDate = moment(sortedDates[index - 1])
          const currDate = moment(date)

          if (currDate.diff(prevDate, 'days') === 1) {
            tempStreak++
          } else {
            tempStreak = 1
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak)
      })

      streaksByUser[user] = {
        current: currentStreak,
        longest: longestStreak
      }
    })

    // Sort users by longest streak
    const topStreaks = Object.entries(streaksByUser)
      .sort(([, a], [, b]) => b.longest - a.longest)
      .slice(0, 3)

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

    reply += '\n**⏰ Peak Coffee Hours:**\n'
    peakHours.forEach(hour => {
      reply += `${hour._id}:00 - ${(hour._id + 1) % 24}:00: ${hour.count} orders\n`
    })

    reply += '\n**🎯 Popular Combinations:**\n'
    popularCombos.forEach(combo => {
      reply += `${combo._id.coffeeType} (${combo._id.temperature}): ${combo.count} orders\n`
    })

    reply += '\n**🌟 Coffee Explorers:**\n'
    varietyScores.forEach(score => {
      reply += `${score._id}: tried ${score.varietyScore} different types\n`
    })

    reply += '\n**📊 General Stats:**\n'
    reply += `Total Orders: ${totalOrders}\n`
    reply += `Daily Average: ${dailyAverage} coffees\n`

    reply += '\n**🔥 Coffee Streaks:**\n'
    topStreaks.forEach(([user, streaks]) => {
      reply += `**${user}:** Current streak: ${streaks.current} days | Longest streak: ${streaks.longest} days\n`
    })

    await interaction.followUp(reply)
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp('There was an error fetching the coffee statistics.')
  }
}