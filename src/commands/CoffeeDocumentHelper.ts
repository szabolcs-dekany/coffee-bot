import { ICoffeeRequest } from '../documents/CoffeeDocument'

export const isCompleteCoffeeDocument = (document: ICoffeeRequest): boolean => {
  return (
    document.coffeeType !== undefined &&
    document.aromaStrength !== undefined &&
    document.sugar !== undefined
  )
}
