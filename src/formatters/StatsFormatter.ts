import { TEMPERATURE_LABELS, TemperatureKey } from '../constants'
import type {
  CoffeeTypeStats,
  CoffeePersonality,
  SessionTrend,
  PopularCombination,
  ParticipationStat,
  EstimatedTimeStats,
  TimingAnalysis,
  RecentTrend,
  AllStats,
} from '../services/StatsService'

interface FormattedStats {
  reply1: string
  reply2: string
}

const DAY_NAMES = [
  '',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export class StatsFormatter {
  static formatStats(stats: AllStats): FormattedStats {
    const reply1 = this.formatPart1(stats)
    const reply2 = this.formatPart2(stats)
    return { reply1, reply2 }
  }

  private static formatPart1(stats: AllStats): string {
    let reply = '# ☕️ **Coffee Statistics Dashboard** ☕️\n\n'

    reply += this.formatBasicStats(stats.totals)
    reply += this.formatTopCoffeeTypes(stats.coffeeTypes)
    reply += this.formatTopDrinkers(stats.topDrinkers)
    reply += this.formatPreferenceInsights(
      stats.averageAroma,
      stats.popularSugar,
      stats.popularTemperature,
    )
    reply += this.formatPersonalities(stats.personalities)

    return reply
  }

  private static formatPart2(stats: AllStats): string {
    let reply = '# ☕️ **Coffee Statistics Dashboard (Part 2)** ☕️\n\n'

    reply += this.formatSessionTrends(stats.sessionTrends)
    reply += this.formatPopularCombinations(stats.combinations)
    reply += this.formatParticipation(
      stats.participation,
      stats.totals.sessions,
    )
    reply += this.formatTimingInsights(
      stats.estimatedTimes,
      stats.timingAnalysis,
    )
    reply += this.formatRecentTrends(stats.recentTrends)

    reply += '---\n*Coffee statistics powered by ☕️ Coffee Bot*\n'
    reply += '*All times displayed in Budapest timezone (Europe/Budapest)*'

    return reply
  }

  private static formatBasicStats(totals: {
    sessions: number
    requests: number
  }): string {
    const avgOrders =
      totals.sessions > 0
        ? (totals.requests / totals.sessions).toFixed(1)
        : 'N/A'

    return `## 📊 **Basic Statistics**
**Total Coffee Sessions:** ${totals.sessions}
**Total Coffee Orders:** ${totals.requests}
**Average Orders per Session:** ${avgOrders}

`
  }

  private static formatTopCoffeeTypes(types: CoffeeTypeStats[]): string {
    let reply = '## 🏆 **Top 5 Coffee Types**\n'

    if (types.length === 0) {
      return reply + 'No coffee type data available.\n\n'
    }

    types.forEach((stat, index) => {
      const emoji = this.getMedalEmoji(index)
      const typeLabel = this.getCoffeeTypeLabel(stat._id)
      reply += `${emoji} **${typeLabel}:** ${stat.count} orders\n`
    })

    return reply + '\n'
  }

  private static formatTopDrinkers(drinkers: CoffeeTypeStats[]): string {
    let reply = '## 👑 **Top 5 Coffee Enthusiasts**\n'

    if (drinkers.length === 0) {
      return reply + 'No coffee drinker data available.\n\n'
    }

    drinkers.forEach((stat, index) => {
      const emoji =
        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'
      reply += `${emoji} **${stat._id}:** ${stat.count} coffees\n`
    })

    return reply + '\n'
  }

  private static formatPreferenceInsights(
    averageAroma: { average: number }[],
    popularSugar: { _id: string; count: number }[],
    popularTemperature: { _id: string; count: number }[],
  ): string {
    let reply = '## 🎯 **Preference Insights**\n'

    const avgAroma = averageAroma[0]?.average
    reply += `**Average Aroma Strength:** ${avgAroma && typeof avgAroma === 'number' ? '🫘'.repeat(Math.round(avgAroma)) + ` (${avgAroma.toFixed(1)}/5)` : 'N/A'}\n`
    reply += `**Most Popular Sugar Level:** ${popularSugar[0]?._id || 'N/A'} (${popularSugar[0]?.count || 0} orders)\n`
    reply += `**Most Popular Temperature:** ${popularTemperature[0]?._id || 'N/A'} (${popularTemperature[0]?.count || 0} orders)\n\n`

    return reply
  }

  private static formatPersonalities(
    personalities: CoffeePersonality[],
  ): string {
    let reply = '## 🎭 **Coffee Personalities & Achievements**\n'

    const coffeePurist = personalities.find(
      p => p.blackCoffeePercentage === 100 && p.totalOrders >= 3,
    )
    const sweetTooth = personalities.reduce(
      (max, p) => (p.avgSugar > (max?.avgSugar || 0) ? p : max),
      null as CoffeePersonality | null,
    )
    const caffeineAddict = personalities.reduce(
      (max, p) => (p.avgAroma > (max?.avgAroma || 0) ? p : max),
      null as CoffeePersonality | null,
    )
    const consistentCrew = personalities.reduce(
      (max, p) => (p.totalOrders > (max?.totalOrders || 0) ? p : max),
      null as CoffeePersonality | null,
    )

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

    return reply
  }

  private static formatSessionTrends(trends: SessionTrend[]): string {
    let reply = '## 📈 **Session Trends & Peak Times**\n'

    if (trends.length === 0) {
      return reply + 'No session trend data available.\n\n'
    }

    trends.forEach((trend, index) => {
      const dayName = DAY_NAMES[trend._id.dayOfWeek] || 'Unknown'
      const hour = trend._id.hour
      const timeLabel = this.formatHour(hour)
      const avgCrewSize =
        typeof trend.avgCrewSize === 'number'
          ? trend.avgCrewSize.toFixed(1)
          : 'N/A'
      reply += `📅 **Peak Time ${index + 1}:** ${dayName}s at ${timeLabel} (${trend.sessionCount} sessions, avg ${avgCrewSize} people)\n`
    })

    return reply + '\n'
  }

  private static formatPopularCombinations(
    combinations: PopularCombination[],
  ): string {
    let reply = '## 🧪 **Popular Coffee Recipes**\n'

    if (combinations.length === 0) {
      return reply + 'No combination data available.\n\n'
    }

    combinations.slice(0, 3).forEach((combo, index) => {
      const typeLabel = this.getCoffeeTypeLabel(combo._id.type)
      const tempLabel =
        TEMPERATURE_LABELS[combo._id.temp as TemperatureKey] || combo._id.temp
      reply += `${index + 1}. **${typeLabel}** + ${combo._id.aroma} + ${combo._id.sugar} + ${tempLabel} (${combo.count} orders by ${combo.users.length} people)\n`
    })

    return reply + '\n'
  }

  private static formatParticipation(
    participation: ParticipationStat[],
    totalSessions: number,
  ): string {
    let reply = '## 🎯 **Participation Champions**\n'

    if (participation.length === 0) {
      return reply + 'No participation data available.\n\n'
    }

    participation.slice(0, 3).forEach((stat, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
      const participationRate =
        typeof stat.participationRate === 'number'
          ? stat.participationRate.toFixed(1)
          : 'N/A'
      reply += `${emoji} **${stat._id}:** ${participationRate}% participation (${stat.participationCount}/${totalSessions} sessions)\n`
    })

    return reply + '\n'
  }

  private static formatTimingInsights(
    estimatedTimes: EstimatedTimeStats[],
    timingAnalysis: TimingAnalysis[],
  ): string {
    let reply = '## ⏰ **Coffee Timing Insights**\n'

    if (estimatedTimes.length > 0) {
      reply += '**Most Popular Estimated Times:**\n'
      estimatedTimes.slice(0, 3).forEach((stat, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
        const avgCrewSize =
          typeof stat.avgCrewSize === 'number'
            ? stat.avgCrewSize.toFixed(1)
            : 'N/A'
        reply += `${emoji} **"${stat._id}":** ${stat.count} sessions (avg ${avgCrewSize} people)\n`
      })
    } else {
      reply += 'No estimated time data available.\n'
    }

    if (timingAnalysis.length > 0) {
      reply += '\n**Most Common Time Patterns:**\n'
      timingAnalysis.slice(0, 3).forEach(timing => {
        const hour = timing._id.hour
        const minute = timing._id.minute.toString().padStart(2, '0')
        const timeLabel = this.formatTimeWithMinutes(hour, minute)
        const avgCrewSize =
          typeof timing.avgCrewSize === 'number'
            ? timing.avgCrewSize.toFixed(1)
            : 'N/A'
        reply += `⏰ **${timeLabel}:** ${timing.count} sessions (avg ${avgCrewSize} people)\n`
      })

      const totalParsedSessions = timingAnalysis.reduce(
        (sum, timing) => sum + timing.count,
        0,
      )
      if (totalParsedSessions > 0) {
        reply += this.formatTimePeriodPreferences(
          timingAnalysis,
          totalParsedSessions,
        )
      }
    }

    return reply + '\n'
  }

  private static formatTimePeriodPreferences(
    timingAnalysis: TimingAnalysis[],
    totalParsedSessions: number,
  ): string {
    const morningCount = timingAnalysis
      .filter(t => t._id.hour >= 6 && t._id.hour < 12)
      .reduce((sum, t) => sum + t.count, 0)
    const afternoonCount = timingAnalysis
      .filter(t => t._id.hour >= 12 && t._id.hour < 18)
      .reduce((sum, t) => sum + t.count, 0)
    const eveningCount = timingAnalysis
      .filter(t => t._id.hour >= 18 || t._id.hour < 6)
      .reduce((sum, t) => sum + t.count, 0)

    let reply = '\n**Time Period Preferences:**\n'
    if (morningCount > 0) {
      reply += `🌅 **Morning (6AM-12PM):** ${morningCount} sessions (${((morningCount / totalParsedSessions) * 100).toFixed(1)}%)\n`
    }
    if (afternoonCount > 0) {
      reply += `☀️ **Afternoon (12PM-6PM):** ${afternoonCount} sessions (${((afternoonCount / totalParsedSessions) * 100).toFixed(1)}%)\n`
    }
    if (eveningCount > 0) {
      reply += `🌙 **Evening (6PM-6AM):** ${eveningCount} sessions (${((eveningCount / totalParsedSessions) * 100).toFixed(1)}%)\n`
    }

    return reply
  }

  private static formatRecentTrends(trends: RecentTrend[]): string {
    if (trends.length === 0) {
      return ''
    }

    let reply = '## 🔥 **Recent Trends (Last 7 Days)**\n'
    trends.forEach(trend => {
      const typeLabel = this.getCoffeeTypeLabel(trend._id)
      reply += `📊 **${typeLabel}:** ${trend.recentCount} recent orders\n`
    })

    return reply + '\n'
  }

  private static getMedalEmoji(index: number): string {
    const medals = ['🥇', '🥈', '🥉']
    return medals[index] || '📍'
  }

  private static getCoffeeTypeLabel(type: string): string {
    if (type === '🥛') return 'With Milk'
    if (type === '☕️') return 'Black Coffee'
    return type
  }

  private static formatHour(hour: number): string {
    if (hour < 12) return `${hour}:00 AM`
    if (hour === 12) return '12:00 PM'
    return `${hour - 12}:00 PM`
  }

  private static formatTimeWithMinutes(hour: number, minute: string): string {
    if (hour < 12) return `${hour}:${minute} AM`
    if (hour === 12) return `12:${minute} PM`
    return `${hour - 12}:${minute} PM`
  }
}
