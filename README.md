# Lightning Anchor Fee Bumping Service

> A Lightning Network service that monitors commitment transactions and calculates CPFP fee requirements using anchor outputs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## About This Project

This project is part of my **learning journey** documented in my [anchor outputs article series](https://dev.to/susangithaigan/understanding-lightning-network-anchor-outputs-part-1-the-basics-2p7j).

### The Problem

When Lightning Network channels force-close, commitment transactions can get stuck in the mempool if their pre-signed fees are too low for current network conditions.

### The Solution

A service that:
1. Monitors Bitcoin mempool for commitment transactions
2. Detects anchor outputs (330 sat outputs)
3. Calculates CPFP fee requirements
4. Estimates if bumping is feasible with just the anchor

## Project Architecure

```
┌─────────────────┐
│   User's LN     │
│   Channel       │
└────────┬────────┘
         │ Force close broadcast
         ↓
┌─────────────────┐      ┌──────────────────┐
│   Bitcoin       │◄─────┤  Fee Bumping     │
│   Mempool       │      │  Service         │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │ Monitor                │ Create CPFP
         │ transactions           │ transaction
         │                        │
         ↓                        ↓
┌─────────────────┐      ┌──────────────────┐
│   Mempool       │      │  Lightning       │
│   Analyzer      │      │  Payment         │
└─────────────────┘      │  Processor       │
                         └──────────────────┘
```


---

## Features

### Implemented
- Bitcoin Core RPC integration
- Real-time mempool monitoring
- Anchor output detection (330 sat outputs)
- CPFP fee estimation (accurate, real-time)
- CPFP transaction building (structure complete)
- Lightning invoice generation
- Lightning payment verification
- Payment-gated broadcasting
- Complete REST API

### In Progress  
- Transaction signing (needs Lightning channel keys)
- Database persistence (PostgreSQL ready)
- Frontend dashboard
- Production deployment

---

## Tech Stack

- **Runtime:** Node.js 18+ / TypeScript 5.0
- **Framework:** Express.js
- **Bitcoin:** Bitcoin Core 26.0 (regtest)
- **Lightning:** LND 0.17.4
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Infrastructure:** Docker Compose


## Getting started

### 1. Clone the Repository

```bash
git clone https://github.com/SusanGithaigaN/lightning-anchor-fee-outputs.git
cd lightning-anchor-fee-outputs
npm install
```


### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
NODE_ENV=development
PORT=3000

# Bitcoin Core
BITCOIN_RPC_HOST=localhost
BITCOIN_RPC_PORT=18443
BITCOIN_RPC_USER=bitcoinrpc
BITCOIN_RPC_PASSWORD=your_password
BITCOIN_NETWORK=regtest

# LND
LND_GRPC_HOST=localhost:10009
LND_TLS_CERT_PATH=/path/to/tls.cert
LND_MACAROON_PATH=/path/to/admin.macaroon

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/anchor_service

# Redis
REDIS_URL=redis://localhost:6379

# Service Configuration
MIN_FEE_RATE=10
MAX_FEE_RATE=500
RESERVE_AMOUNT=100000000
```

### 4. Database Setup

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start Docker Services

**Important:** If you have local PostgreSQL or Redis running, stop them first:

```bash
# Stop local services
sudo systemctl stop postgresql redis-server

# Start Docker containers
docker compose up -d

# Verify all 4 containers are running
docker ps
```

You should see:
- bitcoin-regtest
- lnd-alice
- postgres-db
- redis-cache

### 3. Setup Bitcoin Wallet

```bash
# Create Bitcoin wallet
docker compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme createwallet "testwallet"

# Mine 101 blocks (need mature Bitcoin)
docker compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme -generate 101
```

### 4. Setup LND Wallet (if not already created)

```bash
docker compose exec lnd lncli --network=regtest create
```

**If you see "wallet already unlocked"**, skip this step - your wallet already exists.

### 5. Start the Service

```bash
npm run dev
```

Visit: `http://localhost:3000/health`

---

---

## Project Structure

```
lightning-anchor-fee-outputs/
├── src/
│   ├── api/v1/              # API endpoints
│   │   ├── bitcoin.ts       # Bitcoin RPC endpoints
│   │   ├── broadcast.ts     # Payment-gated CPFP broadcast
│   │   ├── feebump.ts       # Fee estimation & CPFP creation
│   │   ├── lightning.ts     # LND info endpoints
│   │   ├── lightning-payment.ts  # Invoice & payment endpoints
│   │   └── monitor.ts       # Monitoring control
│   ├── services/
│   │   ├── bitcoin/
│   │   │   └── node.ts      # Bitcoin Core RPC integration
│   │   ├── feebump/
│   │   │   ├── cpfp.ts      # CPFP transaction builder
│   │   │   └── monitor.ts   # Mempool monitoring
│   │   └── lightning/
│   │       ├── lnd.ts       # LND REST API client
│   │       └── payment.ts   # Invoice & payment service
│   ├── utils/
│   │   └── logger.ts        # Winston logger
│   └── index.ts             # Main entry point
├── docker/                   # Docker volumes (gitignored)
├── logs/                     # Application logs (gitignored)
├── scripts/
│   └── setup.sh             # Setup script
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Testing the Service

### Quick Test

```bash
# Health check
curl http://localhost:3000/health

# Bitcoin info
curl http://localhost:3000/api/v1/bitcoin/info

# Lightning info  
curl http://localhost:3000/api/v1/lightning/info
```

### Create Test Transaction

```bash
# Get new address
ADDR=$(docker compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme getnewaddress)

# Send 330 sats (creates anchor-like output)
TXID=$(docker compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme sendtoaddress $ADDR 0.00000330)

# Start monitoring
curl -X POST http://localhost:3000/api/v1/monitor/start

# Wait 5 seconds, then check status
sleep 5
curl http://localhost:3000/api/v1/monitor/status

# Estimate fee bump
curl -X POST http://localhost:3000/api/v1/feebump/estimate \
  -H "Content-Type: application/json" \
  -d "{\"txid\": \"$TXID\", \"targetFeeRate\": 10}"
```


## API Endpoints

### Bitcoin
- `GET /api/v1/bitcoin/info` - Blockchain info
- `GET /api/v1/bitcoin/mempool` - Mempool status
- `GET /api/v1/bitcoin/fee-estimate` - Current fee rates
- `GET /api/v1/bitcoin/transaction/:txid` - Transaction details

### Lightning
- `GET /api/v1/lightning/info` - Node info
- `GET /api/v1/lightning/balance` - Wallet balance
- `GET /api/v1/lightning/channels` - Channel list

### Lightning Payments
- `POST /api/v1/lightning/create-invoice` - Generate Lightning invoice
- `GET /api/v1/lightning/payment/:hash` - Check payment status
- `POST /api/v1/lightning/decode-invoice` - Decode invoice details

### Monitoring
- `POST /api/v1/monitor/start` - Start monitoring
- `POST /api/v1/monitor/stop` - Stop monitoring
- `GET /api/v1/monitor/status` - Get tracked transactions

### Fee Bumping
- `POST /api/v1/feebump/estimate` - Estimate CPFP costs
- `POST /api/v1/feebump/create` - Create CPFP transaction
- `POST /api/v1/feebump/broadcast` - Broadcast after payment verification


## 📚 Learning Resources

### My Article Series
- [Part 1: The Basics](https://dev.to/susangithaigan/understanding-lightning-network-anchor-outputs-part-1-the-basics-2p7j)
- [Part 2: Technical Deep Dive](https://dev.to/susangithaigan/lightning-network-anchor-outputs-explained-the-basics-part-1-27en)
- [Part 3: Setup & Implementation](https://dev.to/susangithaigan/building-an-anchor-output-fee-bumping-service-part-3-setup-implementation-pef)

### External Resources
- [Bitcoin Optech: Anchor Outputs](https://bitcoinops.org/en/topics/anchor-outputs/)
- [LND Documentation](https://docs.lightning.engineering/)
- [Bitcoin Core RPC](https://developer.bitcoin.org/reference/rpc/)

---

## 🤝 Contributing

This project is a work in progress.
Contributions, feedback, and suggestions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
