import {
  CoffeeRequestDocument,
  ICoffeeRequest,
} from '../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../documents/CoffeeSession'

export interface CreateOrderParams {
  sessionId: string
  userId: string
  userName: string
  coffeeType?: string
  aromaStrength?: string
  sugar?: string
  temperature?: string
}

export interface LatestSession {
  sessionId: string
  startDateTime: Date
}

export class CoffeeOrderService {
  static async findBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<ICoffeeRequest | null> {
    return CoffeeRequestDocument.findOne({
      sessionId,
      coffeeCrewPerson: userId,
    })
  }

  static async upsertOrder(params: CreateOrderParams): Promise<ICoffeeRequest> {
    const existing = await this.findBySessionAndUser(
      params.sessionId,
      params.userId,
    )

    if (existing) {
      if (params.coffeeType) existing.coffeeType = params.coffeeType
      if (params.aromaStrength) existing.aromaStrength = params.aromaStrength
      if (params.sugar) existing.sugar = params.sugar
      if (params.temperature) existing.temperature = params.temperature
      await existing.save()
      return existing
    }

    const order = new CoffeeRequestDocument({
      sessionId: params.sessionId,
      coffeeCrewPerson: params.userId,
      coffeeCrewPersonName: params.userName,
      coffeeType: params.coffeeType,
      aromaStrength: params.aromaStrength,
      sugar: params.sugar,
      temperature: params.temperature,
    })
    await order.save()
    return order
  }

  static async getLatestSession(): Promise<LatestSession | null> {
    const session = await CoffeeSessionDocument.findOne().sort({
      startDateTime: -1,
    })
    return session
      ? { sessionId: session.sessionId, startDateTime: session.startDateTime }
      : null
  }

  static async getSessionOrders(sessionId: string): Promise<ICoffeeRequest[]> {
    return CoffeeRequestDocument.find({ sessionId })
  }

  static async getSessionById(
    sessionId: string,
  ): Promise<{ sessionId: string; startDateTime: Date } | null> {
    const session = await CoffeeSessionDocument.findOne({ sessionId })
    return session
      ? { sessionId: session.sessionId, startDateTime: session.startDateTime }
      : null
  }

  static async createSession(params: {
    sessionId: string
    estimatedTimeOfCoffee: string
    coffeeCrewNumber: number
  }): Promise<void> {
    const session = new CoffeeSessionDocument({
      sessionId: params.sessionId,
      estimatedTimeOfCoffee: params.estimatedTimeOfCoffee,
      startDateTime: new Date(),
      coffeeCrewNumber: params.coffeeCrewNumber,
    })
    await session.save()
  }
}
