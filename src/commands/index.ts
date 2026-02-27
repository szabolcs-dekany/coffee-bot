import * as coffee from './slash-coffee/CoffeeCommand'
import * as session from './slash-coffee/LatestCoffeeSessionCommand'
import * as alert from './slash-coffee/AlertCurrentSession'
import * as coffeestats from './slash-coffee/CoffeeStatsCommand'
import * as mystats from './slash-coffee/MyStatsCommand'
import * as rate from './slash-coffee/RateCommand'
import * as feedback from './slash-coffee/FeedbackCommand'
import * as savefavorite from './slash-coffee/SaveFavoriteCommand'
import * as favorites from './slash-coffee/FavoritesCommand'
import * as usefavorite from './slash-coffee/UseFavoriteCommand'
import * as deletefavorite from './slash-coffee/DeleteFavoriteCommand'
import * as challenge from './slash-coffee/ChallengeCommand'

export const commands = {
  coffee,
  session,
  alert,
  coffeestats,
  mystats,
  rate,
  feedback,
  savefavorite,
  favorites,
  usefavorite,
  deletefavorite,
  challenge,
}
