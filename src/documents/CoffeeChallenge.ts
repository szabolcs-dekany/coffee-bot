import mongoose, { Document, Schema } from 'mongoose'

export type ChallengeType = 'weekly' | 'team'
export type ChallengeMetric = 'unique_combinations' | 'session_participation'

export interface ICoffeeChallenge extends Document {
  challengeId: string
  type: ChallengeType
  metric?: ChallengeMetric
  title: string
  description: string
  goal: number
  goalDescription: string
  startDate: Date
  endDate: Date
  badgeEmoji: string
  badgeName: string
  badgeDescription: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const CoffeeChallengeSchema: Schema = new Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    type: { type: String, enum: ['weekly', 'team'], required: true },
    metric: {
      type: String,
      enum: ['unique_combinations', 'session_participation'],
      required: false,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    goal: { type: Number, required: true },
    goalDescription: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    badgeEmoji: { type: String, required: true },
    badgeName: { type: String, required: true },
    badgeDescription: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const CoffeeChallengeDocument = mongoose.model<ICoffeeChallenge>(
  'coffee_challenge',
  CoffeeChallengeSchema,
)
