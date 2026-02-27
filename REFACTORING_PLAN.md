# Coffee Bot - Clean Code & SOLID Refactoring Plan

This document outlines a comprehensive refactoring plan to improve the coffee-bot codebase based on clean code principles and SOLID design patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Priority Matrix](#priority-matrix)
3. [Phase 1: Quick Wins (Low Effort, High Impact)](#phase-1-quick-wins-low-effort-high-impact)
4. [Phase 2: Code Organization](#phase-2-code-organization)
5. [Phase 3: Design Patterns](#phase-3-design-patterns)
6. [Phase 4: Architecture](#phase-4-architecture)
7. [Testing Strategy](#testing-strategy)
8. [Migration Guide](#migration-guide)

---

## Overview

### Current Issues Summary

| Category              | Count | Severity |
| --------------------- | ----- | -------- |
| SRP Violations        | 4     | High     |
| OCP Violations        | 2     | Medium   |
| DIP Violations        | 12    | Medium   |
| Code Duplication      | 15+   | Medium   |
| Magic Strings         | 20+   | Low      |
| `any` Types           | 5     | Medium   |
| Functions > 100 lines | 6     | High     |

### Goals

- Reduce code duplication by 60%
- Enable unit testing through dependency injection
- Improve maintainability and extensibility
- Follow SOLID principles consistently

---

## Priority Matrix

```
                    High Impact
                         │
    Phase 2              │              Phase 1
    (Constants,          │              (Logger Factory,
     Services)           │               Permissions)
                         │
Low Effort ──────────────┼────────────── High Effort
                         │
    Phase 3              │              Phase 4
    (Patterns,           │              (DI Container,
     Repositories)       │               Full Architecture)
                         │
                    Low Impact
```

---

## Phase 1: Quick Wins (Low Effort, High Impact)

**Estimated Time: 2-3 hours**

### 1.1 Create Logger Factory

**Problem:** Every file duplicates logger configuration.

**Current Code (repeated 15+ times):**

```typescript
const logger = pino({
  name: 'coffee-bot-xxx',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})
```

**Solution:** Create a factory function.

**File:** `src/utils/logger.ts`

```typescript
import pino from 'pino'

export function createLogger(moduleName: string) {
  return pino({
    name: `coffee-bot-${moduleName}`,
    level: process.env.LOG_LEVEL || 'debug',
    transport: {
      target: 'pino-pretty',
    },
  })
}

// Usage:
// const logger = createLogger('coffee-command')
```

**Migration Steps:**

1. Create `src/utils/logger.ts`
2. Replace all logger instantiations across all files
3. Update imports in all command files

---

### 1.2 Extract Constants

**Problem:** Magic strings and values scattered throughout codebase.

**Solution:** Create centralized constant files.

**File:** `src/constants/roles.ts`

```typescript
export const ROLES = {
  COFFEE_CREW_CORE: 'coffee-crew-core',
  COFFEE_CREW: 'coffee-crew',
} as const

export function hasRole(
  roles: Map<string, any> | undefined,
  roleName: string,
): boolean {
  return roles?.some(role => role.name === roleName) ?? false
}
```

**File:** `src/constants/coffeeOptions.ts`

```typescript
export const COFFEE_TYPES = {
  WITH_MILK: '🥛',
  BLACK: '☕️',
} as const

export const AROMA_STRENGTHS = {
  LEVEL_1: '🫘',
  LEVEL_2: '🫘🫘',
  LEVEL_3: '🫘🫘🫘',
  LEVEL_4: '🫘🫘🫘🫘',
  LEVEL_5: '🫘🫘🫘🫘🫘',
} as const

export const SUGAR_LEVELS = {
  NONE: 'none',
  ONE: '🍰',
  TWO: '🍰🍰',
  THREE: '🍰🍰🍰',
  FOUR: '🍰🍰🍰🍰',
} as const

export const TEMPERATURES = {
  HOT: '🥵',
  ROOM: '🏡🛋️',
  COLD: '🧊',
} as const

// Mapping objects for calculations
export const AROMA_STRENGTH_MAP: Record<string, number> = {
  '🫘': 1,
  '🫘🫘': 2,
  '🫘🫘🫘': 3,
  '🫘🫘🫘🫘': 4,
  '🫘🫘🫘🫘🫘': 5,
}

export const SUGAR_MAP: Record<string, number> = {
  none: 0,
  '🍰': 1,
  '🍰🍰': 2,
  '🍰🍰🍰': 3,
  '🍰🍰🍰🍰': 4,
}

export const TEMPERATURE_LABELS: Record<string, string> = {
  '🥵': 'Hot',
  '🏡🛋️': 'Room Temp',
  '🧊': 'Cold',
}

export const COFFEE_TYPE_LABELS: Record<string, string> = {
  '🥛': 'With Milk',
  '☕️': 'Black Coffee',
}
```

**File:** `src/constants/index.ts`

```typescript
export * from './roles'
export * from './coffeeOptions'
```

**Migration Steps:**

1. Create constant files
2. Update `coffeeLabels.ts` to use constants
3. Update all commands to use constants
4. Remove inline mapping objects from `MyStatsCommand.ts` and `CoffeeStatsCommand.ts`

---

### 1.3 Create Permission Service

**Problem:** Role checking duplicated across multiple commands.

**Current Code (duplicated 3+ times):**

```typescript
const member = interaction.guild?.members.cache.get(interaction.user.id)
const roles = member?.roles.cache
const hasCoffeeCrewRole = roles?.some(role => role.name === 'coffee-crew-core')
```

**File:** `src/services/PermissionService.ts`

```typescript
import { CommandInteraction, GuildMember } from 'discord.js'
import { ROLES } from '../constants'

export class PermissionService {
  static hasRole(member: GuildMember | undefined, roleName: string): boolean {
    return member?.roles.cache.some(role => role.name === roleName) ?? false
  }

  static hasCoffeeCrewCoreRole(interaction: CommandInteraction): boolean {
    const member = interaction.guild?.members.cache.get(interaction.user.id)
    return this.hasRole(member, ROLES.COFFEE_CREW_CORE)
  }

  static requireCoffeeCrewCore(interaction: CommandInteraction): {
    valid: boolean
    member?: GuildMember
  } {
    const member = interaction.guild?.members.cache.get(interaction.user.id)
    const hasRole = this.hasRole(member, ROLES.COFFEE_CREW_CORE)
    return { valid: hasRole, member }
  }
}
```

**Migration Steps:**

1. Create `PermissionService.ts`
2. Update `CoffeeCommand.ts`, `LatestCoffeeSessionCommand.ts`, `AlertCurrentSession.ts`
3. Replace inline role checks with service calls

---

### 1.4 Fix Synchronous Functions Incorrectly Marked as Async

**Problem:** Functions marked `async` that don't use `await`.

**Files to Fix:**

`src/commands/response/GenericSelectMenuHandler.ts`:

```typescript
// Before
const getSessionId = async (customId: string) => {
  return customId.split('|')[0]
}

// After
const getSessionId = (customId: string): string => {
  return customId.split('|')[0]
}
```

**Migration Steps:**

1. Remove `async` from `getSessionId` and `getResponseType`
2. Add explicit return types
3. Update any callers if needed

---

### 1.5 Fix Variable Naming

**Problem:** Poor variable name in `CoffeeCommand.ts`.

**File:** `src/commands/slash-coffee/CoffeeCommand.ts`

```typescript
// Before (line 72)
const etc = interaction.options.data[0].value

// After
const estimatedTimeOfCoffee = interaction.options.getString('etc', true)
```

---

## Phase 2: Code Organization

**Estimated Time: 4-6 hours**

### 2.1 Extract Service Layer

**Problem:** Business logic mixed with command handlers.

#### 2.1.1 Create CoffeeOrderService

**File:** `src/services/CoffeeOrderService.ts`

```typescript
import {
  CoffeeRequestDocument,
  ICoffeeRequest,
} from '../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../documents/CoffeeSession'
import { updateUserChallengeProgress } from '../utils/challengeUtils'

export interface CreateOrderParams {
  sessionId: string
  userId: string
  userName: string
  coffeeType?: string
  aromaStrength?: string
  sugar?: string
  temperature?: string
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
      // Update existing order
      if (params.coffeeType) existing.coffeeType = params.coffeeType
      if (params.aromaStrength) existing.aromaStrength = params.aromaStrength
      if (params.sugar) existing.sugar = params.sugar
      if (params.temperature) existing.temperature = params.temperature
      await existing.save()
      return existing
    }

    // Create new order
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

  static async getLatestSession(): Promise<{
    sessionId: string
    startDateTime: Date
  } | null> {
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
}
```

#### 2.1.2 Create FavoriteService

**File:** `src/services/FavoriteService.ts`

```typescript
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

  static async upsertFavorite(data: FavoriteData): Promise<ICoffeeFavorite> {
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
```

#### 2.1.3 Create StatsService

**File:** `src/services/StatsService.ts`

```typescript
import { CoffeeRequestDocument } from '../documents/CoffeeDocument'
import { CoffeeSessionDocument } from '../documents/CoffeeSession'
import { AROMA_STRENGTH_MAP, SUGAR_MAP } from '../constants'

export interface CoffeeTypeStats {
  _id: string
  count: number
}

export interface PersonalStats {
  totalOrders: number
  blackCoffeeCount: number
  avgSugar: number
  avgAroma: number
  blackCoffeePercentage: number
  preferences: Array<{
    type: string
    aroma: string
    sugar: string
    temp: string
  }>
}

export class StatsService {
  static async getCoffeeTypeStats(
    limit: number = 5,
  ): Promise<CoffeeTypeStats[]> {
    return CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
  }

  static async getTopCoffeeDrinkers(
    limit: number = 5,
  ): Promise<CoffeeTypeStats[]> {
    return CoffeeRequestDocument.aggregate([
      { $group: { _id: '$coffeeCrewPersonName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
  }

  static async getPersonalStats(userName: string): Promise<PersonalStats[]> {
    return CoffeeRequestDocument.aggregate([
      { $match: { coffeeCrewPersonName: userName } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          blackCoffeeCount: {
            $sum: { $cond: [{ $eq: ['$coffeeType', '☕️'] }, 1, 0] },
          },
          avgSugar: {
            $avg: {
              $switch: {
                branches: Object.entries(SUGAR_MAP).map(([emoji, value]) => ({
                  case: { $eq: ['$sugar', emoji] },
                  then: value,
                })),
                default: 0,
              },
            },
          },
          avgAroma: {
            $avg: {
              $switch: {
                branches: Object.entries(AROMA_STRENGTH_MAP).map(
                  ([emoji, value]) => ({
                    case: { $eq: ['$aromaStrength', emoji] },
                    then: value,
                  }),
                ),
                default: 0,
              },
            },
          },
          preferences: {
            $push: {
              type: '$coffeeType',
              aroma: '$aromaStrength',
              sugar: '$sugar',
              temp: '$temperature',
            },
          },
        },
      },
      {
        $addFields: {
          blackCoffeePercentage: {
            $multiply: [
              { $divide: ['$blackCoffeeCount', '$totalOrders'] },
              100,
            ],
          },
        },
      },
    ])
  }

  static async getTotalCounts(): Promise<{
    sessions: number
    requests: number
  }> {
    const [sessions, requests] = await Promise.all([
      CoffeeSessionDocument.countDocuments(),
      CoffeeRequestDocument.countDocuments(),
    ])
    return { sessions, requests }
  }
}
```

---

### 2.2 Extract Response Handler Base Class

**Problem:** Response handlers have near-identical structure.

**File:** `src/commands/response/BaseSelectHandler.ts`

```typescript
import { StringSelectMenuInteraction } from 'discord.js'
import {
  CoffeeOrderService,
  CreateOrderParams,
} from '../../services/CoffeeOrderService'

export type SelectMenuField =
  | 'coffeeType'
  | 'aromaStrength'
  | 'sugar'
  | 'temperature'

export abstract class BaseSelectHandler {
  abstract readonly field: SelectMenuField

  async handle(interaction: StringSelectMenuInteraction, sessionId: string) {
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
```

**File:** `src/commands/response/CoffeeTypeHandler.ts`

```typescript
import { BaseSelectHandler, SelectMenuField } from './BaseSelectHandler'

export class CoffeeTypeHandler extends BaseSelectHandler {
  readonly field: SelectMenuField = 'coffeeType'
}
```

**File:** `src/commands/response/AromaStrengthHandler.ts`

```typescript
import { BaseSelectHandler, SelectMenuField } from './BaseSelectHandler'

export class AromaStrengthHandler extends BaseSelectHandler {
  readonly field: SelectMenuField = 'aromaStrength'
}
```

**File:** `src/commands/response/SugarHandler.ts`

```typescript
import { BaseSelectHandler, SelectMenuField } from './BaseSelectHandler'

export class SugarHandler extends BaseSelectHandler {
  readonly field: SelectMenuField = 'sugar'
}
```

**File:** `src/commands/response/TemperatureHandler.ts`

```typescript
import { BaseSelectHandler, SelectMenuField } from './BaseSelectHandler'

export class TemperatureHandler extends BaseSelectHandler {
  readonly field: SelectMenuField = 'temperature'
}
```

---

### 2.3 Split Large Command Files

**Problem:** `CoffeeStatsCommand.ts` (719 lines) and `MyStatsCommand.ts` (375 lines) are too large.

#### Refactor CoffeeStatsCommand

**File:** `src/commands/slash-coffee/CoffeeStatsCommand.ts` (refactored)

```typescript
import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { StatsService } from '../../services/StatsService'
import { StatsFormatter } from '../../formatters/StatsFormatter'
import { createLogger } from '../../utils/logger'

const logger = createLogger('coffee-stats-command')

export const data = new SlashCommandBuilder()
  .setName('coffeestats')
  .setDescription('Displays statistics about coffee requests')

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply()
  logger.info('Starting coffee statistics generation...')

  try {
    const stats = await StatsService.getAllStats()
    const { reply1, reply2 } = StatsFormatter.formatStats(stats)

    await interaction.followUp(reply1)
    await new Promise(resolve => setTimeout(resolve, 500))
    await interaction.followUp(reply2)

    logger.info('Coffee statistics sent successfully')
  } catch (error) {
    logger.error('Error fetching coffee stats:', error)
    await interaction.followUp(
      'There was an error fetching the coffee statistics.',
    )
  }
}
```

**File:** `src/formatters/StatsFormatter.ts`

```typescript
import {
  COFFEE_TYPE_LABELS,
  TEMPERATURE_LABELS,
  AROMA_STRENGTH_MAP,
} from '../constants'
import type {
  CoffeeTypeStats,
  PersonalStats,
  SessionTrend,
} from '../services/StatsService'

interface FormattedStats {
  reply1: string
  reply2: string
}

export class StatsFormatter {
  static formatStats(stats: AllStats): FormattedStats {
    const reply1 = this.formatPart1(stats)
    const reply2 = this.formatPart2(stats)
    return { reply1, reply2 }
  }

  private static formatPart1(stats: AllStats): string {
    let reply = '# ☕️ **Coffee Statistics Dashboard** ☕️\n\n'

    reply += this.formatBasicStats(stats.totals)
    reply += this.formatTopCoffeeTypes(stats.coffeeTypes)
    reply += this.formatTopDrinkers(stats.topDrinkers)
    reply += this.formatPreferences(stats.preferences)
    reply += this.formatPersonalities(stats.personalities)

    return reply
  }

  private static formatPart2(stats: AllStats): string {
    let reply = '# ☕️ **Coffee Statistics Dashboard (Part 2)** ☕️\n\n'

    reply += this.formatSessionTrends(stats.sessionTrends)
    reply += this.formatPopularCombinations(stats.combinations)
    reply += this.formatParticipation(stats.participation)

    return reply
  }

  private static formatBasicStats(totals: {
    sessions: number
    requests: number
  }): string {
    const avgOrders =
      totals.sessions > 0
        ? (totals.requests / totals.sessions).toFixed(1)
        : 'N/A'

    return `## 📊 **Basic Statistics**
**Total Coffee Sessions:** ${totals.sessions}
**Total Coffee Orders:** ${totals.requests}
**Average Orders per Session:** ${avgOrders}

`
  }

  private static formatTopCoffeeTypes(types: CoffeeTypeStats[]): string {
    let reply = '## 🏆 **Top 5 Coffee Types**\n'

    if (types.length === 0) {
      return reply + 'No coffee type data available.\n\n'
    }

    types.forEach((stat, index) => {
      const emoji = this.getMedalEmoji(index)
      const label = COFFEE_TYPE_LABELS[stat._id] || stat._id
      reply += `${emoji} **${label}:** ${stat.count} orders\n`
    })

    return reply + '\n'
  }

  private static getMedalEmoji(index: number): string {
    const medals = ['🥇', '🥈', '🥉']
    return medals[index] || '📍'
  }

  // ... additional formatting methods
}
```

---

## Phase 3: Design Patterns

**Estimated Time: 6-8 hours**

### 3.1 Strategy Pattern for Response Handlers

**Problem:** `GenericSelectMenuHandler` uses if-else chain, violating OCP.

**File:** `src/commands/response/ResponseHandlerRegistry.ts`

```typescript
import { StringSelectMenuInteraction } from 'discord.js'
import { BaseSelectHandler } from './BaseSelectHandler'
import { CoffeeTypeHandler } from './CoffeeTypeHandler'
import { AromaStrengthHandler } from './AromaStrengthHandler'
import { SugarHandler } from './SugarHandler'
import { TemperatureHandler } from './TemperatureHandler'

type ResponseType = 'coffee-type' | 'aroma-strength' | 'sugar' | 'temperature'

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
```

**File:** `src/commands/response/GenericSelectMenuHandler.ts` (refactored)

```typescript
import { StringSelectMenuInteraction } from 'discord.js'
import { responseHandlerRegistry } from './ResponseHandlerRegistry'
import { isCompleteCoffeeDocument } from '../CoffeeDocumentHelper'
import { updateUserChallengeProgress } from '../../utils/challengeUtils'
import { createLogger } from '../../utils/logger'

const logger = createLogger('generic-select-handler')

export async function handleInteraction(
  interaction: StringSelectMenuInteraction,
) {
  const customId = interaction.customId
  const sessionId = getSessionId(customId)
  const responseType = getResponseType(customId)

  logger.info(
    `Handling select interaction for ${interaction.user.displayName} - session ${sessionId} - type ${responseType}`,
  )

  if (!responseHandlerRegistry.hasHandler(responseType)) {
    logger.warn(`Unknown response type: ${responseType}`)
    await interaction.deferUpdate()
    return
  }

  const handler = responseHandlerRegistry.getHandler(responseType)
  const coffeeDocument = await handler!.handle(interaction, sessionId)

  await interaction.deferUpdate()

  if (coffeeDocument && isCompleteCoffeeDocument(coffeeDocument)) {
    const userName = interaction.user.displayName || interaction.user.username
    const userId = interaction.user.id
    await updateUserChallengeProgress(userId, userName, sessionId)

    await interaction.followUp({
      content: 'Your coffee order is complete! 🎉, See you soon! ☕️',
      components: [],
    })
  }
}

function getSessionId(customId: string): string {
  return customId.split('|')[0]
}

function getResponseType(customId: string): string {
  return customId.split('|')[1]
}
```

---

### 3.2 Repository Pattern

**Problem:** Commands directly use Mongoose models, violating DIP.

**File:** `src/repositories/ICoffeeRequestRepository.ts`

```typescript
import { ICoffeeRequest } from '../documents/CoffeeDocument'

export interface ICoffeeRequestRepository {
  findBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<ICoffeeRequest | null>
  findBySession(sessionId: string): Promise<ICoffeeRequest[]>
  save(
    order: Partial<ICoffeeRequest> & {
      sessionId: string
      userId: string
      userName: string
    },
  ): Promise<ICoffeeRequest>
  countByUser(userName: string): Promise<number>
}
```

**File:** `src/repositories/MongooseCoffeeRequestRepository.ts`

```typescript
import {
  CoffeeRequestDocument,
  ICoffeeRequest,
} from '../documents/CoffeeDocument'
import { ICoffeeRequestRepository } from './ICoffeeRequestRepository'

export class MongooseCoffeeRequestRepository
  implements ICoffeeRequestRepository
{
  async findBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<ICoffeeRequest | null> {
    return CoffeeRequestDocument.findOne({
      sessionId,
      coffeeCrewPerson: userId,
    })
  }

  async findBySession(sessionId: string): Promise<ICoffeeRequest[]> {
    return CoffeeRequestDocument.find({ sessionId })
  }

  async save(
    order: Partial<ICoffeeRequest> & {
      sessionId: string
      userId: string
      userName: string
    },
  ): Promise<ICoffeeRequest> {
    const existing = await this.findBySessionAndUser(
      order.sessionId,
      order.userId,
    )

    if (existing) {
      Object.assign(existing, order)
      await existing.save()
      return existing
    }

    const newOrder = new CoffeeRequestDocument({
      sessionId: order.sessionId,
      coffeeCrewPerson: order.userId,
      coffeeCrewPersonName: order.userName,
      ...order,
    })
    await newOrder.save()
    return newOrder
  }

  async countByUser(userName: string): Promise<number> {
    return CoffeeRequestDocument.countDocuments({
      coffeeCrewPersonName: userName,
    })
  }
}
```

---

### 3.3 Factory Pattern for Command Creation

**File:** `src/commands/CommandFactory.ts`

```typescript
import { SlashCommandBuilder } from 'discord.js'
import type { CommandHandler } from './types'

interface Command {
  data: SlashCommandBuilder
  execute: CommandHandler
}

class CommandFactory {
  private commands: Map<string, Command> = new Map()

  register(name: string, command: Command): void {
    this.commands.set(name, command)
  }

  get(name: string): Command | undefined {
    return this.commands.get(name)
  }

  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  getAllData(): SlashCommandBuilder[] {
    return this.getAll().map(cmd => cmd.data)
  }
}

export const commandFactory = new CommandFactory()

// Register commands
commandFactory.register('coffee', await import('./slash-coffee/CoffeeCommand'))
commandFactory.register(
  'session',
  await import('./slash-coffee/LatestCoffeeSessionCommand'),
)
// ... etc
```

---

## Phase 4: Architecture

**Estimated Time: 8-12 hours**

### 4.1 Dependency Injection Container

**File:** `src/container.ts`

```typescript
import { ICoffeeRequestRepository } from './repositories/ICoffeeRequestRepository'
import { MongooseCoffeeRequestRepository } from './repositories/MongooseCoffeeRequestRepository'
import { CoffeeOrderService } from './services/CoffeeOrderService'
import { FavoriteService } from './services/FavoriteService'
import { StatsService } from './services/StatsService'
import { PermissionService } from './services/PermissionService'

interface Container {
  coffeeRequestRepository: ICoffeeRequestRepository
  coffeeOrderService: CoffeeOrderService
  favoriteService: FavoriteService
  statsService: StatsService
  permissionService: PermissionService
}

class DIContainer implements Container {
  readonly coffeeRequestRepository: ICoffeeRequestRepository
  readonly coffeeOrderService: CoffeeOrderService
  readonly favoriteService: FavoriteService
  readonly statsService: StatsService
  readonly permissionService: PermissionService

  constructor() {
    // Repositories
    this.coffeeRequestRepository = new MongooseCoffeeRequestRepository()

    // Services
    this.coffeeOrderService = new CoffeeOrderService(
      this.coffeeRequestRepository,
    )
    this.favoriteService = new FavoriteService()
    this.statsService = new StatsService()
    this.permissionService = new PermissionService()
  }
}

export const container = new DIContainer()
```

---

### 4.2 Improved Scheduling with node-cron

**File:** `src/schedulers/SchedulerService.ts`

```typescript
import cron from 'node-cron'
import {
  archiveExpiredChallenges,
  initializeDefaultChallenges,
  evaluateTeamChallenges,
} from '../utils/challengeUtils'
import { createLogger } from '../utils/logger'

const logger = createLogger('scheduler')

export class SchedulerService {
  private jobs: cron.ScheduledTask[] = []

  start(): void {
    logger.info('Starting scheduler service...')

    // Weekly challenge refresh - Every Monday at midnight
    const weeklyJob = cron.schedule('0 0 * * 1', async () => {
      logger.info('Running weekly challenge refresh...')
      await archiveExpiredChallenges()
      await initializeDefaultChallenges()
      logger.info('Weekly challenges refreshed!')
    })

    // Team challenge evaluation - Every 6 hours
    const teamJob = cron.schedule('0 */6 * * *', async () => {
      logger.info('Running team challenge evaluation...')
      await evaluateTeamChallenges()
      logger.info('Team challenges evaluated!')
    })

    this.jobs = [weeklyJob, teamJob]
    logger.info('Scheduler service started')
  }

  stop(): void {
    logger.info('Stopping scheduler service...')
    this.jobs.forEach(job => job.stop())
    this.jobs = []
    logger.info('Scheduler service stopped')
  }

  async runInitialTasks(): Promise<void> {
    logger.info('Running initial scheduler tasks...')
    await initializeDefaultChallenges()
    await archiveExpiredChallenges()
    await evaluateTeamChallenges()
    logger.info('Initial scheduler tasks completed')
  }
}
```

**Install:**

```bash
yarn add node-cron
yarn add -D @types/node-cron
```

---

### 4.3 Refactored Entry Point

**File:** `src/index.ts` (refactored)

```typescript
import { Client, Events } from 'discord.js'
import { config } from './config'
import { connect } from './MongoConfig'
import { deployCommandsGlobally } from './deploy-command'
import { handleAutocomplete } from './handlers/AutocompleteHandler'
import { handleChatInputCommand } from './handlers/ChatInputCommandHandler'
import { handleSelectMenu } from './handlers/SelectMenuHandler'
import { SchedulerService } from './schedulers/SchedulerService'
import { createLogger } from './utils/logger'

const logger = createLogger('main')

const client = new Client({
  intents: [
    'Guilds',
    'GuildMessages',
    'DirectMessages',
    'GuildMembers',
    'GuildPresences',
  ],
})

const scheduler = new SchedulerService()

client.once(Events.ClientReady, async () => {
  try {
    await deployCommandsGlobally()
    await connect()
    await scheduler.runInitialTasks()
    scheduler.start()

    logger.info('Discord bot is ready! 🤖')
  } catch (error) {
    logger.error('Failed to start bot:', error)
    process.exit(1)
  }
})

client.on(Events.InteractionCreate, async interaction => {
  logger.debug(`Interaction received: ${interaction.type}`)

  try {
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction)
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction)
    } else if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction)
    }
  } catch (error) {
    logger.error('Error handling interaction:', error)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...')
  scheduler.stop()
  client.destroy()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...')
  scheduler.stop()
  client.destroy()
  process.exit(0)
})

client.login(config.DISCORD_TOKEN).then(() => logger.info('Bot logged in! ⌨️'))
```

**File:** `src/handlers/AutocompleteHandler.ts`

```typescript
import { AutocompleteInteraction } from 'discord.js'
import { FavoriteService } from '../services/FavoriteService'
import { createLogger } from '../utils/logger'

const logger = createLogger('autocomplete-handler')

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
  const { commandName } = interaction

  if (commandName === 'usefavorite' || commandName === 'deletefavorite') {
    await handleFavoriteAutocomplete(interaction)
  }
}

async function handleFavoriteAutocomplete(
  interaction: AutocompleteInteraction,
) {
  try {
    const focusedValue = interaction.options.getFocused()
    const userId = interaction.user.id

    const favorites = await FavoriteService.searchFavorites(
      userId,
      focusedValue,
    )

    const choices = favorites.map(fav => ({
      name: fav.favoriteName,
      value: fav.favoriteName,
    }))

    await interaction.respond(choices)
    logger.debug(`Autocomplete response sent with ${choices.length} choices`)
  } catch (error) {
    logger.error('Error handling autocomplete:', {
      error,
      commandName: interaction.commandName,
      userId: interaction.user.id,
    })
    await interaction.respond([])
  }
}
```

**File:** `src/handlers/ChatInputCommandHandler.ts`

```typescript
import { ChatInputCommandInteraction } from 'discord.js'
import { commands } from '../commands'
import { createLogger } from '../utils/logger'

const logger = createLogger('chat-input-handler')

export async function handleChatInputCommand(
  interaction: ChatInputCommandInteraction,
) {
  const { commandName } = interaction

  const command = commands[commandName as keyof typeof commands]

  if (command) {
    logger.info(`Handling command ${commandName}`)
    await command.execute(interaction)
  } else {
    logger.error(`Command ${commandName} not found!`)
  }
}
```

**File:** `src/handlers/SelectMenuHandler.ts`

```typescript
import { StringSelectMenuInteraction } from 'discord.js'
import { handleInteraction } from '../commands/response/GenericSelectMenuHandler'
import { createLogger } from '../utils/logger'

const logger = createLogger('select-menu-handler')

export async function handleSelectMenu(
  interaction: StringSelectMenuInteraction,
) {
  logger.info('Handling select menu interaction')
  await handleInteraction(interaction)
}
```

---

### 4.4 Runtime Validation with Zod

**Install:**

```bash
yarn add zod
```

**File:** `src/validators/StatsValidators.ts`

```typescript
import { z } from 'zod'

export const CoffeeTypeStatsSchema = z.object({
  _id: z.string(),
  count: z.number(),
})

export const PersonalStatsSchema = z.object({
  _id: z.null(),
  totalOrders: z.number(),
  blackCoffeeCount: z.number(),
  avgSugar: z.number(),
  avgAroma: z.number(),
  blackCoffeePercentage: z.number(),
  preferences: z.array(
    z.object({
      type: z.string(),
      aroma: z.string(),
      sugar: z.string(),
      temp: z.string(),
    }),
  ),
})

export function validateAggregationResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('Validation failed:', result.error)
    return null
  }
  return result.data
}
```

---

## Testing Strategy

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── CoffeeOrderService.test.ts
│   │   ├── FavoriteService.test.ts
│   │   └── StatsService.test.ts
│   ├── handlers/
│   │   └── ResponseHandlerRegistry.test.ts
│   └── utils/
│       └── logger.test.ts
├── integration/
│   ├── commands/
│   │   └── CoffeeCommand.test.ts
│   └── repositories/
│       └── CoffeeRequestRepository.test.ts
└── mocks/
    ├── discord.ts
    └── mongoose.ts
```

### Example Unit Test

**File:** `tests/unit/services/FavoriteService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FavoriteService } from '../../../src/services/FavoriteService'
import { CoffeeFavoriteDocument } from '../../../src/documents/CoffeeFavorite'

vi.mock('../../../src/documents/CoffeeFavorite')

describe('FavoriteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findByUserAndName', () => {
    it('should return favorite when found', async () => {
      const mockFavorite = {
        userId: '123',
        favoriteName: 'Morning Boost',
        coffeeType: '🥛',
      }

      vi.mocked(CoffeeFavoriteDocument.findOne).mockResolvedValue(
        mockFavorite as any,
      )

      const result = await FavoriteService.findByUserAndName(
        '123',
        'Morning Boost',
      )

      expect(result).toEqual(mockFavorite)
      expect(CoffeeFavoriteDocument.findOne).toHaveBeenCalledWith({
        userId: '123',
        favoriteName: 'Morning Boost',
      })
    })

    it('should return null when not found', async () => {
      vi.mocked(CoffeeFavoriteDocument.findOne).mockResolvedValue(null)

      const result = await FavoriteService.findByUserAndName(
        '123',
        'Nonexistent',
      )

      expect(result).toBeNull()
    })
  })
})
```

---

## Migration Guide

### Step-by-Step Migration Order

#### Week 1: Phase 1 (Quick Wins)

1. Create `src/utils/logger.ts` and migrate all logger usage
2. Create `src/constants/` directory and files
3. Create `src/services/PermissionService.ts`
4. Fix async/sync issues
5. Fix variable naming

#### Week 2: Phase 2 (Code Organization)

1. Create service layer files
2. Extract `BaseSelectHandler`
3. Begin splitting `CoffeeStatsCommand.ts`
4. Begin splitting `MyStatsCommand.ts`

#### Week 3: Phase 3 (Design Patterns)

1. Implement `ResponseHandlerRegistry`
2. Implement repository interfaces
3. Implement `CommandFactory`

#### Week 4: Phase 4 (Architecture)

1. Set up DI container
2. Install and configure `node-cron`
3. Refactor `index.ts`
4. Add Zod validation
5. Set up testing infrastructure

### Breaking Changes Checklist

- [ ] Update all imports after file moves
- [ ] Test all commands after service extraction
- [ ] Verify scheduler runs correctly with `node-cron`
- [ ] Run full regression test after DI container

### Rollback Plan

Each phase should be completed in a separate branch:

```
main
├── refactor/phase-1-quick-wins
├── refactor/phase-2-organization
├── refactor/phase-3-patterns
└── refactor/phase-4-architecture
```

Merge only after thorough testing. Keep branches until production deployment is verified.

---

## File Structure After Refactoring

```
src/
├── constants/
│   ├── index.ts
│   ├── roles.ts
│   └── coffeeOptions.ts
├── containers/
│   └── index.ts
├── documents/
│   ├── CoffeeBadge.ts
│   ├── CoffeeChallenge.ts
│   ├── CoffeeDocument.ts
│   ├── CoffeeFavorite.ts
│   ├── CoffeeSession.ts
│   ├── FeedbackDocument.ts
│   └── UserChallengeProgress.ts
├── formatters/
│   └── StatsFormatter.ts
├── handlers/
│   ├── AutocompleteHandler.ts
│   ├── ChatInputCommandHandler.ts
│   └── SelectMenuHandler.ts
├── repositories/
│   ├── ICoffeeRequestRepository.ts
│   └── MongooseCoffeeRequestRepository.ts
├── schedulers/
│   └── SchedulerService.ts
├── services/
│   ├── CoffeeOrderService.ts
│   ├── FavoriteService.ts
│   ├── PermissionService.ts
│   └── StatsService.ts
├── utils/
│   ├── challengeUtils.ts
│   ├── coffeeLabels.ts
│   ├── dateUtils.ts
│   └── logger.ts
├── validators/
│   └── StatsValidators.ts
├── commands/
│   ├── index.ts
│   ├── CoffeeDocumentHelper.ts
│   ├── response/
│   │   ├── BaseSelectHandler.ts
│   │   ├── ResponseHandlerRegistry.ts
│   │   ├── GenericSelectMenuHandler.ts
│   │   ├── CoffeeTypeHandler.ts
│   │   ├── AromaStrengthHandler.ts
│   │   ├── SugarHandler.ts
│   │   └── TemperatureHandler.ts
│   └── slash-coffee/
│       ├── AlertCurrentSession.ts
│       ├── ChallengeCommand.ts
│       ├── CoffeeCommand.ts
│       ├── CoffeeStatsCommand.ts
│       ├── DeleteFavoriteCommand.ts
│       ├── FavoritesCommand.ts
│       ├── FeedbackCommand.ts
│       ├── LatestCoffeeSessionCommand.ts
│       ├── MyStatsCommand.ts
│       ├── RateCommand.ts
│       ├── SaveFavoriteCommand.ts
│       └── UseFavoriteCommand.ts
├── config.ts
├── deploy-command.ts
├── MongoConfig.ts
└── index.ts
```

---

## Metrics for Success

| Metric                  | Before   | Target     |
| ----------------------- | -------- | ---------- |
| Average function length | 45 lines | < 20 lines |
| Code duplication        | ~15%     | < 5%       |
| Files > 300 lines       | 4        | 0          |
| `any` types             | 5        | 0          |
| Test coverage           | 0%       | > 70%      |
| Cyclomatic complexity   | High     | Medium     |

---

## Notes

- Always run `yarn lint` and `yarn format` after each change
- Test each command manually after refactoring
- Keep the bot running in a test Discord server during migration
- Document any additional issues found during implementation
