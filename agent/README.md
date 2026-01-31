# Photon Agent

iMessage Receipt Ingestion System - Extracts transaction data from receipt images sent via iMessage.

## Overview

The Photon Agent monitors iMessages for receipt photos sent to a designated phone number, processes them using Google's Gemini API, and extracts structured transaction data.

## Requirements

- macOS (required for iMessage access)
- Node.js 18+
- Full Disk Access permission (for reading iMessage database)
- Google Gemini API key

## Setup

1. **Install dependencies:**
   ```bash
   cd agent
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Gemini API key and phone number
   ```

3. **Grant Full Disk Access:**
   - Go to System Settings → Privacy & Security → Full Disk Access
   - Add Terminal (or your IDE/editor like VS Code, Cursor, etc.)

## Usage

**Run in development mode:**
```bash
npm run dev
```

**Build and run:**
```bash
npm run build
npm start
```

The agent will:
1. Poll for new iMessages with image attachments
2. Filter for messages from the monitored phone number
3. Send receipt images to Gemini API for extraction
4. Store parsed transaction data in SQLite

## Configuration

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `MONITORED_PHONE` | Phone number to accept receipts from |
| `POLL_INTERVAL_SECONDS` | How often to check for new messages |
| `DATABASE_PATH` | Path to SQLite database |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Data Schema

Each processed receipt contains:
- Merchant name and category
- Transaction date, subtotal, tax, total
- Payment method
- Line items with descriptions and prices
- Confidence score

## Architecture

```
User texts receipt → iMessage → Listener → Gemini API → Store → Backend (future)
```

## Project Structure

```
agent/
├── src/
│   ├── main.ts        # Entry point
│   ├── listener.ts    # iMessage monitoring
│   ├── processor.ts   # Gemini receipt parsing
│   ├── store.ts       # SQLite storage
│   ├── config.ts      # Configuration
│   └── types.ts       # TypeScript types
├── data/              # SQLite database
├── package.json
└── tsconfig.json
```
