import { CoffeeRequestDocument } from '../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../documents/CoffeeSession'
import { UserChallengeProgressDocument } from '../documents/UserChallengeProgress'
import { CoffeeChallengeDocument } from '../documents/CoffeeChallenge'
import { createLogger } from './logger'

const logger = createLogger('challenge-utils')

/**
 * Update all active user challenges with latest progress
 * This should be called after each coffee order
 */
export async function updateUserChallengeProgress(
  userId: string,
  userName: string,
): Promise<void> {
  logger.info(`🔄 Updating challenge progress for user ${userName}`)

  try {
    const activeChallenge = await CoffeeChallengeDocument.findOne({
      isActive: true,
      type: 'weekly',
    })

    if (!activeChallenge) {
      logger.info('⚠️ No active weekly challenge found')
      return
    }

    // Get or create progress record
    let progress = await UserChallengeProgressDocument.findOne({
      userId: userId,
      challengeId: activeChallenge.challengeId,
    })

    if (!progress) {
      progress = new UserChallengeProgressDocument({
        userId: userId,
        userName: userName,
        challengeId: activeChallenge.challengeId,
        progress: 0,
        isCompleted: false,
      })
    }

    // Evaluate challenge based on type
    await evaluateChallengeProgress(activeChallenge.challengeId, progress)

    await progress.save()
    logger.info(
      `✅ Updated progress for ${userName}: ${progress.progress}/${activeChallenge.goal}`,
    )
  } catch (error) {
    logger.error(`Error updating challenge progress for ${userId}:`, error)
  }
}

/**
 * Evaluate user progress for a specific challenge
 */
async function evaluateChallengeProgress(
  challengeId: string,
  progress: any,
): Promise<void> {
  const challenge = await CoffeeChallengeDocument.findOne({ challengeId })

  if (!challenge) {
    logger.warn(`Challenge ${challengeId} not found`)
    return
  }

  logger.info(`📊 Evaluating challenge: ${challenge.title}`)

  let currentProgress = 0

  if (challenge.title.includes('Try 3 new combinations')) {
    // Count unique coffee combinations for this user
    currentProgress = await countUniqueUserCombinations(
      progress.userId,
      challenge,
    )
  } else if (challenge.title.includes('participation')) {
    // Count session participations
    currentProgress = await countUserSessionParticipations(
      progress.userId,
      challenge,
    )
  }

  progress.progress = currentProgress

  // Mark as completed if goal reached
  if (currentProgress >= challenge.goal && !progress.isCompleted) {
    progress.isCompleted = true
    progress.completedAt = new Date()
    logger.info(
      `🎉 Challenge "${challenge.title}" completed by user ${progress.userName}`,
    )
  }
}

/**
 * Count unique coffee combinations for a user within challenge period
 */
async function countUniqueUserCombinations(
  userId: string,
  challenge: any,
): Promise<number> {
  const combinationSet = new Set<string>()

  const orders = await CoffeeRequestDocument.find({
    coffeeCrewPerson: userId,
    createdAt: {
      $gte: challenge.startDate,
      $lte: challenge.endDate,
    },
  })

  for (const order of orders) {
    const combination = `${order.coffeeType}|${order.aromaStrength}|${order.sugar}|${order.temperature}`
    combinationSet.add(combination)
  }

  logger.info(`User ${userId} has ${combinationSet.size} unique combinations`)
  return combinationSet.size
}

/**
 * Count session participations for a user within challenge period
 */
async function countUserSessionParticipations(
  userId: string,
  challenge: any,
): Promise<number> {
  const sessionIds = await CoffeeRequestDocument.distinct('sessionId', {
    coffeeCrewPerson: userId,
    createdAt: {
      $gte: challenge.startDate,
      $lte: challenge.endDate,
    },
  })

  logger.info(`User ${userId} participated in ${sessionIds.length} sessions`)
  return sessionIds.length
}

/**
 * Evaluate team challenges (100% participation)
 * Should be called by admin periodically
 */
export async function evaluateTeamChallenges(): Promise<void> {
  logger.info('👥 Evaluating team challenges')

  const teamChallenges = await CoffeeChallengeDocument.find({
    isActive: true,
    type: 'team',
  })

  for (const challenge of teamChallenges) {
    try {
      // Get the session within challenge period
      const sessions = await CoffeeSessionDocument.find({
        startDateTime: {
          $gte: challenge.startDate,
          $lte: challenge.endDate,
        },
      })

      for (const session of sessions) {
        const totalCrew = session.coffeeCrewNumber
        const participantsCount = await CoffeeRequestDocument.distinct(
          'coffeeCrewPerson',
          {
            sessionId: session.sessionId,
          },
        )

        const participationRate = (participantsCount.length / totalCrew) * 100

        logger.info(
          `Session ${session.sessionId}: ${participantsCount.length}/${totalCrew} participated (${participationRate}%)`,
        )

        // Check if 100% participation achieved
        if (participationRate === 100) {
          logger.info(
            `🎉 100% participation achieved in session ${session.sessionId}`,
          )

          // Update all participants' progress
          for (const userId of participantsCount as any[]) {
            const userOrders = await CoffeeRequestDocument.find({
              sessionId: session.sessionId,
              coffeeCrewPerson: userId,
            })

            if (userOrders.length > 0) {
              const userName = userOrders[0].coffeeCrewPersonName

              let progress = await UserChallengeProgressDocument.findOne({
                userId: userId,
                challengeId: challenge.challengeId,
              })

              if (!progress) {
                progress = new UserChallengeProgressDocument({
                  userId: userId,
                  userName: userName,
                  challengeId: challenge.challengeId,
                  progress: 1,
                  isCompleted: true,
                  completedAt: new Date(),
                })
              } else {
                progress.progress = Math.min(
                  progress.progress + 1,
                  challenge.goal,
                )
                if (
                  progress.progress >= challenge.goal &&
                  !progress.isCompleted
                ) {
                  progress.isCompleted = true
                  progress.completedAt = new Date()
                }
              }

              await progress.save()
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        `Error evaluating team challenge ${challenge.challengeId}:`,
        error,
      )
    }
  }
}

/**
 * Initialize default weekly challenges
 */
export async function initializeDefaultChallenges(): Promise<void> {
  logger.info('🚀 Initializing default challenges')

  try {
    // Check if weekly challenge already exists
    const existingWeekly = await CoffeeChallengeDocument.findOne({
      type: 'weekly',
      isActive: true,
    })

    if (!existingWeekly) {
      const startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      // Start from Monday
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1)

      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)
      endDate.setHours(23, 59, 59, 999)

      const weeklyChallenge = new CoffeeChallengeDocument({
        challengeId: `weekly-${Date.now()}`,
        type: 'weekly',
        title: 'Try 3 new combinations',
        description:
          'Experiment with different coffee combinations this week. Order 3 unique coffee combinations.',
        goal: 3,
        goalDescription: 'Try 3 unique coffee combinations',
        startDate: startDate,
        endDate: endDate,
        badgeEmoji: '🔬',
        badgeName: 'Coffee Explorer',
        badgeDescription:
          'Adventurous spirit who loves trying new coffee combinations!',
        isActive: true,
      })

      await weeklyChallenge.save()
      logger.info('✅ Created weekly challenge: Try 3 new combinations')
    }

    // Check if team challenge already exists
    const existingTeam = await CoffeeChallengeDocument.findOne({
      type: 'team',
      isActive: true,
    })

    if (!existingTeam) {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const teamChallenge = new CoffeeChallengeDocument({
        challengeId: `team-${Date.now()}`,
        type: 'team',
        title: 'Achieve 100% participation',
        description:
          'Get the entire coffee crew to participate in 1 session. Team challenges reward everyone!',
        goal: 1,
        goalDescription: 'Full team participation in one session',
        startDate: startDate,
        endDate: endDate,
        badgeEmoji: '👥',
        badgeName: 'Team Player',
        badgeDescription: 'Part of a perfectly coordinated coffee crew!',
        isActive: true,
      })

      await teamChallenge.save()
      logger.info('✅ Created team challenge: Achieve 100% participation')
    }
  } catch (error) {
    logger.error('Error initializing default challenges:', error)
  }
}

/**
 * Archive expired challenges
 */
export async function archiveExpiredChallenges(): Promise<void> {
  logger.info('📦 Archiving expired challenges')

  try {
    const result = await CoffeeChallengeDocument.updateMany(
      {
        isActive: true,
        endDate: { $lt: new Date() },
      },
      { isActive: false },
    )

    if (result.modifiedCount > 0) {
      logger.info(`✅ Archived ${result.modifiedCount} expired challenges`)
    }
  } catch (error) {
    logger.error('Error archiving expired challenges:', error)
  }
}
