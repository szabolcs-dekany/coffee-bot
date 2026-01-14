import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import pino from 'pino'

// Type definitions for aggregation results
interface CoffeeTypeStats {
  _id: string
  count: number
}

interface PersonalStats {
  totalOrders: number
  blackCoffeeCount: number
  avgSugar: number
  avgAroma: number
  blackCoffeePercentage: number
  preferences: Array<{
    type: string
    aroma: string
    sugar: string
    temp: string
  }>
}

interface ParticipationStat {
  _id: string
  sessionsParticipated: string[]
  totalOrders: number
  firstOrder: Date
  lastOrder: Date
  participationCount: number
}

const logger = pino({
  name: 'coffee-bot-my-stats-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

export const data = new SlashCommandBuilder()
  .setName('mystats')
  .setDescription('Displays your personal coffee statistics')

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const userName = interaction.user.displayName || interaction.user.username

  logger.info(`🚀 Fetching personal coffee statistics for ${userName}...`)

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

    // Check if user has any orders
    logger.info('🔍 Checking if user has any coffee orders')
    const userOrderCount = await CoffeeRequestDocument.countDocuments({
      coffeeCrewPersonName: userName,
    })

    if (userOrderCount === 0) {
      logger.info(`❌ No coffee orders found for ${userName}`)
      await interaction.followUp({
        content:
          'You haven\'t ordered any coffee yet! ☕️\nStart ordering to see your personalized statistics.',
        ephemeral: true,
      })
      return
    }

    logger.info(`✅ Found ${userOrderCount} orders for ${userName}`)

    // Get user's favorite coffee types
    logger.info('☕ Calculating favorite coffee types')
    const userCoffeeTypes = (await CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
      { $group: { _id: '$coffeeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])) as CoffeeTypeStats[]
    logger.info(`✅ Found ${userCoffeeTypes.length} coffee types`, {
      userCoffeeTypes,
    })

    // Get user's personal coffee profile
    logger.info('🎭 Calculating personal coffee profile')
    const personalStats = (await CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
      {
        $group: {
          _id: null,
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
        },
      },
    ])) as PersonalStats[]
    logger.info('✅ Personal profile calculated', { personalStats })

    // Get user's most popular preferences
    logger.info('🍰 Calculating most popular sugar level')
    const popularSugar = await CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
      {
        $group: {
          _id: '$sugar',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])

    logger.info('🌡️ Calculating most popular temperature')
    const popularTemp = await CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
      {
        $group: {
          _id: '$temperature',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])

    logger.info('🫘 Calculating most popular aroma strength')
    const popularAroma = await CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
      {
        $group: {
          _id: '$aromaStrength',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])

    // Get participation statistics
    logger.info('🎯 Calculating participation statistics')
    const totalSessions = await CoffeeSessionDocument.countDocuments()
    const participationStats = (await CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
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
        },
      },
    ])) as ParticipationStat[]
    logger.info('✅ Participation stats calculated', { participationStats })

    // Build reply (split into two parts)
    logger.info('📝 Building personal statistics reply (split into two parts)')

    // PART 1: Journey, Types, and Preferences
    let reply1 = `# ☕️ **${userName}'s Coffee Statistics** ☕️\n\n`

    // Basic stats
    reply1 += '## 📊 **Your Coffee Journey**\n'
    if (participationStats.length > 0) {
      const stats = participationStats[0]
      reply1 += `**Total Orders:** ${stats.totalOrders} coffees\n`
      reply1 += `**Sessions Participated:** ${stats.participationCount}/${totalSessions} (${((stats.participationCount / totalSessions) * 100).toFixed(1)}%)\n`
      reply1 += `**First Order:** ${new Date(stats.firstOrder).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}\n`
      reply1 += `**Last Order:** ${new Date(stats.lastOrder).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}\n\n`
    }

    // Favorite coffee types
    reply1 += '## 🏆 **Your Favorite Coffee Types**\n'
    if (userCoffeeTypes.length > 0) {
      userCoffeeTypes.forEach((stat, index) => {
        const emoji =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'
        const typeLabel =
          stat._id === '🥛'
            ? 'With Milk'
            : stat._id === '☕️'
              ? 'Black Coffee'
              : stat._id
        const percentage = ((stat.count / userOrderCount) * 100).toFixed(1)
        reply1 += `${emoji} **${typeLabel}:** ${stat.count} orders (${percentage}%)\n`
      })
    } else {
      reply1 += 'No coffee type data available.\n'
    }
    reply1 += '\n'

    // Your preferences
    reply1 += '## 🎯 **Your Preferences**\n'
    if (personalStats.length > 0) {
      const stats = personalStats[0]
      const avgAroma =
        typeof stats.avgAroma === 'number' ? stats.avgAroma : null
      reply1 += `**Average Aroma Strength:** ${avgAroma ? '🫘'.repeat(Math.round(avgAroma)) + ` (${avgAroma.toFixed(1)}/5)` : 'N/A'}\n`
    }
    reply1 += `**Most Popular Sugar Level:** ${popularSugar[0]?._id || 'N/A'} (${popularSugar[0]?.count || 0} times)\n`
    reply1 += `**Most Popular Temperature:** ${popularTemp[0]?._id ? temperatureMap[popularTemp[0]._id] || popularTemp[0]._id : 'N/A'} (${popularTemp[0]?.count || 0} times)\n`
    reply1 += `**Most Popular Aroma:** ${popularAroma[0]?._id || 'N/A'} (${popularAroma[0]?.count || 0} times)\n`

    // PART 2: Coffee Personality
    let reply2 = `# ☕️ **${userName}'s Coffee Statistics (Part 2)** ☕️\n\n`

    // Your coffee personality
    reply2 += '## 🎭 **Your Coffee Personality**\n'
    if (personalStats.length > 0) {
      const stats = personalStats[0]

      // Determine personality traits
      const traits: string[] = []

      if (stats.blackCoffeePercentage === 100 && stats.totalOrders >= 3) {
        traits.push('🖤 **Coffee Purist** - You never stray from black coffee!')
      } else if (stats.blackCoffeePercentage === 0) {
        traits.push(
          '🥛 **Milk Enthusiast** - You always prefer your coffee with milk!',
        )
      }

      if (typeof stats.avgSugar === 'number') {
        if (stats.avgSugar === 0) {
          traits.push('🚫 **Sugar-Free Champion** - No sugar for you!')
        } else if (stats.avgSugar >= 3) {
          traits.push(
            `🍰 **Sweet Tooth** - You love your coffee sweet! (avg ${stats.avgSugar.toFixed(1)} sugar)`,
          )
        }
      }

      if (typeof stats.avgAroma === 'number') {
        if (stats.avgAroma >= 4) {
          traits.push(
            `⚡ **Caffeine Warrior** - You go for the strongest! (avg ${stats.avgAroma.toFixed(1)} aroma)`,
          )
        } else if (stats.avgAroma <= 2) {
          traits.push(
            `😌 **Gentle Sipper** - You prefer a milder brew (avg ${stats.avgAroma.toFixed(1)} aroma)`,
          )
        }
      }

      const uniqueTypes = new Set(stats.preferences.map(p => p.type)).size
      if (uniqueTypes === 1) {
        traits.push(
          '🎯 **Creature of Habit** - You stick to your favorite type!',
        )
      } else if (uniqueTypes >= stats.totalOrders * 0.5) {
        traits.push('🦋 **Adventurous Spirit** - You love to mix things up!')
      }

      if (traits.length > 0) {
        traits.forEach(trait => {
          reply2 += `${trait}\n`
        })
      } else {
        reply2 +=
          '🌟 **Balanced Coffee Lover** - You enjoy variety in your coffee choices!\n'
      }
    }

    reply2 += '\n---\n*Your personal statistics powered by ☕️ Coffee Bot*'

    logger.info('✅ Personal statistics replies built successfully', {
      reply1Length: reply1.length,
      reply2Length: reply2.length,
      totalLength: reply1.length + reply2.length,
      userName,
      totalOrders: userOrderCount,
    })

    // Send both parts with a small delay to ensure proper ordering
    await interaction.followUp({ content: reply1, ephemeral: true })
    logger.info(
      `🎉 Personal statistics part 1 sent successfully to ${userName} on Discord`,
    )

    // Small delay to ensure messages appear in order
    await new Promise(resolve => setTimeout(resolve, 500))

    await interaction.followUp({ content: reply2, ephemeral: true })
    logger.info(
      `🎉 Personal statistics part 2 sent successfully to ${userName} on Discord`,
    )
  } catch (error) {
    logger.error('Error fetching personal coffee stats:', error)
    await interaction.followUp({
      content: 'There was an error fetching your coffee statistics.',
      ephemeral: true,
    })
  }
}
