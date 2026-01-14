import mongoose, { Document, Schema } from 'mongoose'

export interface ICoffeeRequest extends Document {
  sessionId: string
  coffeeType: string
  milkType: string
  aromaStrength: string
  sugar: string
  temperature: string
  coffeeCrewPerson: string
  coffeeCrewPersonName: string
  createdAt?: Date
  updatedAt?: Date
}

const CoffeeRequestSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true },
    coffeeType: { type: String, required: false },
    milkType: { type: String, required: false },
    aromaStrength: { type: String, required: false },
    sugar: { type: String, required: false },
    temperature: { type: String, required: false },
    coffeeCrewPerson: { type: String, required: true },
    coffeeCrewPersonName: { type: String, required: true },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields automatically
  },
)

export const CoffeeRequestDocument = mongoose.model<ICoffeeRequest>(
  'coffee_request',
  CoffeeRequestSchema,
)
