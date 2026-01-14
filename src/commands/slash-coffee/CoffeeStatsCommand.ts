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

interface EstimatedTimeStats {
  _id: string
  count: number
  avgCrewSize: number
}

interface TimingAnalysis {
  _id: {
    hour: number
    minute: number
  }
  count: number
  avgCrewSize: number
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

  logger.info('🚀 Starting coffee statistics generation...')

  try {
    logger.info('📋 Setting up mapping objects for data processing')
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
    logger.info('📊 Fetching basic coffee statistics...')

    // Get the most popular coffee types
    logger.info('☕ Calculating most popular coffee types')
    const coffeeTypeStats = (await CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as CoffeeTypeStats[]
    logger.info(`✅ Found ${coffeeTypeStats.length} coffee types`, {
      coffeeTypeStats,
    })

    // Get the person who drinks the most coffee
    logger.info('👥 Calculating top coffee drinkers')
    const coffeeCrewStats = (await CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeCrewPersonName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as CoffeeTypeStats[]
    logger.info(`✅ Found ${coffeeCrewStats.length} coffee crew members`, {
      coffeeCrewStats,
    })

    logger.info('🫘 Calculating average aroma strength')
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
    logger.info('✅ Average aroma strength calculated', {
      averageAromaStrength,
    })

    // Get the most popular sugar level
    logger.info('🍰 Calculating most popular sugar level')
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
    logger.info('✅ Popular sugar level found', { popularSugarLevel })

    // Get the most popular temperature
    logger.info('🌡️ Calculating most popular temperature')
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
    logger.info('✅ Popular temperature found', { popularTemperature })

    // === NEW STATISTICS ===
    logger.info('🆕 Starting advanced statistics calculations...')

    // 1. Coffee Session Trends & Peak Times (Budapest timezone)
    logger.info(
      '📈 Calculating session trends and peak times (Budapest timezone)',
    )
    const sessionTrends = (await CoffeeSessionDocument.aggregate([
      {
        $group: {
          _id: {
            hour: {
              $hour: {
                date: '$startDateTime',
                timezone: 'Europe/Budapest',
              },
            },
            dayOfWeek: {
              $dayOfWeek: {
                date: '$startDateTime',
                timezone: 'Europe/Budapest',
              },
            },
          },
          sessionCount: { $sum: 1 },
          avgCrewSize: { $avg: '$coffeeCrewNumber' },
        },
      },
      { $sort: { sessionCount: -1 } },
      { $limit: 3 },
    ])) as SessionTrend[]
    logger.info('✅ Session trends calculated', { sessionTrends })

    logger.info('🔢 Counting total sessions and requests')
    const totalSessions = await CoffeeSessionDocument.countDocuments()
    const totalRequests = await CoffeeRequestDocument.countDocuments()
    logger.info(
      `✅ Totals calculated: ${totalSessions} sessions, ${totalRequests} requests`,
    )

    // 2. Coffee Personality Profiles & Achievements
    logger.info('🎭 Calculating coffee personality profiles and achievements')
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
    logger.info(
      `✅ Coffee personalities calculated for ${coffeePersonalities.length} people`,
    )

    // Find personalities
    logger.info('🔍 Identifying coffee personality types')
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
    logger.info('✅ Personalities identified:', {
      coffeePurist: coffeePurist?._id,
      sweetTooth: sweetTooth?._id,
      caffeineAddict: caffeineAddict?._id,
      consistentCrew: consistentCrew?._id,
    })

    // 3. Coffee Preference Combinations & Patterns
    logger.info('🧪 Calculating popular coffee combinations and patterns')
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
    logger.info(`✅ Found ${popularCombinations.length} popular combinations`)

    // 4. Coffee Streaks & Participation Stats
    logger.info('🎯 Calculating participation statistics and streaks')
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
    logger.info(
      `✅ Participation stats calculated for ${participationStats.length} people`,
    )

    // 5. Coffee Evolution & Trends (Recent vs Overall)
    logger.info('🔥 Calculating recent trends (last 7 days)')
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
    logger.info(
      `✅ Recent trends calculated for ${recentTrends.length} coffee types`,
    )

    // 6. Estimated Coffee Time Statistics
    logger.info('⏰ Calculating estimated coffee time statistics')
    const estimatedTimeStats = (await CoffeeSessionDocument.aggregate([
      {
        $group: {
          _id: '$estimatedTimeOfCoffee',
          count: { $sum: 1 },
          avgCrewSize: { $avg: '$coffeeCrewNumber' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as EstimatedTimeStats[]
    logger.info(`✅ Found ${estimatedTimeStats.length} estimated time patterns`)

    // Parse estimated times to analyze timing patterns
    logger.info('🕐 Parsing time patterns from estimated coffee times')
    const timingAnalysis = (await CoffeeSessionDocument.aggregate([
      {
        $addFields: {
          // Try to parse time from estimatedTimeOfCoffee string
          parsedTime: {
            $regexFind: {
              input: '$estimatedTimeOfCoffee',
              regex: /(\d{1,2}):(\d{2})/,
            },
          },
        },
      },
      {
        $match: {
          'parsedTime.match': { $ne: null },
        },
      },
      {
        $addFields: {
          hour: { $toInt: { $arrayElemAt: ['$parsedTime.captures', 0] } },
          minute: { $toInt: { $arrayElemAt: ['$parsedTime.captures', 1] } },
        },
      },
      {
        $group: {
          _id: {
            hour: '$hour',
            minute: '$minute',
          },
          count: { $sum: 1 },
          avgCrewSize: { $avg: '$coffeeCrewNumber' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])) as TimingAnalysis[]
    logger.info(
      `✅ Timing analysis completed for ${timingAnalysis.length} time patterns`,
    )

    // === BUILD ENHANCED REPLY (SPLIT INTO TWO PARTS) ===
    logger.info(
      '📝 Building enhanced reply with all statistics (split into two parts)',
    )

    // PART 1: Basic statistics and core data
    let reply1 = '# ☕️ **Coffee Statistics Dashboard** ☕️\n\n'

    // Basic Stats Section
    reply1 += '## 📊 **Basic Statistics**\n'
    reply1 += `**Total Coffee Sessions:** ${totalSessions}\n`
    reply1 += `**Total Coffee Orders:** ${totalRequests}\n`
    reply1 += `**Average Orders per Session:** ${totalSessions > 0 ? (totalRequests / totalSessions).toFixed(1) : 'N/A'}\n\n`

    // Top Coffee Types
    reply1 += '## 🏆 **Top 5 Coffee Types**\n'
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
        reply1 += `${emoji} **${typeLabel}:** ${stat.count} orders\n`
      })
    } else {
      reply1 += 'No coffee type data available.\n'
    }
    reply1 += '\n'

    // Top Coffee Drinkers
    reply1 += '## 👑 **Top 5 Coffee Enthusiasts**\n'
    if (coffeeCrewStats.length > 0) {
      coffeeCrewStats.forEach((stat, index) => {
        const emoji =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'
        reply1 += `${emoji} **${stat._id}:** ${stat.count} coffees\n`
      })
    } else {
      reply1 += 'No coffee drinker data available.\n'
    }
    reply1 += '\n'

    // Preference Insights
    reply1 += '## 🎯 **Preference Insights**\n'
    const avgAroma = averageAromaStrength[0]?.average
    reply1 += `**Average Aroma Strength:** ${avgAroma && typeof avgAroma === 'number' ? '🫘'.repeat(Math.round(avgAroma)) + ` (${avgAroma.toFixed(1)}/5)` : 'N/A'}\n`
    reply1 += `**Most Popular Sugar Level:** ${popularSugarLevel[0]?._id || 'N/A'} (${popularSugarLevel[0]?.count || 0} orders)\n`
    reply1 += `**Most Popular Temperature:** ${popularTemperature[0]?._id || 'N/A'} (${popularTemperature[0]?.count || 0} orders)\n\n`

    // Coffee Personalities
    reply1 += '## 🎭 **Coffee Personalities & Achievements**\n'
    if (coffeePurist) {
      reply1 += `🖤 **Coffee Purist:** ${coffeePurist._id} (${coffeePurist.totalOrders} black coffees)\n`
    }
    if (sweetTooth && typeof sweetTooth.avgSugar === 'number') {
      reply1 += `🍰 **Sweet Tooth:** ${sweetTooth._id} (avg ${sweetTooth.avgSugar.toFixed(1)} sugar level)\n`
    }
    if (caffeineAddict && typeof caffeineAddict.avgAroma === 'number') {
      reply1 += `⚡ **Caffeine Addict:** ${caffeineAddict._id} (avg ${caffeineAddict.avgAroma.toFixed(1)} aroma strength)\n`
    }
    if (consistentCrew) {
      reply1 += `🏅 **Most Consistent:** ${consistentCrew._id} (${consistentCrew.totalOrders} total orders)\n`
    }

    // PART 2: Advanced statistics and insights
    let reply2 = '# ☕️ **Coffee Statistics Dashboard (Part 2)** ☕️\n\n'

    // Session Trends
    reply2 += '## 📈 **Session Trends & Peak Times**\n'
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
        reply2 += `📅 **Peak Time ${index + 1}:** ${dayName}s at ${timeLabel} (${trend.sessionCount} sessions, avg ${avgCrewSize} people)\n`
      })
    } else {
      reply2 += 'No session trend data available.\n'
    }
    reply2 += '\n'

    // Popular Combinations
    reply2 += '## 🧪 **Popular Coffee Recipes**\n'
    if (popularCombinations.length > 0) {
      popularCombinations.slice(0, 3).forEach((combo, index) => {
        const typeLabel =
          combo._id.type === '🥛'
            ? 'Milk Coffee'
            : combo._id.type === '☕️'
              ? 'Black Coffee'
              : combo._id.type
        const tempLabel = temperatureMap[combo._id.temp] || combo._id.temp
        reply2 += `${index + 1}. **${typeLabel}** + ${combo._id.aroma} + ${combo._id.sugar} + ${tempLabel} (${combo.count} orders by ${combo.users.length} people)\n`
      })
    } else {
      reply2 += 'No combination data available.\n'
    }
    reply2 += '\n'

    // Participation Stats
    reply2 += '## 🎯 **Participation Champions**\n'
    if (participationStats.length > 0) {
      participationStats.slice(0, 3).forEach((stat, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
        const participationRate =
          typeof stat.participationRate === 'number'
            ? stat.participationRate.toFixed(1)
            : 'N/A'
        reply2 += `${emoji} **${stat._id}:** ${participationRate}% participation (${stat.participationCount}/${totalSessions} sessions)\n`
      })
    } else {
      reply2 += 'No participation data available.\n'
    }
    reply2 += '\n'

    // Estimated Coffee Time Statistics
    reply2 += '## ⏰ **Coffee Timing Insights**\n'
    if (estimatedTimeStats.length > 0) {
      reply2 += '**Most Popular Estimated Times:**\n'
      estimatedTimeStats.slice(0, 3).forEach((stat, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
        const avgCrewSize =
          typeof stat.avgCrewSize === 'number'
            ? stat.avgCrewSize.toFixed(1)
            : 'N/A'
        reply2 += `${emoji} **"${stat._id}":** ${stat.count} sessions (avg ${avgCrewSize} people)\n`
      })
    } else {
      reply2 += 'No estimated time data available.\n'
    }

    if (timingAnalysis.length > 0) {
      reply2 += '\n**Most Common Time Patterns:**\n'
      timingAnalysis.slice(0, 3).forEach(timing => {
        const hour = timing._id.hour
        const minute = timing._id.minute.toString().padStart(2, '0')
        const timeLabel =
          hour < 12
            ? `${hour}:${minute} AM`
            : hour === 12
              ? `12:${minute} PM`
              : `${hour - 12}:${minute} PM`
        const avgCrewSize =
          typeof timing.avgCrewSize === 'number'
            ? timing.avgCrewSize.toFixed(1)
            : 'N/A'
        reply2 += `⏰ **${timeLabel}:** ${timing.count} sessions (avg ${avgCrewSize} people)\n`
      })

      // Add some timing insights
      const totalParsedSessions = timingAnalysis.reduce(
        (sum, timing) => sum + timing.count,
        0,
      )
      if (totalParsedSessions > 0) {
        const morningCount = timingAnalysis
          .filter(t => t._id.hour >= 6 && t._id.hour < 12)
          .reduce((sum, t) => sum + t.count, 0)
        const afternoonCount = timingAnalysis
          .filter(t => t._id.hour >= 12 && t._id.hour < 18)
          .reduce((sum, t) => sum + t.count, 0)
        const eveningCount = timingAnalysis
          .filter(t => t._id.hour >= 18 || t._id.hour < 6)
          .reduce((sum, t) => sum + t.count, 0)

        reply2 += '\n**Time Period Preferences:**\n'
        if (morningCount > 0)
          reply2 += `🌅 **Morning (6AM-12PM):** ${morningCount} sessions (${((morningCount / totalParsedSessions) * 100).toFixed(1)}%)\n`
        if (afternoonCount > 0)
          reply2 += `☀️ **Afternoon (12PM-6PM):** ${afternoonCount} sessions (${((afternoonCount / totalParsedSessions) * 100).toFixed(1)}%)\n`
        if (eveningCount > 0)
          reply2 += `🌙 **Evening (6PM-6AM):** ${eveningCount} sessions (${((eveningCount / totalParsedSessions) * 100).toFixed(1)}%)\n`
      }
    }
    reply2 += '\n'

    // Recent Trends
    if (recentTrends.length > 0) {
      reply2 += '## 🔥 **Recent Trends (Last 7 Days)**\n'
      recentTrends.forEach(trend => {
        const typeLabel =
          trend._id === '🥛'
            ? 'Milk Coffee'
            : trend._id === '☕️'
              ? 'Black Coffee'
              : trend._id
        reply2 += `📊 **${typeLabel}:** ${trend.recentCount} recent orders\n`
      })
      reply2 += '\n'
    }

    reply2 += '---\n*Coffee statistics powered by ☕️ Coffee Bot*\n'
    reply2 += '*All times displayed in Budapest timezone (Europe/Budapest)*'

    logger.info('✅ Coffee statistics replies built successfully', {
      reply1Length: reply1.length,
      reply2Length: reply2.length,
      totalLength: reply1.length + reply2.length,
      totalSessions,
      totalRequests,
      coffeeTypesFound: coffeeTypeStats.length,
      crewMembersFound: coffeeCrewStats.length,
      personalitiesFound: coffeePersonalities.length,
      combinationsFound: popularCombinations.length,
      participationStatsFound: participationStats.length,
      estimatedTimesFound: estimatedTimeStats.length,
      timingPatternsFound: timingAnalysis.length,
    })

    // Send both parts with a small delay to ensure proper ordering
    await interaction.followUp(reply1)
    logger.info('🎉 Coffee statistics part 1 sent successfully to Discord')

    // Small delay to ensure messages appear in order
    await new Promise(resolve => setTimeout(resolve, 500))

    await interaction.followUp(reply2)
    logger.info('🎉 Coffee statistics part 2 sent successfully to Discord')
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp(
      'There was an error fetching the coffee statistics.',
    )
  }
}
