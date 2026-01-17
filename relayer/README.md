# Sidebets Relayer Service

Backend service for signature collection and auto-finalization of Sidebets markets.

## Features

- **Signature Collection**: Off-chain EIP-712 attestation storage
- **Auto-Finalization**: Automatically finalizes markets when signature threshold is met
- **Market Sync**: Keeps database in sync with blockchain state
- **Dispute Monitoring**: Tracks dispute windows and queues finalizations
- **REST API**: Full API for market and attestation queries

## Architecture

```
relayer/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── config/
│   │   └── index.ts         # Configuration management
│   ├── models/
│   │   └── database.ts      # Prisma client wrapper
│   ├── routes/
│   │   ├── attestations.ts  # Signature endpoints
│   │   ├── markets.ts       # Market endpoints
│   │   └── health.ts        # Health check endpoints
│   ├── services/
│   │   ├── blockchain.ts    # Blockchain interactions
│   │   ├── signature.ts     # Signature collection logic
│   │   └── finalization.ts  # Auto-finalization service
│   ├── utils/
│   │   ├── logger.ts        # Winston logging
│   │   ├── errors.ts        # Custom error classes
│   │   └── validation.ts    # Zod schemas
│   └── index.ts             # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

### 1. Install Dependencies

```bash
cd relayer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="file:./db/dev.db"

# Blockchain
RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=41454
RELAYER_PRIVATE_KEY=your-private-key-here

# Contracts (after deployment)
SIDEBET_FACTORY_ADDRESS=0x...
MOCK_TOKEN_ADDRESS=0x...

# Thresholds
MIN_SIGNATURES_THRESHOLD=3
MAX_PROPOSAL_AGE_HOURS=24
```

### 3. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Build & Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service status
- `GET /health/queue` - Finalization queue status

### Markets

- `GET /api/markets` - List all markets
- `GET /api/markets/:address` - Get market details
- `POST /api/markets/:address/sync` - Sync market from blockchain
- `GET /api/markets/:address/participants` - Get participants
- `GET /api/markets/:address/proposal` - Get active proposal
- `POST /api/markets/predict-address` - Predict CREATE2 address
- `GET /api/markets/:address/status` - Get live chain status

### Attestations

- `POST /api/attestations` - Submit attestation
- `GET /api/attestations` - Get attestations (with filters)
- `GET /api/attestations/:market` - Get market attestations
- `GET /api/attestations/:market/count` - Get attestation counts

## Background Jobs

The relayer runs several scheduled tasks:

| Schedule | Task | Description |
|----------|------|-------------|
| `*/5 * * * *` | Market Sync | Sync markets from blockchain |
| `*/2 * * * *` | Dispute Check | Queue markets with expired disputes |
| `* * * * *` | Finalization | Process pending finalizations |
| `0 * * * *` | Old Proposals | Check for stale proposals |
| `0 0 * * *` | Log Cleanup | Remove old logs (30 days) |

## Database Schema

### Tables

- **User** - User accounts
- **Market** - Cached market data
- **Participant** - Market participants
- **Proposal** - Outcome proposals
- **Attestation** - EIP-712 signatures
- **Dispute** - Proposal disputes
- **SyncLog** - Operation logs
- **FinalizationQueue** - Markets pending finalization

## Security

- Rate limiting on all endpoints
- Signature validation before storage
- CORS configuration
- Helmet security headers
- Environment variable validation

## Monitoring

Check service health:

```bash
curl http://localhost:3001/health/detailed
```

View finalization queue:

```bash
curl http://localhost:3001/health/queue
```

## Deployment

### Using PM2

```bash
npm run build
pm2 start dist/index.js --name sidebets-relayer
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Troubleshooting

### Database Issues

```bash
# Reset database (dev only)
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### RPC Issues

Check your RPC endpoint is accessible:

```bash
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

## License

MIT
