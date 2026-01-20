import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { CoffeeSessionDocument } from '../../documents/CoffeeSession'
import { CoffeeRequestDocument } from '../../documents/CoffeeDocument'
import pino from 'pino'

const logger = pino({
  name: 'coffee-bot-order-bingo-command',
  level: 'debug',
  transport: {
    target: 'pino-pretty',
  },
})

const CELL_WIDTH = 16
const BINGO_SIZE = 5
const BINGO_ENTRIES = 24

const coffeeTypeLabels: Record<string, string> = {
  '☕️': 'Black coffee',
  '🥛': 'Milk coffee',
}

const aromaLabels: Record<string, string> = {
  '🫘': 'Mild aroma',
  '🫘🫘': 'Light aroma',
  '🫘🫘🫘': 'Medium aroma',
  '🫘🫘🫘🫘': 'Strong aroma',
  '🫘🫘🫘🫘🫘': 'Extra strong',
}

const sugarLabels: Record<string, string> = {
  none: 'No sugar',
  '🍰': '1 sugar',
  '🍰🍰': '2 sugar',
  '🍰🍰🍰': '3 sugar',
  '🍰🍰🍰🍰': '4 sugar',
}

const temperatureLabels: Record<string, string> = {
  '🥵': 'Hot coffee',
  '🏡🛋️': 'Room temp',
  '🧊': 'Iced coffee',
}

const fillerEntries = [
  'Coffee round!',
  'Beans for days',
  'Caffeine squad',
  'Morning boost',
  'Afternoon pick-me-up',
  'Barista on duty',
  'Last-minute order',
  'Team refresh',
  'Hydration break',
  'Coffee cheers',
  'Energy incoming',
  'Brew of the day',
  'Coffee o clock',
  'Order rush',
  'Flavor twist',
  'Cup in hand',
  'Extra cozy sip',
  'Aroma vibes',
  'Sweet sip',
  'Bold brew',
]

export const data = new SlashCommandBuilder()
  .setName('bingo')
  .setDescription('Generate an order bingo card for a coffee session')
  .addStringOption(option =>
    option
      .setName('session-id')
      .setDescription('Optional session ID (defaults to latest)')
      .setRequired(false),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const sessionIdOption = interaction.options.getString('session-id')

  try {
    let targetSessionId = sessionIdOption

    if (!targetSessionId) {
      logger.info('📋 Fetching latest coffee session for bingo')
      const latestSession = await CoffeeSessionDocument.findOne().sort({
        startDateTime: -1,
      })

      if (!latestSession) {
        logger.info('❌ No coffee sessions found for bingo')
        await interaction.followUp({
          content: 'No coffee sessions found to build bingo! ☕️',
          ephemeral: true,
        })
        return
      }

      targetSessionId = latestSession.sessionId
      logger.info(`✅ Using latest session: ${targetSessionId}`)
    } else {
      logger.info(`🔍 Validating session ${targetSessionId} exists`)
      const session = await CoffeeSessionDocument.findOne({
        sessionId: targetSessionId,
      })

      if (!session) {
        logger.info(`❌ Session ${targetSessionId} not found`)
        await interaction.followUp({
          content: 'Session not found!',
          ephemeral: true,
        })
        return
      }
    }

    logger.info(`🎯 Building bingo for session ${targetSessionId}`)

    const coffeeRequests = await CoffeeRequestDocument.find({
      sessionId: targetSessionId,
    })

    if (coffeeRequests.length === 0) {
      logger.info('❌ No coffee requests found for bingo')
      await interaction.followUp({
        content: 'No coffee requests found for this session yet. ☕️',
        ephemeral: true,
      })
      return
    }

    const entrySet = new Set<string>()
    const entries: string[] = []

    const addEntry = (entry?: string) => {
      if (!entry || entrySet.has(entry)) return
      entrySet.add(entry)
      entries.push(entry)
    }

    const uniqueNames = Array.from(
      new Set(coffeeRequests.map(request => request.coffeeCrewPersonName)),
    )

    uniqueNames.slice(0, 10).forEach(name => {
      addEntry(`Order from ${name}`)
    })

    coffeeRequests.forEach(request => {
      addEntry(coffeeTypeLabels[request.coffeeType])
      addEntry(aromaLabels[request.aromaStrength])
      addEntry(sugarLabels[request.sugar])
      addEntry(temperatureLabels[request.temperature])
    })

    if (coffeeRequests.length >= 5) {
      addEntry('5+ orders')
    }

    if (coffeeRequests.length >= 10) {
      addEntry('10+ orders')
    }

    if (uniqueNames.length >= 5) {
      addEntry('Full crew')
    }

    const finalEntries = fillEntries(entries, entrySet, fillerEntries)
    const shuffledEntries = shuffle(finalEntries).slice(0, BINGO_ENTRIES)

    const cells = [...shuffledEntries]
    cells.splice(12, 0, 'FREE ☕️')

    const grid = buildGrid(cells)

    const reply = `# ☕️ **Order Bingo** ☕️\n**Session:** \`${targetSessionId}\`\nMark off items that match today’s coffee orders.\n\n\`\`\`\n${grid}\n\`\`\``

    await interaction.followUp(reply)
    logger.info('✅ Bingo card sent')
  } catch (error) {
    logger.error('Error building bingo card:', error)
    await interaction.followUp({
      content: 'There was an error building the bingo card.',
      ephemeral: true,
    })
  }
}

const fillEntries = (
  entries: string[],
  entrySet: Set<string>,
  fillers: string[],
) => {
  const filled = [...entries]

  fillers.forEach(filler => {
    if (filled.length >= BINGO_ENTRIES) return
    if (entrySet.has(filler)) return
    entrySet.add(filler)
    filled.push(filler)
  })

  let fillerIndex = 1
  while (filled.length < BINGO_ENTRIES) {
    const fallback = `Bingo surprise ${fillerIndex}`
    if (!entrySet.has(fallback)) {
      entrySet.add(fallback)
      filled.push(fallback)
    }
    fillerIndex += 1
  }

  return filled
}

const buildGrid = (cells: string[]) => {
  const rows: string[] = []

  for (let rowIndex = 0; rowIndex < BINGO_SIZE; rowIndex += 1) {
    const rowCells = cells
      .slice(rowIndex * BINGO_SIZE, rowIndex * BINGO_SIZE + BINGO_SIZE)
      .map(cell => padCell(cell))
    rows.push(`| ${rowCells.join(' | ')} |`)
  }

  return rows.join('\n')
}

const padCell = (cell: string) => {
  const normalized = shortenLabel(cell, CELL_WIDTH)
  return normalized.padEnd(CELL_WIDTH, ' ')
}

const shortenLabel = (label: string, maxLength: number) => {
  const graphemes = (() => {
    if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) {
      return Array.from(label)
    }

    type SegmenterInstance = {
      segment: (value: string) => Iterable<{
        segment: string
        __value?: typeof value
      }>
    }
    type SegmenterConstructor = new () => SegmenterInstance
    const Segmenter = (Intl as typeof Intl & {
      Segmenter: SegmenterConstructor
    }).Segmenter

    const segmenter = new Segmenter()
    return [...segmenter.segment(label)].map(segment => segment.segment)
  })()

  if (graphemes.length <= maxLength) return label
  return `${graphemes.slice(0, maxLength - 1).join('')}…`
}

const shuffle = <T>(items: T[]) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return shuffled
}
