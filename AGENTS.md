# AGENTS.md - Coffee Bot

Discord bot for managing office coffee ordering sessions. Built with TypeScript, discord.js v14, and MongoDB/Mongoose.

## Build, Lint, and Test Commands

```bash
yarn dev              # Run in dev mode with tsx watch
yarn build            # Build to dist/ via tsup with minification
yarn start            # Run built app from dist/
yarn format           # Prettier (no semicolons, single quotes, no arrow parens)
yarn lint             # ESLint with auto-fix
```

**No test framework is configured.** There are no tests to run. If adding tests, use Vitest or Jest.

## Project Structure

```
src/
  index.ts                        # Entry point, client setup, event handlers, schedulers
  config.ts                       # Env var validation (DISCORD_TOKEN, DISCORD_CLIENT_ID, MONGODB_URI)
  MongoConfig.ts                  # Mongoose connection
  deploy-command.ts               # Global slash command registration
  commands/
    index.ts                      # Command registry (all 12 commands)
    CoffeeDocumentHelper.ts       # Completeness check for coffee orders
    slash-coffee/                 # 12 slash command files (each exports `data` + `execute`)
    response/                     # Select menu interaction handlers (coffee-type, aroma, sugar, temp)
  documents/                      # 7 Mongoose models/schemas
  utils/
    dateUtils.ts                  # Budapest timezone formatting
    coffeeLabels.ts               # Emoji-to-label mappers
    challengeUtils.ts             # Challenge lifecycle (init, progress, evaluation, archival)
```

## Code Style Guidelines

### Formatting (Prettier - `.prettierrc.json`)

- **No semicolons** (`"semi": false`)
- **Single quotes** (`"singleQuote": true`)
- **No parens on single arrow params** (`"arrowParens": "avoid"`)
- Run `yarn format` before committing

### ESLint (`.eslintrc.json`)

- Extends: `eslint:recommended`, `@typescript-eslint/recommended`, `prettier`
- Single quotes enforced (warn level)
- Unused vars are warnings, not errors

### Imports

- Named imports from packages: `import { Client, Events } from 'discord.js'`
- Default imports directly: `import pino from 'pino'`
- Namespace imports for command modules: `import * as coffee from './slash-coffee/CoffeeCommand'`
- External imports first, then local imports separated by a blank line
- Always use relative paths (`./` or `../`) for local modules

### TypeScript

- Strict mode enabled with `strictNullChecks` - always type properly
- Use `interface` for object shapes, prefix Mongoose interfaces with `I`: `interface ICoffeeSession extends Document`
- Define custom interfaces for MongoDB aggregation results
- Explicitly type function parameters and return types
- Use type assertions for aggregation output: `as CoffeeTypeStats[]`

### Naming Conventions

- **Variables/functions:** camelCase - `coffeeCrew`, `deployCommandsGlobally`
- **Interfaces/types/models:** PascalCase - `CoffeeSessionDocument`, `ICoffeeSession`
- **Env constants:** SCREAMING_SNAKE_CASE - `DISCORD_TOKEN`, `MONGODB_URI`
- **Files:** PascalCase for modules with exports - `CoffeeCommand.ts`, `CoffeeSession.ts`; camelCase for utils - `dateUtils.ts`
- **Logger names:** kebab-case with `coffee-bot-` prefix - `coffee-bot-rate-command`

### Error Handling

- Wrap all async DB operations in try/catch
- Log errors with pino: `logger.error('Error message:', error)`
- Throw `new Error()` with descriptive messages for critical startup failures
- For Discord commands: return early with `ephemeral: true` replies for validation errors
- Wrap DM sends to multiple users individually in try/catch (some users may have DMs disabled)

### Logging

- Each file creates its own pino logger instance:
  ```typescript
  const logger = pino({
    name: 'coffee-bot-<module-name>',
    level: 'debug',
    transport: { target: 'pino-pretty' },
  })
  ```
- Use `logger.info()` for operations, `logger.error()` for errors, `logger.warn()` for non-fatal issues
- Never use `console.log` - always use the pino logger

### Discord Bot Patterns

- Every slash command file exports `data` (SlashCommandBuilder) and `execute()` (async function)
- Defer replies for anything involving DB calls: `await interaction.deferReply()`
- Use `ephemeral: true` for user-private responses (stats, errors, favorites)
- Admin commands check for `coffee-crew-core` role before executing
- Select menu custom IDs follow `${sessionId}|field-name` pattern (e.g., `abc-123|coffee-type`)
- Commands are registered in `src/commands/index.ts` - add new commands there
- Split long Discord messages into multiple `followUp()` calls (2000 char limit)

### Mongoose / Database

- Interfaces extend `Document`: `interface ICoffeeSession extends Document`
- Schemas use `{ type: String, required: true }` syntax
- Models exported as PascalCase ending in `Document`: `export const CoffeeSessionDocument`
- Use unique compound indexes where needed: `Schema.index({ userId: 1, favoriteName: 1 }, { unique: true })`
- Use `timestamps: true` in schema options for automatic `createdAt`/`updatedAt`
- Use aggregation pipelines for complex queries; type results with custom interfaces
- Always `await` database operations

### Command Template

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-<command-name>',
  level: 'debug',
  transport: { target: 'pino-pretty' },
})

export const data = new SlashCommandBuilder()
  .setName('commandname')
  .setDescription('What this command does')

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()
  logger.info('Executing command...')
  try {
    // Command logic
    await interaction.followUp('Result')
  } catch (error) {
    logger.error('Error:', error)
    await interaction.followUp({
      content: 'Something went wrong.',
      ephemeral: true,
    })
  }
}
```

### Document Template

```typescript
import mongoose, { Document, Schema } from 'mongoose'

interface IExample extends Document {
  field1: string
  field2: number
}

const ExampleSchema: Schema = new Schema(
  {
    field1: { type: String, required: true },
    field2: { type: Number, required: false },
  },
  { timestamps: true },
)

export const ExampleDocument = mongoose.model<IExample>(
  'example_collection',
  ExampleSchema,
)
```
