import {
  CoffeeFavoriteDocument,
  ICoffeeFavorite,
} from '../documents/CoffeeFavorite'

export interface FavoriteData {
  userId: string
  userName: string
  favoriteName: string
  coffeeType: string
  aromaStrength: string
  sugar: string
  temperature: string
}

export class FavoriteService {
  static async findByUserAndName(
    userId: string,
    favoriteName: string,
  ): Promise<ICoffeeFavorite | null> {
    return CoffeeFavoriteDocument.findOne({ userId, favoriteName })
  }

  static async findAllByUser(userId: string): Promise<ICoffeeFavorite[]> {
    return CoffeeFavoriteDocument.find({ userId }).sort({ favoriteName: 1 })
  }

  static async upsertFavorite(
    data: FavoriteData,
  ): Promise<ICoffeeFavorite | null> {
    return CoffeeFavoriteDocument.findOneAndUpdate(
      { userId: data.userId, favoriteName: data.favoriteName },
      {
        $set: {
          coffeeType: data.coffeeType,
          aromaStrength: data.aromaStrength,
          sugar: data.sugar,
          temperature: data.temperature,
        },
        $setOnInsert: { userName: data.userName },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  static async deleteFavorite(
    userId: string,
    favoriteName: string,
  ): Promise<boolean> {
    const result = await CoffeeFavoriteDocument.deleteOne({
      userId,
      favoriteName,
    })
    return result.deletedCount > 0
  }

  static async searchFavorites(
    userId: string,
    query: string,
    limit: number = 25,
  ): Promise<ICoffeeFavorite[]> {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return CoffeeFavoriteDocument.find({
      userId,
      favoriteName: { $regex: escapedQuery, $options: 'i' },
    })
      .limit(limit)
      .sort({ favoriteName: 1 })
  }
}
