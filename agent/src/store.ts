import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { config } from "./config.js";
import type {
  Transaction,
  ParsedReceipt,
  Merchant,
  TransactionDetails,
  LineItem,
} from "./types.js";

export class TransactionStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || config.getDatabasePath();

    // Ensure directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(path);
    this.initDb();
    console.log(`TransactionStore initialized at ${path}`);
  }

  private initDb(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        source_message_id TEXT UNIQUE,
        sender_phone TEXT,
        received_at TEXT,
        processed_at TEXT,
        merchant_name TEXT,
        merchant_category TEXT,
        merchant_address TEXT,
        transaction_date TEXT,
        subtotal REAL,
        tax REAL,
        total REAL,
        payment_method TEXT,
        items_json TEXT,
        raw_text TEXT,
        confidence_score REAL,
        status TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_messages (
        message_id TEXT PRIMARY KEY,
        processed_at TEXT,
        type TEXT
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_processed_id
      ON processed_messages(message_id)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_txn_sender
      ON transactions(sender_phone)
    `);
  }

  markProcessed(messageId: string, type: string = "chat"): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO processed_messages (message_id, processed_at, type)
        VALUES (?, ?, ?)
      `);
      stmt.run(messageId, new Date().toISOString(), type);
    } catch (err) {
      console.error("Failed to mark message as processed:", err);
    }
  }

  saveTransaction(transaction: Transaction): boolean {
    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO transactions (
            id, source_message_id, sender_phone, received_at, processed_at,
            merchant_name, merchant_category, merchant_address,
            transaction_date, subtotal, tax, total, payment_method,
            items_json, raw_text, confidence_score, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          transaction.id,
          transaction.sourceMessageId,
          transaction.senderPhone,
          transaction.receivedAt.toISOString(),
          transaction.processedAt.toISOString(),
          transaction.merchant.name,
          transaction.merchant.category,
          transaction.merchant.address,
          transaction.transaction.date,
          transaction.transaction.subtotal,
          transaction.transaction.tax,
          transaction.transaction.total,
          transaction.transaction.paymentMethod,
          JSON.stringify(transaction.items),
          transaction.rawText,
          transaction.confidenceScore,
          transaction.status
        );

        this.markProcessed(transaction.sourceMessageId, "receipt");
      })();

      console.log(`Saved transaction ${transaction.id}`);
      return true;
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        console.warn(
          `Duplicate transaction for message ${transaction.sourceMessageId}`
        );
        return false;
      }
      console.error("Failed to save transaction:", err);
      return false;
    }
  }

  isProcessed(messageId: string): boolean {
    const stmt = this.db.prepare(
      "SELECT 1 FROM processed_messages WHERE message_id = ?"
    );
    const result = stmt.get(messageId);
    return result !== undefined;
  }

  getProcessedMessageIds(): Set<string> {
    const stmt = this.db.prepare("SELECT message_id FROM processed_messages");
    const rows = stmt.all() as { message_id: string }[];
    return new Set(rows.map((row) => row.message_id));
  }

  getRecentTransactions(limit: number = 10): Transaction[] {
    const stmt = this.db.prepare(
      "SELECT * FROM transactions ORDER BY processed_at DESC LIMIT ?"
    );
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => this.rowToTransaction(row));
  }

  getTotalSpending(): number {
    const stmt = this.db.prepare("SELECT SUM(total) as total FROM transactions");
    const result = stmt.get() as { total: number | null };
    return result.total || 0;
  }

  private rowToTransaction(row: any): Transaction {
    const items: LineItem[] = row.items_json ? JSON.parse(row.items_json) : [];

    return {
      id: row.id,
      sourceMessageId: row.source_message_id,
      senderPhone: row.sender_phone,
      receivedAt: new Date(row.received_at),
      processedAt: new Date(row.processed_at),
      merchant: {
        name: row.merchant_name,
        category: row.merchant_category,
        address: row.merchant_address,
      },
      transaction: {
        date: row.transaction_date,
        subtotal: row.subtotal,
        tax: row.tax,
        total: row.total,
        paymentMethod: row.payment_method,
      },
      items,
      rawText: row.raw_text,
      confidenceScore: row.confidence_score,
      status: row.status,
    };
  }

  private lastSentMessages: Set<string> = new Set();

  markSent(text: string): void {
    this.lastSentMessages.add(text.trim());
    // Keep only last 10
    if (this.lastSentMessages.size > 10) {
      const first = this.lastSentMessages.values().next().value;
      if (first) this.lastSentMessages.delete(first);
    }
  }

  isBotResponse(text: string | null | undefined): boolean {
    if (!text) return false;
    return this.lastSentMessages.has(text.trim());
  }

  close(): void {
    this.db.close();
  }
}

export function createTransactionFromReceipt(
  receipt: ParsedReceipt,
  messageId: string,
  senderPhone: string,
  receivedAt: Date
): Transaction {
  return {
    id: randomUUID(),
    sourceMessageId: messageId,
    senderPhone,
    receivedAt,
    processedAt: new Date(),
    merchant: receipt.merchant,
    transaction: receipt.transaction,
    items: receipt.items,
    rawText: null,
    confidenceScore: receipt.confidenceScore,
    status: "processed",
  };
}
