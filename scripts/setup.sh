#!/bin/bash

echo "🚀 Setting up Lightning Anchor Fee Bumping Service..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p docker/bitcoin
mkdir -p docker/lnd
mkdir -p docker/postgres
mkdir -p docker/redis

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check Bitcoin Core
echo "🔍 Checking Bitcoin Core..."
docker-compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme getblockchaininfo

# Create initial blocks
echo "⛏️  Mining initial blocks..."
docker-compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme createwallet "testwallet"
docker-compose exec bitcoin bitcoin-cli -regtest -rpcuser=bitcoinrpc -rpcpassword=changeme -generate 101

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000/health to check if server is running"