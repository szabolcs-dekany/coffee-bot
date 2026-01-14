import mongoose, { Document, Schema } from 'mongoose'

export interface ICoffeeFeedback extends Document {
  sessionId: string
  userId: string
  userName: string
  rating: number
  comment?: string
  createdAt?: Date
  updatedAt?: Date
}

const FeedbackSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: false },
  },
  {
    timestamps: true,
  },
)

export const FeedbackDocument = mongoose.model<ICoffeeFeedback>(
  'coffee_feedback',
  FeedbackSchema,
)
