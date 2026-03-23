# Lightning Integration - File Setup Instructions

## Your Current Structure

```
src/
├── services/
│   ├── bitcoin/
│   │   └── node.ts          # ← Will be replaced
│   ├── feebump/
│   │   ├── cpfp.ts
│   │   └── monitor.ts
│   └── lightning/
│       └── lnd.ts           # ← Keep this, add payment.ts
├── api/v1/
│   ├── bitcoin.ts
│   ├── feebump.ts
│   ├── lightning.ts
│   └── monitor.ts
```

---

## Step-by-Step File Installation

### 1. Lightning Payment Service

```bash
# Copy payment.ts to services/lightning/
cp payment.ts ~/development/projects/lightning-anchor-fee-outputs/src/services/lightning/payment.ts
```

**Result:**
```
src/services/lightning/
├── lnd.ts       # Existing - keeps working
└── payment.ts   # New - invoice & payment handling
```

### 2. Lightning Payment API Routes

```bash
# Copy lightning-payment.ts to api/v1/
cp lightning-payment.ts ~/development/projects/lightning-anchor-fee-outputs/src/api/v1/lightning-payment.ts
```

**Result:**
```
src/api/v1/
├── bitcoin.ts
├── feebump.ts
├── lightning.ts          # Existing - node info
├── lightning-payment.ts  # New - invoices & payments
└── monitor.ts
```

### 3. Broadcast API Routes

```bash
# Copy broadcast.ts to api/v1/
cp broadcast.ts ~/development/projects/lightning-anchor-fee-outputs/src/api/v1/broadcast.ts
```

**Result:**
```
src/api/v1/
├── bitcoin.ts
├── broadcast.ts          # New - payment-gated broadcasting
├── feebump.ts
├── lightning.ts
├── lightning-payment.ts
└── monitor.ts
```

### 4. Updated Bitcoin Service

```bash
# Backup current version
cp ~/development/projects/lightning-anchor-fee-outputs/src/services/bitcoin/node.ts \
   ~/development/projects/lightning-anchor-fee-outputs/src/services/bitcoin/node.ts.backup

# Copy updated version
cp node.ts ~/development/projects/lightning-anchor-fee-outputs/src/services/bitcoin/node.ts
```

**What changed:** Added `sendRawTransaction()` method for broadcasting.

---

## Step 5: Update Main Router

Edit `src/index.ts`:

```typescript
import express, { Express } from 'express';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Import routes
import bitcoinRoutes from './api/v1/bitcoin';
import lightningRoutes from './api/v1/lightning';
import monitorRoutes from './api/v1/monitor';
import feebumpRoutes from './api/v1/feebump';
import lightningPaymentRoutes from './api/v1/lightning-payment';  // ← NEW
import broadcastRoutes from './api/v1/broadcast';                 // ← NEW

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/v1/bitcoin', bitcoinRoutes);
app.use('/api/v1/lightning', lightningRoutes);
app.use('/api/v1/monitor', monitorRoutes);
app.use('/api/v1/feebump', feebumpRoutes);
app.use('/api/v1/lightning', lightningPaymentRoutes);  // ← NEW
app.use('/api/v1/feebump', broadcastRoutes);          // ← NEW

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

export default app;
```

---

## Step 6: Update Environment Variables

Add to `.env`:

```env
# Lightning Payment Service
LND_REST_URL=https://localhost:8080
LND_MACAROON_PATH=./docker/lnd/data/chain/bitcoin/regtest/admin.macaroon
```

---

## Step 7: Restart Server

```bash
cd ~/development/projects/lightning-anchor-fee-outputs
npm run dev
```

**Expected output:**
```
Lightning payment service initialized { lndRestUrl: 'https://localhost:8080' }
Server running on port 3000
```

---

## Quick Test

```bash
# Test invoice creation
curl -X POST http://localhost:3000/api/v1/lightning/create-invoice \
  -H "Content-Type: application/json" \
  -d '{"amountSats": 1000, "memo": "Test"}' | jq

# Should return:
# {
#   "success": true,
#   "data": {
#     "paymentHash": "...",
#     "invoice": "lnbcrt...",
#     ...
#   }
# }
```

---

## Files Summary

### New Files (4 total):

1. **src/services/lightning/payment.ts** - Lightning payment service
2. **src/api/v1/lightning-payment.ts** - Invoice/payment API endpoints  
3. **src/api/v1/broadcast.ts** - Payment-gated broadcast endpoint
4. **src/services/bitcoin/node.ts** - Updated (added sendRawTransaction)

### Modified Files (1):

1. **src/index.ts** - Added 2 new route imports

---

## New API Endpoints

After setup, you'll have these new endpoints:

```
POST   /api/v1/lightning/create-invoice     # Create Lightning invoice
GET    /api/v1/lightning/payment/:hash      # Check payment status
POST   /api/v1/lightning/decode-invoice     # Decode invoice details
POST   /api/v1/feebump/broadcast           # Broadcast after payment
```

---

## Troubleshooting

### "Cannot find module './api/v1/lightning-payment'"

**Fix:** Make sure the file is named exactly `lightning-payment.ts` (with hyphen, not underscore)

### "Cannot load LND macaroon"

**Fix:** Check the path:
```bash
ls -la ~/development/projects/lightning-anchor-fee-outputs/docker/lnd/data/chain/bitcoin/regtest/admin.macaroon
```

Update `.env` if needed.

---

## ✅ Verification Checklist

- [ ] `payment.ts` in `src/services/lightning/`
- [ ] `lightning-payment.ts` in `src/api/v1/`
- [ ] `broadcast.ts` in `src/api/v1/`
- [ ] `node.ts` updated in `src/services/bitcoin/`
- [ ] Two new imports added to `src/index.ts`
- [ ] `.env` has `LND_REST_URL` and `LND_MACAROON_PATH`
- [ ] Server starts without errors
- [ ] Invoice creation endpoint works

---

All set! 🚀