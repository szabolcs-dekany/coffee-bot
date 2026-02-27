import mongoose, { Document, Schema } from 'mongoose'

export interface ICoffeeBadge extends Document {
  userId: string
  userName: string
  badgeId: string
  badgeName: string
  badgeEmoji: string
  badgeDescription: string
  challengeId: string
  earnedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

const CoffeeBadgeSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    badgeId: { type: String, required: true },
    badgeName: { type: String, required: true },
    badgeEmoji: { type: String, required: true },
    badgeDescription: { type: String, required: true },
    challengeId: { type: String, required: true },
    earnedAt: { type: Date, required: true },
  },
  { timestamps: true },
)

// Unique index: one badge per user per challenge (can't earn same badge twice)
CoffeeBadgeSchema.index({ userId: 1, challengeId: 1 }, { unique: true })

export const CoffeeBadgeDocument = mongoose.model<ICoffeeBadge>(
  'coffee_badge',
  CoffeeBadgeSchema,
)
