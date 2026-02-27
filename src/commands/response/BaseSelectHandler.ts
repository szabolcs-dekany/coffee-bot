import { StringSelectMenuInteraction } from 'discord.js'
import {
  CoffeeOrderService,
  CreateOrderParams,
} from '../../services/CoffeeOrderService'
import { ICoffeeRequest } from '../../documents/CoffeeDocument'

export type SelectMenuField =
  | 'coffeeType'
  | 'aromaStrength'
  | 'sugar'
  | 'temperature'

export abstract class BaseSelectHandler {
  abstract readonly field: SelectMenuField

  async handle(
    interaction: StringSelectMenuInteraction,
    sessionId: string,
  ): Promise<ICoffeeRequest | null> {
    const userId = interaction.user.id
    const userName = interaction.user.displayName || interaction.user.username
    const value = interaction.values[0]

    const params: CreateOrderParams = {
      sessionId,
      userId,
      userName,
      [this.field]: value,
    }

    return CoffeeOrderService.upsertOrder(params)
  }
}
