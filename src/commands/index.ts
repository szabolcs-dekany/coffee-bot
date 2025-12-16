import * as coffee from './slash-coffee/CoffeeCommand'
import * as session from './slash-coffee/LatestCoffeeSessionCommand'
import * as alert from './slash-coffee/AlertCurrentSession'
import * as coffeestats from './slash-coffee/CoffeeStatsCommand'
import * as mystats from './slash-coffee/MyStatsCommand'

export const commands = {
  coffee,
  session,
  alert,
  coffeestats,
  mystats,
}
