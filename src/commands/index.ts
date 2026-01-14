import * as coffee from './slash-coffee/CoffeeCommand'
import * as session from './slash-coffee/LatestCoffeeSessionCommand'
import * as alert from './slash-coffee/AlertCurrentSession'
import * as coffeestats from './slash-coffee/CoffeeStatsCommand'
import * as mystats from './slash-coffee/MyStatsCommand'
import * as rate from './slash-coffee/RateCommand'
import * as feedback from './slash-coffee/FeedbackCommand'

export const commands = {
  coffee,
  session,
  alert,
  coffeestats,
  mystats,
  rate,
  feedback,
}
