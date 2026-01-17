# Sidebets Telegram Bot

Telegram bot for the Sidebets decentralized betting protocol on Monad.

## Features

- **Market Discovery**: Browse and search for prediction markets
- **Subscriptions**: Get notified when market events occur
- **Interactive UI**: Inline keyboards for seamless navigation
- **Notifications**: Real-time alerts for proposals, finalizations, and disputes
- **Mini App Integration**: Link to Telegram Mini App for advanced features

## Prerequisites

- Node.js 18+
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Relayer API running
- SQLite (for local database)

## Setup

### 1. Get Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=your_bot_token_here
RELAYER_API_URL=http://localhost:3001
MINI_APP_URL=https://your-app.vercel.app/tg
WEBAPP_URL=https://your-app.vercel.app
NODE_ENV=development
DATABASE_URL=file:./dev.db
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
npm run db:generate
npm run db:push
```

### 5. Build and Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Project Structure

```
telegram-bot/
├── src/
│   ├── config/          # Configuration management
│   ├── handlers/        # Command and callback handlers
│   ├── keyboards/       # Inline keyboard layouts
│   ├── middleware/      # Bot middleware (user tracking, sessions)
│   ├── models/          # Database models
│   ├── services/        # API and notification services
│   ├── utils/           # Logger utility
│   └── index.ts         # Bot entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start using the bot |
| `/markets` | Browse all markets |
| `/subscriptions` | Manage your subscriptions |
| `/settings` | Configure settings |
| `/help` | Show help message |
| `/about` | About Sidebets |

## Notification Types

The bot sends notifications for:

- `proposal_created`: A new result is proposed
- `threshold_reached`: Consensus threshold is met
- `disputed`: Market is disputed
- `resolved`: Market is finalized
- `cancelled`: Market is cancelled
- `expiry_soon`: Proposal is expiring soon

## Deployment

### Using Railway

```bash
railway up
```

### Using Vercel/Heroku

Set environment variables in your deployment dashboard:

- `BOT_TOKEN`
- `RELAYER_API_URL`
- `MINI_APP_URL`
- `WEBAPP_URL`
- `DATABASE_URL` (use Postgres for production)

### Setting Webhook

For production deployment, set a webhook:

```bash
curl -F "url=https://your-bot-url.com/webhook" \
  https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

## Development

### Adding New Commands

1. Add handler in `src/handlers/commands.ts`
2. Register in `registerCommands()` function
3. Update bot commands in `src/index.ts`

### Adding New Callbacks

1. Add handler in `src/handlers/callbacks.ts`
2. Register in `registerCallbackHandlers()` function
3. Create corresponding keyboard button in `src/keyboards/index.ts`

### Database Changes

1. Modify `prisma/schema.prisma`
2. Run `npm run db:push`
3. Regenerate client: `npm run db:generate`

## Telegram Mini App

The bot links to a Telegram Mini App at `/tg` route in the Next.js app.

Mini App features:
- Market browsing
- Staking on predictions
- Attesting to outcomes
- Creating new markets

## Troubleshooting

### Bot not responding

1. Check bot token is correct
2. Ensure Relayer API is running
3. Check logs for errors

### Notifications not sending

1. Check user is subscribed to the market
2. Verify notification service is running
3. Check database for notification logs

### Database errors

1. Run `npm run db:push` to sync schema
2. Check `DATABASE_URL` is correct
3. For production, use Postgres instead of SQLite

## License

MIT
