/**
 * Get the human-readable label for a coffee type emoji
 * @param coffeeType - The coffee type emoji ('🥛' or '☕️')
 * @returns The label for the coffee type
 */
export function getCoffeeTypeLabel(coffeeType: string): string {
  return coffeeType === '🥛' ? 'With Milk' : 'Black Coffee'
}

/**
 * Get the human-readable label for a temperature emoji
 * @param temperature - The temperature emoji ('🥵', '🧊', or '🏡🛋️')
 * @returns The label for the temperature
 */
export function getTemperatureLabel(temperature: string): string {
  if (temperature === '🥵') return 'Hot'
  if (temperature === '🧊') return 'Cold'
  return 'Room Temp'
}
