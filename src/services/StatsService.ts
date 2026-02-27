import { CoffeeRequestDocument } from '../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../documents/CoffeeSession'
import { AROMA_STRENGTH_MAP, SUGAR_MAP } from '../constants'

export interface CoffeeTypeStats {
  _id: string
  count: number
}

export interface CoffeePersonality {
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

export interface SessionTrend {
  _id: {
    hour: number
    dayOfWeek: number
  }
  sessionCount: number
  avgCrewSize: number
}

export interface PopularCombination {
  _id: {
    type: string
    aroma: string
    sugar: string
    temp: string
  }
  count: number
  users: string[]
}

export interface ParticipationStat {
  _id: string
  sessionsParticipated: string[]
  totalOrders: number
  firstOrder: Date
  lastOrder: Date
  participationCount: number
  participationRate: number
}

export interface EstimatedTimeStats {
  _id: string
  count: number
  avgCrewSize: number
}

export interface TimingAnalysis {
  _id: {
    hour: number
    minute: number
  }
  count: number
  avgCrewSize: number
}

export interface RecentTrend {
  _id: string
  recentCount: number
}

export interface AllStats {
  totals: { sessions: number; requests: number }
  coffeeTypes: CoffeeTypeStats[]
  topDrinkers: CoffeeTypeStats[]
  averageAroma: { average: number }[]
  popularSugar: { _id: string; count: number }[]
  popularTemperature: { _id: string; count: number }[]
  sessionTrends: SessionTrend[]
  personalities: CoffeePersonality[]
  combinations: PopularCombination[]
  participation: ParticipationStat[]
  estimatedTimes: EstimatedTimeStats[]
  timingAnalysis: TimingAnalysis[]
  recentTrends: RecentTrend[]
}

export class StatsService {
  static async getCoffeeTypeStats(
    limit: number = 5,
  ): Promise<CoffeeTypeStats[]> {
    return CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]) as Promise<CoffeeTypeStats[]>
  }

  static async getTopCoffeeDrinkers(
    limit: number = 5,
  ): Promise<CoffeeTypeStats[]> {
    return CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeCrewPersonName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]) as Promise<CoffeeTypeStats[]>
  }

  static async getAverageAromaStrength(): Promise<{ average: number }[]> {
    return CoffeeRequestDocument.aggregate([
      {
        $group: {
          _id: null,
          average: {
            $avg: {
              $switch: {
                branches: Object.entries(AROMA_STRENGTH_MAP).map(
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
    ]) as Promise<{ average: number }[]>
  }

  static async getPopularSugarLevel(): Promise<
    { _id: string; count: number }[]
  > {
    return CoffeeRequestDocument.aggregate([
      { $group: { _id: '$sugar', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]) as Promise<{ _id: string; count: number }[]>
  }

  static async getPopularTemperature(): Promise<
    { _id: string; count: number }[]
  > {
    return CoffeeRequestDocument.aggregate([
      { $group: { _id: '$temperature', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]) as Promise<{ _id: string; count: number }[]>
  }

  static async getSessionTrends(limit: number = 3): Promise<SessionTrend[]> {
    return CoffeeSessionDocument.aggregate([
      {
        $group: {
          _id: {
            hour: {
              $hour: { date: '$startDateTime', timezone: 'Europe/Budapest' },
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
      { $limit: limit },
    ]) as Promise<SessionTrend[]>
  }

  static async getTotalCounts(): Promise<{
    sessions: number
    requests: number
  }> {
    const [sessions, requests] = await Promise.all([
      CoffeeSessionDocument.countDocuments(),
      CoffeeRequestDocument.countDocuments(),
    ])
    return { sessions, requests }
  }

  static async getCoffeePersonalities(): Promise<CoffeePersonality[]> {
    return CoffeeRequestDocument.aggregate([
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
                branches: Object.entries(SUGAR_MAP).map(([emoji, value]) => ({
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
                branches: Object.entries(AROMA_STRENGTH_MAP).map(
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
    ]) as Promise<CoffeePersonality[]>
  }

  static async getPopularCombinations(
    limit: number = 5,
  ): Promise<PopularCombination[]> {
    return CoffeeRequestDocument.aggregate([
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
      { $limit: limit },
    ]) as Promise<PopularCombination[]>
  }

  static async getParticipationStats(
    totalSessions: number,
  ): Promise<ParticipationStat[]> {
    return CoffeeRequestDocument.aggregate([
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
    ]) as Promise<ParticipationStat[]>
  }

  static async getRecentTrends(days: number = 7): Promise<RecentTrend[]> {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - days)

    return CoffeeRequestDocument.aggregate([
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
    ]) as Promise<RecentTrend[]>
  }

  static async getEstimatedTimeStats(
    limit: number = 5,
  ): Promise<EstimatedTimeStats[]> {
    return CoffeeSessionDocument.aggregate([
      {
        $group: {
          _id: '$estimatedTimeOfCoffee',
          count: { $sum: 1 },
          avgCrewSize: { $avg: '$coffeeCrewNumber' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]) as Promise<EstimatedTimeStats[]>
  }

  static async getTimingAnalysis(limit: number = 5): Promise<TimingAnalysis[]> {
    return CoffeeSessionDocument.aggregate([
      {
        $addFields: {
          parsedTime: {
            $regexFind: {
              input: '$estimatedTimeOfCoffee',
              regex: /(\d{1,2}):(\d{2})/,
            },
          },
        },
      },
      { $match: { 'parsedTime.match': { $ne: null } } },
      {
        $addFields: {
          hour: { $toInt: { $arrayElemAt: ['$parsedTime.captures', 0] } },
          minute: { $toInt: { $arrayElemAt: ['$parsedTime.captures', 1] } },
        },
      },
      {
        $group: {
          _id: { hour: '$hour', minute: '$minute' },
          count: { $sum: 1 },
          avgCrewSize: { $avg: '$coffeeCrewNumber' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]) as Promise<TimingAnalysis[]>
  }

  static async getAllStats(): Promise<AllStats> {
    const totals = await this.getTotalCounts()

    const [
      coffeeTypes,
      topDrinkers,
      averageAroma,
      popularSugar,
      popularTemperature,
      sessionTrends,
      personalities,
      combinations,
      recentTrends,
      estimatedTimes,
      timingAnalysis,
    ] = await Promise.all([
      this.getCoffeeTypeStats(),
      this.getTopCoffeeDrinkers(),
      this.getAverageAromaStrength(),
      this.getPopularSugarLevel(),
      this.getPopularTemperature(),
      this.getSessionTrends(),
      this.getCoffeePersonalities(),
      this.getPopularCombinations(),
      this.getRecentTrends(),
      this.getEstimatedTimeStats(),
      this.getTimingAnalysis(),
    ])

    const participation = await this.getParticipationStats(totals.sessions)

    return {
      totals,
      coffeeTypes,
      topDrinkers,
      averageAroma,
      popularSugar,
      popularTemperature,
      sessionTrends,
      personalities,
      combinations,
      participation,
      estimatedTimes,
      timingAnalysis,
      recentTrends,
    }
  }
}
