import mongoose, { Document, Schema } from 'mongoose'

interface IUserChallengeProgress extends Document {
  userId: string
  userName: string
  challengeId: string
  progress: number
  isCompleted: boolean
  completedAt?: Date
  claimedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const UserChallengeProgressSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    challengeId: { type: String, required: true },
    progress: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    claimedAt: { type: Date },
  },
  { timestamps: true },
)

// Unique index: one progress record per user per challenge
UserChallengeProgressSchema.index(
  { userId: 1, challengeId: 1 },
  { unique: true },
)

export const UserChallengeProgressDocument =
  mongoose.model<IUserChallengeProgress>(
    'user_challenge_progress',
    UserChallengeProgressSchema,
  )
