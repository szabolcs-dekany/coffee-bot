import { BaseSelectHandler } from './BaseSelectHandler'
import { CoffeeTypeHandler } from './handlers/CoffeeTypeHandler'
import { AromaStrengthHandler } from './handlers/AromaStrengthHandler'
import { SugarHandler } from './handlers/SugarHandler'
import { TemperatureHandler } from './handlers/TemperatureHandler'

export type ResponseType =
  | 'coffee-type'
  | 'aroma-strength'
  | 'sugar'
  | 'temperature'

class ResponseHandlerRegistry {
  private handlers: Map<ResponseType, BaseSelectHandler>

  constructor() {
    this.handlers = new Map([
      ['coffee-type', new CoffeeTypeHandler()],
      ['aroma-strength', new AromaStrengthHandler()],
      ['sugar', new SugarHandler()],
      ['temperature', new TemperatureHandler()],
    ])
  }

  getHandler(responseType: ResponseType): BaseSelectHandler | undefined {
    return this.handlers.get(responseType)
  }

  hasHandler(responseType: string): responseType is ResponseType {
    return this.handlers.has(responseType as ResponseType)
  }
}

export const responseHandlerRegistry = new ResponseHandlerRegistry()
