# Photon Agent Plan
## iMessage Receipt Ingestion System

**Status:** Planning
**Last Updated:** January 31, 2026

---

## 1. Overview

The Photon Agent is a macOS-based service that monitors iMessages for receipt images sent to a designated phone number. It extracts transactional data using the Gemini API and prepares it for integration with the financial platform backend.

### Core Flow
```
User texts receipt photo → iMessage → Photon Agent → Gemini API → Parsed Transaction Data → Backend (future)
```

---

## 2. Technical Stack

| Component | Technology |
|-----------|------------|
| iMessage Access | `@photon-ai/imessage-kit` (TypeScript) |
| Image Processing | Google Gemini API (Vision) |
| Runtime | Node.js 18+ on macOS |
| Data Storage | SQLite via better-sqlite3 |

---

## 3. Architecture

### 3.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Photon Agent                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   iMessage   │    │   Receipt    │    │    Data      │  │
│  │   Listener   │───▶│   Processor  │───▶│   Store      │  │
│  │              │    │   (Gemini)   │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │          │
│         │                                       ▼          │
│         │                              ┌──────────────┐    │
│         │                              │   Backend    │    │
│         └─────────────────────────────▶│   Exporter   │    │
│              (confirmation reply)      │   (future)   │    │
│                                        └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Module Breakdown

1. **iMessage Listener** (`listener.py`)
   - Connects to local iMessage database via imessagekit
   - Polls for new messages from monitored phone numbers
   - Filters for image attachments
   - Extracts image data for processing

2. **Receipt Processor** (`processor.py`)
   - Sends images to Gemini API with structured prompts
   - Parses response into transaction schema
   - Validates extracted data
   - Handles edge cases (unclear receipts, multiple items)

3. **Data Store** (`store.py`)
   - Stores parsed transactions locally
   - Tracks processing status per message
   - Prevents duplicate processing

4. **Backend Exporter** (`exporter.py`) - Future
   - Pushes transactions to platform backend API
   - Handles authentication and retry logic

---

## 4. Data Schema

### 4.1 Parsed Transaction

```json
{
  "id": "uuid",
  "source_message_id": "imessage-id",
  "sender_phone": "+1234567890",
  "received_at": "2026-01-31T12:00:00Z",
  "processed_at": "2026-01-31T12:00:05Z",
  "merchant": {
    "name": "Target",
    "category": "retail",
    "address": "123 Main St, City, ST 12345"
  },
  "transaction": {
    "date": "2026-01-31",
    "subtotal": 45.99,
    "tax": 3.68,
    "total": 49.67,
    "payment_method": "Visa ending in 1234"
  },
  "items": [
    {
      "description": "Groceries",
      "quantity": 1,
      "price": 25.99
    },
    {
      "description": "Household Items",
      "quantity": 2,
      "price": 20.00
    }
  ],
  "raw_text": "...",
  "confidence_score": 0.92,
  "status": "processed"
}
```

---

## 5. Gemini API Integration

### 5.1 Prompt Strategy

```python
RECEIPT_EXTRACTION_PROMPT = """
Analyze this receipt image and extract the following information in JSON format:

1. Merchant name and category (grocery, restaurant, retail, gas, etc.)
2. Transaction date
3. Subtotal, tax, and total amounts
4. Payment method (if visible)
5. Individual line items with descriptions and prices

If any field is unclear or not visible, set it to null.
Respond ONLY with valid JSON matching this schema:
{
  "merchant": {"name": str, "category": str, "address": str|null},
  "transaction": {"date": str, "subtotal": float|null, "tax": float|null, "total": float},
  "payment_method": str|null,
  "items": [{"description": str, "quantity": int, "price": float}],
  "confidence_score": float (0-1)
}
"""
```

### 5.2 Model Selection

- **Model:** `gemini-1.5-flash` (fast, cost-effective for receipts)
- **Fallback:** `gemini-1.5-pro` for complex/unclear receipts

---

## 6. Implementation Plan

### Phase 1: Core Setup (MVP)
- [ ] Set up Python project structure
- [ ] Install and configure `imessagekit`
- [ ] Grant necessary macOS permissions (Full Disk Access for Messages.app DB)
- [ ] Create basic message listener that detects new images
- [ ] Test receiving and extracting image attachments

### Phase 2: Gemini Integration
- [ ] Set up Gemini API client
- [ ] Implement receipt extraction prompt
- [ ] Parse JSON responses into transaction objects
- [ ] Add validation and error handling
- [ ] Test with sample receipt images

### Phase 3: Data Management
- [ ] Implement local SQLite storage
- [ ] Track processed messages to avoid duplicates
- [ ] Add logging and monitoring
- [ ] Implement reply confirmation to sender

### Phase 4: Polish & Testing
- [ ] Handle edge cases (blurry images, partial receipts)
- [ ] Add retry logic for API failures
- [ ] Test with various receipt types
- [ ] Document setup and usage

### Phase 5: Backend Integration (Post-MVP)
- [ ] Define API contract with backend
- [ ] Implement transaction push endpoint
- [ ] Add authentication
- [ ] Sync historical data

---

## 7. File Structure

```
agent/
├── PHOTON_AGENT_PLAN.md
├── package.json
├── tsconfig.json
├── .env / .env.example
├── src/
│   ├── main.ts              # Entry point
│   ├── listener.ts          # iMessage monitoring
│   ├── processor.ts         # Gemini receipt parsing
│   ├── store.ts             # Local data storage
│   ├── config.ts            # Configuration management
│   └── types.ts             # TypeScript interfaces
├── dist/                    # Compiled JavaScript
├── data/
│   └── transactions.db      # SQLite database
└── README.md
```

---

## 8. Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@photon-ai/imessage-kit": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 9. Environment Variables

```bash
# .env.example
GEMINI_API_KEY=your_gemini_api_key
MONITORED_PHONE=+1234567890       # Phone number to receive receipts
POLL_INTERVAL_SECONDS=5          # How often to check for new messages
DATABASE_PATH=./data/transactions.db
LOG_LEVEL=INFO
```

---

## 10. macOS Permissions Required

1. **Full Disk Access** - Required to read the iMessage database (`~/Library/Messages/chat.db`)
2. **Automation** (optional) - If sending reply confirmations via AppleScript

To grant:
1. System Preferences → Security & Privacy → Privacy → Full Disk Access
2. Add Terminal (or your Python interpreter/IDE)

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| iMessage DB schema changes | Agent breaks | Pin imessagekit version, monitor for updates |
| Poor image quality | Extraction failures | Implement confidence threshold, ask user to resend |
| Gemini API rate limits | Processing delays | Implement queue with backoff |
| Duplicate messages | Double-processing | Track message IDs in database |
| macOS permission issues | Agent can't read messages | Clear setup documentation |

---

## 12. Success Criteria (MVP)

- [ ] Agent successfully detects new iMessages with image attachments
- [ ] Receipt images are sent to Gemini and parsed correctly
- [ ] Transaction data is stored locally with all required fields
- [ ] Agent handles errors gracefully (bad images, API failures)
- [ ] Processing time < 10 seconds per receipt
- [ ] 80%+ accuracy on standard printed receipts

---

## 13. Next Steps

1. **Immediate:** Set up project structure and install dependencies
2. **Day 1:** Get iMessage listener working with test messages
3. **Day 1-2:** Integrate Gemini API and test receipt parsing
4. **Day 2:** Add local storage and duplicate detection
5. **Demo:** Show end-to-end flow of texting receipt → parsed transaction
