#!/usr/bin/env node
/**
 * Photon Agent - iMessage Receipt Ingestion System
 * Main entry point for the agent.
 */

import { config } from "./config.js";
import { MessageListener } from "./listener.js";
import { ReceiptProcessor } from "./processor.js";
import { TransactionStore, createTransactionFromReceipt } from "./store.js";
import { MessageServer } from "./server.js";
import type { ReceivedMessage, Transaction } from "./types.js";

class PhotonAgent {
  private listener: MessageListener;
  private processor: ReceiptProcessor;
  private store: TransactionStore;
  private server: MessageServer;
  private running: boolean = false;

  constructor(apiPort: number = 3456) {
    this.listener = new MessageListener();
    this.processor = new ReceiptProcessor();
    this.store = new TransactionStore();
    this.server = new MessageServer(apiPort);

    // Load previously processed message IDs to avoid reprocessing
    const processedIds = this.store.getProcessedMessageIds();
    this.listener.loadProcessedIds(processedIds);
  }

  async startServer(): Promise<void> {
    await this.server.start();
  }

  async processMessage(message: ReceivedMessage): Promise<boolean> {
    console.log(
      `Processing message ${message.messageId} from ${message.senderPhone}`
    );

    // Check if already processed
    if (this.store.isProcessed(message.messageId)) {
      console.log(`Message ${message.messageId} already processed, skipping`);
      return true;
    }

    // Process receipt image with Gemini
    const parsedReceipt = await this.processor.processReceipt(
      message.imageData,
      false,
      message.mimeType
    );

    if (!parsedReceipt) {
      console.warn(`Failed to parse receipt from message ${message.messageId}`);
      return false;
    }

    // Create transaction record
    const transaction = createTransactionFromReceipt(
      parsedReceipt,
      message.messageId,
      message.senderPhone,
      message.receivedAt
    );

    // Save to database
    const saved = this.store.saveTransaction(transaction);
    if (saved) {
      console.log(
        `Successfully processed receipt: ${transaction.merchant.name} - $${transaction.transaction.total.toFixed(2)}`
      );
      this.printTransactionSummary(transaction);
    }
    return saved;
  }

  private printTransactionSummary(txn: Transaction): void {
    // ANSI color codes for terminal
    const green = "\x1b[32m";
    const cyan = "\x1b[36m";
    const yellow = "\x1b[33m";
    const bold = "\x1b[1m";
    const reset = "\x1b[0m";

    console.log("\n" + green + bold + "=" .repeat(60) + reset);
    console.log(green + bold + "   NEW RECEIPT PROCESSED SUCCESSFULLY!" + reset);
    console.log(green + bold + "=" .repeat(60) + reset);

    console.log(cyan + "\n  MERCHANT INFO:" + reset);
    console.log(`    Name:      ${bold}${txn.merchant.name}${reset}`);
    console.log(`    Category:  ${txn.merchant.category || "Unknown"}`);
    if (txn.merchant.address) {
      console.log(`    Address:   ${txn.merchant.address}`);
    }

    console.log(cyan + "\n  TRANSACTION:" + reset);
    console.log(`    Date:      ${txn.transaction.date || "Unknown"}`);
    if (txn.transaction.subtotal !== null) {
      console.log(`    Subtotal:  $${txn.transaction.subtotal.toFixed(2)}`);
    }
    if (txn.transaction.tax !== null) {
      console.log(`    Tax:       $${txn.transaction.tax.toFixed(2)}`);
    }
    console.log(`    ${bold}Total:     ${yellow}$${txn.transaction.total.toFixed(2)}${reset}`);
    if (txn.transaction.paymentMethod) {
      console.log(`    Payment:   ${txn.transaction.paymentMethod}`);
    }

    if (txn.items.length > 0) {
      console.log(cyan + "\n  LINE ITEMS:" + reset);
      for (const item of txn.items) {
        const qty = item.quantity > 1 ? ` (x${item.quantity})` : "";
        console.log(`    - ${item.description}${qty}: $${item.price.toFixed(2)}`);
      }
    }

    console.log(cyan + "\n  METADATA:" + reset);
    console.log(`    Confidence: ${(txn.confidenceScore * 100).toFixed(0)}%`);
    console.log(`    Message ID: ${txn.sourceMessageId.slice(0, 20)}...`);
    console.log(`    Sender:     ${txn.senderPhone}`);

    console.log(green + bold + "\n" + "=" .repeat(60) + reset);

    // Also output raw JSON for debugging
    console.log(cyan + "\n  RAW JSON DATA:" + reset);
    console.log(JSON.stringify({
      merchant: txn.merchant,
      transaction: txn.transaction,
      items: txn.items,
      confidence: txn.confidenceScore
    }, null, 2));
    console.log("\n");
  }

  async runOnce(): Promise<number> {
    const messages = await this.listener.getNewMessages();
    let processed = 0;

    for (const message of messages) {
      const success = await this.processMessage(message);
      if (success) {
        processed++;
      }
    }

    return processed;
  }

  async run(): Promise<void> {
    this.running = true;
    const pollInterval = config.POLL_INTERVAL_SECONDS * 1000;

    console.log(`\nPhoton Agent started. Monitoring phone: ${config.MONITORED_PHONE}`);
    console.log(`Poll interval: ${config.POLL_INTERVAL_SECONDS} seconds`);
    console.log("Press Ctrl+C to stop.\n");

    // Print current stats
    const total = this.store.getTotalSpending();
    const recent = this.store.getRecentTransactions(5);
    console.log(`Total spending tracked: $${total.toFixed(2)}`);
    console.log(`Recent transactions: ${recent.length}`);
    console.log("-".repeat(50));

    while (this.running) {
      try {
        const processed = await this.runOnce();
        if (processed > 0) {
          console.log(`Processed ${processed} new receipt(s)`);
        }
        await this.sleep(pollInterval);
      } catch (err) {
        console.error("Error in main loop:", err);
        await this.sleep(pollInterval);
      }
    }

    console.log("Photon Agent stopped.");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop(): void {
    this.running = false;
  }

  async cleanup(): Promise<void> {
    await this.server.stop();
    await this.listener.close();
    this.store.close();
  }
}

async function main(): Promise<void> {
  // Validate configuration
  const errors = config.validate();
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`Configuration error: ${error}`);
    }
    process.exit(1);
  }

  const agent = new PhotonAgent(config.API_PORT);

  // Handle signals for graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    agent.stop();
    await agent.cleanup();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start the API server
  await agent.startServer();

  // Run the agent
  await agent.run();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
