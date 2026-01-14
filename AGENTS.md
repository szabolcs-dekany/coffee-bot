# AGENTS.md - Coffee Bot

## Build, Lint, and Test Commands

```bash
# Development
yarn dev              # Run in development mode with tsx watch

# Building
yarn build            # Build TypeScript to dist/ (uses tsup with minification)
yarn start            # Run the built application from dist/

# Code Quality
yarn format           # Format code with Prettier
yarn lint             # Run ESLint with auto-fix
```

**Note:** This project does not have a test framework configured. Add testing setup (Jest/Vitest) if tests are needed.

## Project Structure

```
src/
├── commands/           # Discord slash commands
│   ├── slash-coffee/   # Coffee-related commands
│   └── response/       # Interaction handlers
├── documents/          # Mongoose models/schemas
├── utils/              # Utility functions
├── config.ts           # Environment configuration
└── index.ts            # Main entry point
```

## Code Style Guidelines

### Imports

- Use named imports from packages: `import { Client, Events } from 'discord.js'`
- Import default exports directly: `import pino from 'pino'`
- Use `import * as` for module namespaces: `import * as coffee from './slash-coffee/CoffeeCommand'`
- Group external imports first, then local imports
- Use relative imports with `./` for local modules

### Formatting (Prettier)

- **No semicolons**
- **Single quotes** for strings
- **Avoid parentheses** around single arrow function parameters: `(x) => y` → `x => y`
- Use `yarn format` to auto-format before committing

### TypeScript

- Strict mode is enabled - always type your code properly
- Use `interface` for object shapes: `interface ICoffeeSession extends Document`
- Explicitly type function parameters and return types
- Use type assertions when needed: `as CoffeeTypeStats[]`
- Define types for complex objects, especially MongoDB aggregation results
- Use proper typing for MongoDB aggregation pipelines with custom interfaces

### Naming Conventions

- **Variables/Functions:** camelCase (`coffeeCrew`, `deployCommandsGlobally`)
- **Classes/Interfaces/Types:** PascalCase (`CoffeeSessionDocument`, `ICoffeeSession`)
- **Constants:** SCREAMING_SNAKE_CASE (`DISCORD_TOKEN`, `MONGODB_URI`)
- **Files:** PascalCase for exports (`CoffeeCommand.ts`, `dateUtils.ts`)
- **Logger names:** kebab-case with coffee-bot prefix (`coffee-bot-main`, `coffee-bot-command-name`)

### Error Handling

- Always wrap async database operations in try/catch blocks
- Use pino logger to log errors: `logger.error('Error message:', error)`
- Throw new Error with descriptive messages for critical failures
- For Discord commands, return early with interaction replies for validation errors
- Provide user-friendly error messages in Discord responses (use `ephemeral: true` for errors)
- Validate user roles/permissions before executing sensitive operations

### Discord Bot Patterns

- Slash commands must export `data` (SlashCommandBuilder) and `execute()` function
- Defer replies for long-running operations: `await interaction.deferReply()`
- Use ephemeral responses for sensitive/private info: `ephemeral: true`
- Check user permissions/roles before executing commands
- Use select menus with custom IDs: `${sessionId}|field-name` pattern
- Log all interactions with descriptive messages and emojis
- Send DMs to multiple users in try/catch blocks to handle failures gracefully

### Database (Mongoose)

- Define interfaces extending `Document`: `interface ICoffeeSession extends Document`
- Create schemas with required fields: `{ type: String, required: true }`
- Export models as PascalCase: `export const CoffeeSessionDocument`
- Use `await` for all database operations
- Use aggregation pipelines for complex queries
- Type aggregation results with custom interfaces
- Use `countDocuments()` for simple counts

### Logging

- Each module/file should have its own pino logger instance
- Use descriptive logger names: `name: 'coffee-bot-command-name'`
- Log at debug level: `level: 'debug'`
- Use pino-pretty for readable console output
- Include emojis in log messages for better readability
- Log key events: user actions, errors, database operations
- Use logger.info for general operations, logger.error for errors

### General Patterns

- Environment variables must be defined and validated (throw Error if missing)
- Use `.env` file for local development (already in .gitignore)
- Keep functions focused and single-purpose
- Add JSDoc comments for utility functions (see `dateUtils.ts`)
- Use consistent indentation and spacing
- Prefer async/await over Promise chains
- Avoid console.log - use logger instead
- Handle edge cases gracefully (e.g., no data found, missing permissions)

### Command File Structure

```typescript
// Example: src/commands/slash-coffee/ExampleCommand.ts
import { SlashCommandBuilder, CommandInteraction } from 'discord.js'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-example-command',
  level: 'debug',
  transport: { target: 'pino-pretty' },
})

export const data = new SlashCommandBuilder()
  .setName('command-name')
  .setDescription('Command description')

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply()
  logger.info('Executing command...')
  // Command logic here
}
```

### Document/Schema Structure

```typescript
// Example: src/documents/ExampleDocument.ts
import mongoose, { Document, Schema } from 'mongoose'

interface IExample extends Document {
  field1: string
  field2: number
}

const ExampleSchema: Schema = new Schema({
  field1: { type: String, required: true },
  field2: { type: Number, required: false },
})

export const ExampleDocument = mongoose.model<IExample>(
  'example_collection',
  ExampleSchema,
)
```
