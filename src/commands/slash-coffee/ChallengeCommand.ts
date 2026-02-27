import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  ColorResolvable,
} from 'discord.js'
import { CoffeeChallengeDocument } from '../../documents/CoffeeChallenge'
import { UserChallengeProgressDocument } from '../../documents/UserChallengeProgress'
import { CoffeeBadgeDocument } from '../../documents/CoffeeBadge'
import { createLogger } from '../../utils/logger'

const logger = createLogger('challenge-command')

const MAX_FIELDS_PER_EMBED = 25

export const data = new SlashCommandBuilder()
  .setName('challenge')
  .setDescription('View and manage coffee challenges')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View all active coffee challenges'),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('progress')
      .setDescription('Check your progress on challenges'),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('claim')
      .setDescription('Claim a completed challenge reward')
      .addStringOption(option =>
        option
          .setName('challenge-id')
          .setDescription('The ID of the challenge to claim')
          .setRequired(true),
      ),
  )
  .addSubcommand(subcommand =>
    subcommand.setName('badges').setDescription('View your earned badges'),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()
  const userName = interaction.user.displayName || interaction.user.username
  const userId = interaction.user.id

  logger.info(`🎯 ${userName} executed /challenge ${subcommand}`)

  await interaction.deferReply({ ephemeral: true })

  try {
    switch (subcommand) {
      case 'view':
        await handleViewChallenges(interaction)
        break
      case 'progress':
        await handleViewProgress(interaction, userId, userName)
        break
      case 'claim':
        await handleClaimReward(interaction, userId, userName)
        break
      case 'badges':
        await handleViewBadges(interaction, userId, userName)
        break
    }
  } catch (error) {
    logger.error(`Error executing challenge ${subcommand}:`, error)
    await interaction.followUp({
      content: 'There was an error processing your request.',
      ephemeral: true,
    })
  }
}

async function handleViewChallenges(interaction: ChatInputCommandInteraction) {
  logger.info('📋 Fetching active challenges')

  const challenges = await CoffeeChallengeDocument.find({
    isActive: true,
  }).sort({ startDate: 1 })

  if (challenges.length === 0) {
    await interaction.followUp({
      content: 'No active challenges at the moment. Check back soon!',
      ephemeral: true,
    })
    return
  }

  const embeds = chunkEmbedFields(
    challenges.map(challenge => ({
      name: `${challenge.badgeEmoji} ${challenge.title}`,
      value: `**ID:** \`${challenge.challengeId}\`\n**Goal:** ${challenge.goalDescription}\n**Duration:** ${Math.ceil((challenge.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left\n**Type:** ${challenge.type === 'weekly' ? '📅 Weekly' : '👥 Team'}`,
    })),
    Colors.Orange,
    '🏆 Coffee Challenges',
    'Complete challenges to earn badges and special roles!',
  )

  for (const embed of embeds) {
    embed.setFooter({
      text: 'Use `/challenge progress` to track your progress! Use `/challenge claim <challenge-id>` to claim rewards.',
    })
  }

  await interaction.followUp({ embeds, ephemeral: true })
  logger.info(`✅ Displayed ${challenges.length} active challenges`)
}

async function handleViewProgress(
  interaction: ChatInputCommandInteraction,
  userId: string,
  userName: string,
) {
  logger.info(`📊 Fetching progress for ${userName}`)

  const challenges = await CoffeeChallengeDocument.find({
    isActive: true,
  }).sort({ startDate: 1 })

  if (challenges.length === 0) {
    await interaction.followUp({
      content: 'No active challenges at the moment.',
      ephemeral: true,
    })
    return
  }

  const fields: Array<{ name: string; value: string }> = []

  for (const challenge of challenges) {
    let progress = await UserChallengeProgressDocument.findOne({
      userId: userId,
      challengeId: challenge.challengeId,
    })

    if (!progress) {
      progress = new UserChallengeProgressDocument({
        userId: userId,
        userName: userName,
        challengeId: challenge.challengeId,
        progress: 0,
        isCompleted: false,
      })
      await progress.save()
    }

    const percentage = Math.min(
      100,
      Math.round((progress.progress / challenge.goal) * 100),
    )
    const progressBar = createProgressBar(percentage)
    const status = progress.isCompleted
      ? '✅ Completed!'
      : `${progress.progress}/${challenge.goal}`

    fields.push({
      name: `${challenge.badgeEmoji} ${challenge.title}`,
      value: `**ID:** \`${challenge.challengeId}\`\n${progressBar}\n${status}`,
    })
  }

  const embeds = chunkEmbedFields(
    fields,
    Colors.Gold,
    '🎯 Your Challenge Progress',
    `Tracking progress for ${userName}`,
  )

  await interaction.followUp({ embeds, ephemeral: true })
  logger.info(`✅ Displayed progress for ${userName}`)
}

async function handleClaimReward(
  interaction: ChatInputCommandInteraction,
  userId: string,
  userName: string,
) {
  const challengeId = interaction.options.getString('challenge-id', true)

  logger.info(
    `🎁 ${userName} attempting to claim reward for challenge ${challengeId}`,
  )

  const challenge = await CoffeeChallengeDocument.findOne({
    challengeId: challengeId,
  })

  if (!challenge) {
    logger.info(`❌ Challenge ${challengeId} not found`)
    await interaction.followUp({
      content: 'Challenge not found!',
      ephemeral: true,
    })
    return
  }

  // Atomically claim the reward - only if completed and not already claimed
  const progress = await UserChallengeProgressDocument.findOneAndUpdate(
    {
      userId: userId,
      challengeId: challengeId,
      isCompleted: true,
      claimedAt: { $exists: false },
    },
    { $set: { claimedAt: new Date() } },
    { new: true },
  )

  if (!progress) {
    // Check if not completed or already claimed
    const existingProgress = await UserChallengeProgressDocument.findOne({
      userId: userId,
      challengeId: challengeId,
    })

    if (!existingProgress || !existingProgress.isCompleted) {
      logger.info(`❌ ${userName} has not completed challenge ${challengeId}`)
      await interaction.followUp({
        content: 'You haven\'t completed this challenge yet!',
        ephemeral: true,
      })
      return
    }

    if (existingProgress.claimedAt) {
      logger.info(
        `⚠️ ${userName} already claimed reward for challenge ${challengeId}`,
      )
      await interaction.followUp({
        content: 'You have already claimed the reward for this challenge!',
        ephemeral: true,
      })
      return
    }

    // Fallback error
    await interaction.followUp({
      content: 'Unable to claim reward. Please try again.',
      ephemeral: true,
    })
    return
  }

  // Create badge (idempotent - use upsert)
  await CoffeeBadgeDocument.findOneAndUpdate(
    { userId: userId, challengeId: challengeId },
    {
      $set: {
        badgeId: `${challenge.badgeName}_${challengeId}`,
        badgeName: challenge.badgeName,
        badgeEmoji: challenge.badgeEmoji,
        badgeDescription: challenge.badgeDescription,
        earnedAt: new Date(),
      },
      $setOnInsert: {
        userId: userId,
        userName: userName,
        challengeId: challengeId,
      },
    },
    { upsert: true },
  )
  logger.info(`💾 Created/updated badge for ${userName}`)

  // Try to assign role - track actual outcome
  let roleAssigned = false
  try {
    const member = interaction.guild?.members.cache.get(userId)
    if (member) {
      const role = interaction.guild?.roles.cache.find(
        r => r.name === challenge.badgeName,
      )
      if (role) {
        await member.roles.add(role)
        roleAssigned = true
        logger.info(`✅ Added role "${challenge.badgeName}" to ${userName}`)
      } else {
        logger.info(`⚠️ Role "${challenge.badgeName}" not found in guild`)
      }
    } else {
      logger.info(`⚠️ Member not found in guild for ${userName}`)
    }
  } catch (error) {
    logger.error(`Error assigning role to ${userName}:`, error)
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle('🎉 Challenge Completed!')
    .setDescription(`Congratulations on completing: **${challenge.title}**`)
    .addFields({
      name: 'Badge Earned',
      value: `${challenge.badgeEmoji} **${challenge.badgeName}**\n${challenge.badgeDescription}`,
    })

  if (roleAssigned) {
    embed.addFields({
      name: 'Special Role',
      value: `You've been granted the **${challenge.badgeName}** role!`,
    })
  }

  await interaction.followUp({ embeds: [embed], ephemeral: true })
  logger.info(`🎉 ${userName} claimed reward for challenge ${challengeId}`)
}

async function handleViewBadges(
  interaction: ChatInputCommandInteraction,
  userId: string,
  userName: string,
) {
  logger.info(`🏅 Fetching badges for ${userName}`)

  const badges = await CoffeeBadgeDocument.find({ userId: userId }).sort({
    earnedAt: -1,
  })

  if (badges.length === 0) {
    await interaction.followUp({
      content:
        'You haven\'t earned any badges yet. Start completing challenges!',
      ephemeral: true,
    })
    return
  }

  const embeds = chunkEmbedFields(
    badges.map(badge => ({
      name: `${badge.badgeEmoji} ${badge.badgeName}`,
      value: `${badge.badgeDescription}\nEarned: ${badge.earnedAt.toLocaleDateString()}`,
    })),
    Colors.Gold,
    '🏅 Your Badges',
    `${userName} has earned ${badges.length} badge${badges.length !== 1 ? 's' : ''}!`,
  )

  await interaction.followUp({ embeds, ephemeral: true })
  logger.info(`✅ Displayed ${badges.length} badges for ${userName}`)
}

function createProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 10)
  const empty = 10 - filled
  return `\`${'█'.repeat(filled)}${'░'.repeat(empty)}\` ${percentage}%`
}

/**
 * Chunk fields into multiple embeds to respect Discord's 25-field limit
 */
function chunkEmbedFields(
  fields: Array<{ name: string; value: string }>,
  color: ColorResolvable,
  title: string,
  description: string,
): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = []

  for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_EMBED) {
    const chunk = fields.slice(i, i + MAX_FIELDS_PER_EMBED)
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(i === 0 ? title : `${title} (continued)`)
      .setDescription(i === 0 ? description : '')

    for (const field of chunk) {
      embed.addFields({
        ...field,
        inline: false,
      })
    }

    embeds.push(embed)
  }

  return embeds.length > 0
    ? embeds
    : [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(description),
      ]
}
