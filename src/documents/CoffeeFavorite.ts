import mongoose, { Document, Schema } from 'mongoose'

export interface ICoffeeFavorite extends Document {
  userId: string
  userName: string
  favoriteName: string
  coffeeType: string
  aromaStrength: string
  sugar: string
  temperature: string
  createdAt?: Date
  updatedAt?: Date
}

const CoffeeFavoriteSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    favoriteName: { type: String, required: true },
    coffeeType: { type: String, required: true },
    aromaStrength: { type: String, required: true },
    sugar: { type: String, required: true },
    temperature: { type: String, required: true },
  },
  {
    timestamps: true,
  },
)

// Create unique index on userId + favoriteName (each user can have unique favorite names)
CoffeeFavoriteSchema.index({ userId: 1, favoriteName: 1 }, { unique: true })

export const CoffeeFavoriteDocument = mongoose.model<ICoffeeFavorite>(
  'coffee_favorites',
  CoffeeFavoriteSchema,
)
