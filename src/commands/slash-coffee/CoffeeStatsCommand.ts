import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import pino from 'pino'

// Type definitions for aggregation results
interface CoffeeTypeStats {
  _id: string
  count: number
}

interface CoffeePersonality {
  _id: string
  totalOrders: number
  blackCoffeeCount: number
  avgSugar: number
  avgAroma: number
  blackCoffeePercentage: number
  consistency: number
  preferences: Array<{
    type: string
    aroma: string
    sugar: string
    temp: string
  }>
}

interface SessionTrend {
  _id: {
    hour: number
    dayOfWeek: number
  }
  sessionCount: number
  avgCrewSize: number
}

interface PopularCombination {
  _id: {
    type: string
    aroma: string
    sugar: string
    temp: string
  }
  count: number
  users: string[]
}

interface ParticipationStat {
  _id: string
  sessionsParticipated: string[]
  totalOrders: number
  firstOrder: Date
  lastOrder: Date
  participationCount: number
  participationRate: number
}

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
    // Define mapping objects for consistent use
    const aromaStrengthMap = {
      '🫘': 1,
      '🫘🫘': 2,
      '🫘🫘🫘': 3,
      '🫘🫘🫘🫘': 4,
      '🫘🫘🫘🫘🫘': 5,
    }

    const sugarMap = {
      none: 0,
      '🍰': 1,
      '🍰🍰': 2,
      '🍰🍰🍰': 3,
      '🍰🍰🍰🍰': 4,
    }

    const temperatureMap: { [key: string]: string } = {
      '🥵': 'Hot',
      '🏡🛋️': 'Room Temp',
      '🧊': 'Cold',
    }

    // === EXISTING STATISTICS ===

    // Get the most popular coffee types
    const coffeeTypeStats = (await CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as CoffeeTypeStats[]

    // Get the person who drinks the most coffee
    const coffeeCrewStats = (await CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeCrewPersonName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as CoffeeTypeStats[]

    const averageAromaStrength = await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: null,
          average: {
            $avg: {
              $switch: {
                branches: Object.entries(aromaStrengthMap).map(
                  ([emoji, value]) => ({
                    case: { $eq: ['$aromaStrength', emoji] },
                    then: value,
                  }),
                ),
                default: 0,
              },
            },
          },
        },
      },
    ])

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

    // === NEW STATISTICS ===

    // 1. Coffee Session Trends & Peak Times
    const sessionTrends = (await CoffeeSessionDocument.aggregate([
      {
        $group: {
          _id: {
            hour: { $hour: '$startDateTime' },
            dayOfWeek: { $dayOfWeek: '$startDateTime' },
          },
          sessionCount: { $sum: 1 },
          avgCrewSize: { $avg: '$coffeeCrewNumber' },
        },
      },
      { $sort: { sessionCount: -1 } },
      { $limit: 3 },
    ])) as SessionTrend[]

    const totalSessions = await CoffeeSessionDocument.countDocuments()
    const totalRequests = await CoffeeRequestDocument.countDocuments()

    // 2. Coffee Personality Profiles & Achievements
    const coffeePersonalities = (await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: '$coffeeCrewPersonName',
          totalOrders: { $sum: 1 },
          blackCoffeeCount: {
            $sum: { $cond: [{ $eq: ['$coffeeType', '☕️'] }, 1, 0] },
          },
          avgSugar: {
            $avg: {
              $switch: {
                branches: Object.entries(sugarMap).map(([emoji, value]) => ({
                  case: { $eq: ['$sugar', emoji] },
                  then: value,
                })),
                default: 0,
              },
            },
          },
          avgAroma: {
            $avg: {
              $switch: {
                branches: Object.entries(aromaStrengthMap).map(
                  ([emoji, value]) => ({
                    case: { $eq: ['$aromaStrength', emoji] },
                    then: value,
                  }),
                ),
                default: 0,
              },
            },
          },
          preferences: {
            $push: {
              type: '$coffeeType',
              aroma: '$aromaStrength',
              sugar: '$sugar',
              temp: '$temperature',
            },
          },
        },
      },
      {
        $addFields: {
          blackCoffeePercentage: {
            $multiply: [
              { $divide: ['$blackCoffeeCount', '$totalOrders'] },
              100,
            ],
          },
          consistency: {
            $divide: [
              { $size: { $setUnion: ['$preferences.type'] } },
              '$totalOrders',
            ],
          },
        },
      },
    ])) as CoffeePersonality[]

    // Find personalities
    const coffeePurist = coffeePersonalities.find(
      p => p.blackCoffeePercentage === 100 && p.totalOrders >= 3,
    )
    const sweetTooth = coffeePersonalities.reduce(
      (max, p) => (p.avgSugar > (max?.avgSugar || 0) ? p : max),
      null as CoffeePersonality | null,
    )
    const caffeineAddict = coffeePersonalities.reduce(
      (max, p) => (p.avgAroma > (max?.avgAroma || 0) ? p : max),
      null as CoffeePersonality | null,
    )
    const consistentCrew = coffeePersonalities.reduce(
      (max, p) => (p.totalOrders > (max?.totalOrders || 0) ? p : max),
      null as CoffeePersonality | null,
    )

    // 3. Coffee Preference Combinations & Patterns
    const popularCombinations = (await CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: {
            type: '$coffeeType',
            aroma: '$aromaStrength',
            sugar: '$sugar',
            temp: '$temperature',
          },
          count: { $sum: 1 },
          users: { $addToSet: '$coffeeCrewPersonName' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as PopularCombination[]

    // 4. Coffee Streaks & Participation Stats
    const participationStats = (await CoffeeRequestDocument.aggregate([
      {
        $lookup: {
          from: 'coffee_sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session',
        },
      },
      { $unwind: '$session' },
      {
        $group: {
          _id: '$coffeeCrewPersonName',
          sessionsParticipated: { $addToSet: '$sessionId' },
          totalOrders: { $sum: 1 },
          firstOrder: { $min: '$session.startDateTime' },
          lastOrder: { $max: '$session.startDateTime' },
        },
      },
      {
        $addFields: {
          participationCount: { $size: '$sessionsParticipated' },
          participationRate: {
            $multiply: [
              { $divide: [{ $size: '$sessionsParticipated' }, totalSessions] },
              100,
            ],
          },
        },
      },
      { $sort: { participationRate: -1 } },
    ])) as ParticipationStat[]

    // 5. Coffee Evolution & Trends (Recent vs Overall)
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 7) // Last 7 days

    const recentTrends = await CoffeeRequestDocument.aggregate([
      {
        $lookup: {
          from: 'coffee_sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session',
        },
      },
      { $unwind: '$session' },
      { $match: { 'session.startDateTime': { $gte: recentDate } } },
      {
        $group: {
          _id: '$coffeeType',
          recentCount: { $sum: 1 },
        },
      },
    ])

    // === BUILD ENHANCED REPLY ===
    let reply = '# ☕️ **Coffee Statistics Dashboard** ☕️\n\n'

    // Basic Stats Section
    reply += '## 📊 **Basic Statistics**\n'
    reply += `**Total Coffee Sessions:** ${totalSessions}\n`
    reply += `**Total Coffee Orders:** ${totalRequests}\n`
    reply += `**Average Orders per Session:** ${totalSessions > 0 ? (totalRequests / totalSessions).toFixed(1) : 'N/A'}\n\n`

    // Top Coffee Types
    reply += '## 🏆 **Top 5 Coffee Types**\n'
    if (coffeeTypeStats.length > 0) {
      coffeeTypeStats.forEach((stat, index) => {
        const emoji =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'
        const typeLabel =
          stat._id === '🥛'
            ? 'With Milk'
            : stat._id === '☕️'
              ? 'Black Coffee'
              : stat._id
        reply += `${emoji} **${typeLabel}:** ${stat.count} orders\n`
      })
    } else {
      reply += 'No coffee type data available.\n'
    }
    reply += '\n'

    // Top Coffee Drinkers
    reply += '## 👑 **Top 5 Coffee Enthusiasts**\n'
    if (coffeeCrewStats.length > 0) {
      coffeeCrewStats.forEach((stat, index) => {
        const emoji =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'
        reply += `${emoji} **${stat._id}:** ${stat.count} coffees\n`
      })
    } else {
      reply += 'No coffee drinker data available.\n'
    }
    reply += '\n'

    // Preference Insights
    reply += '## 🎯 **Preference Insights**\n'
    const avgAroma = averageAromaStrength[0]?.average
    reply += `**Average Aroma Strength:** ${avgAroma && typeof avgAroma === 'number' ? '🫘'.repeat(Math.round(avgAroma)) + ` (${avgAroma.toFixed(1)}/5)` : 'N/A'}\n`
    reply += `**Most Popular Sugar Level:** ${popularSugarLevel[0]?._id || 'N/A'} (${popularSugarLevel[0]?.count || 0} orders)\n`
    reply += `**Most Popular Temperature:** ${popularTemperature[0]?._id || 'N/A'} (${popularTemperature[0]?.count || 0} orders)\n\n`

    // Coffee Personalities
    reply += '## 🎭 **Coffee Personalities & Achievements**\n'
    if (coffeePurist) {
      reply += `🖤 **Coffee Purist:** ${coffeePurist._id} (${coffeePurist.totalOrders} black coffees)\n`
    }
    if (sweetTooth && typeof sweetTooth.avgSugar === 'number') {
      reply += `🍰 **Sweet Tooth:** ${sweetTooth._id} (avg ${sweetTooth.avgSugar.toFixed(1)} sugar level)\n`
    }
    if (caffeineAddict && typeof caffeineAddict.avgAroma === 'number') {
      reply += `⚡ **Caffeine Addict:** ${caffeineAddict._id} (avg ${caffeineAddict.avgAroma.toFixed(1)} aroma strength)\n`
    }
    if (consistentCrew) {
      reply += `🏅 **Most Consistent:** ${consistentCrew._id} (${consistentCrew.totalOrders} total orders)\n`
    }
    reply += '\n'

    // Session Trends
    reply += '## 📈 **Session Trends & Peak Times**\n'
    if (sessionTrends.length > 0) {
      const dayNames = [
        '',
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]
      sessionTrends.forEach((trend, index) => {
        const dayName = dayNames[trend._id.dayOfWeek] || 'Unknown'
        const hour = trend._id.hour
        const timeLabel =
          hour < 12
            ? `${hour}:00 AM`
            : hour === 12
              ? '12:00 PM'
              : `${hour - 12}:00 PM`
        const avgCrewSize =
          typeof trend.avgCrewSize === 'number'
            ? trend.avgCrewSize.toFixed(1)
            : 'N/A'
        reply += `📅 **Peak Time ${index + 1}:** ${dayName}s at ${timeLabel} (${trend.sessionCount} sessions, avg ${avgCrewSize} people)\n`
      })
    } else {
      reply += 'No session trend data available.\n'
    }
    reply += '\n'

    // Popular Combinations
    reply += '## 🧪 **Popular Coffee Recipes**\n'
    if (popularCombinations.length > 0) {
      popularCombinations.slice(0, 3).forEach((combo, index) => {
        const typeLabel =
          combo._id.type === '🥛'
            ? 'Milk Coffee'
            : combo._id.type === '☕️'
              ? 'Black Coffee'
              : combo._id.type
        const tempLabel = temperatureMap[combo._id.temp] || combo._id.temp
        reply += `${index + 1}. **${typeLabel}** + ${combo._id.aroma} + ${combo._id.sugar} + ${tempLabel} (${combo.count} orders by ${combo.users.length} people)\n`
      })
    } else {
      reply += 'No combination data available.\n'
    }
    reply += '\n'

    // Participation Stats
    reply += '## 🎯 **Participation Champions**\n'
    if (participationStats.length > 0) {
      participationStats.slice(0, 3).forEach((stat, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
        const participationRate =
          typeof stat.participationRate === 'number'
            ? stat.participationRate.toFixed(1)
            : 'N/A'
        reply += `${emoji} **${stat._id}:** ${participationRate}% participation (${stat.participationCount}/${totalSessions} sessions)\n`
      })
    } else {
      reply += 'No participation data available.\n'
    }
    reply += '\n'

    // Recent Trends
    if (recentTrends.length > 0) {
      reply += '## 🔥 **Recent Trends (Last 7 Days)**\n'
      recentTrends.forEach(trend => {
        const typeLabel =
          trend._id === '🥛'
            ? 'Milk Coffee'
            : trend._id === '☕️'
              ? 'Black Coffee'
              : trend._id
        reply += `📊 **${typeLabel}:** ${trend.recentCount} recent orders\n`
      })
      reply += '\n'
    }

    reply += '---\n*Coffee statistics powered by ☕️ Coffee Bot*'

    await interaction.followUp(reply)
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp(
      'There was an error fetching the coffee statistics.',
    )
  }
}
