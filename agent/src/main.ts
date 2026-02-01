#!/usr/bin/env node
/**
 * Photon Agent - iMessage Receipt Ingestion System
 */

import { config } from "./config.js";
import { MessageListener } from "./listener.js";
import { ReceiptProcessor } from "./processor.js";
import { TransactionStore, createTransactionFromReceipt } from "./store.js";
import { MessageServer } from "./server.js";
import { formatReceiptConfirmation } from "./utils.js";
import type { ReceivedMessage } from "./types.js";

class PhotonAgent {
  private listener: MessageListener;
  private processor: ReceiptProcessor;
  private store: TransactionStore;
  private server: MessageServer;
  private running = false;

  constructor(apiPort = 3456) {
    this.listener = new MessageListener();
    this.processor = new ReceiptProcessor();
    this.store = new TransactionStore();
    this.server = new MessageServer(apiPort);
    this.listener.loadProcessedIds(this.store.getProcessedMessageIds());
  }

  async startServer(): Promise<void> {
    await this.server.start();
  }

  async processMessage(message: ReceivedMessage): Promise<boolean> {
    if (this.store.isProcessed(message.messageId)) return true;

    // Handle receipt image
    if (message.imageData) {
      const receipt = await this.processor.processReceipt(message.imageData, false, message.mimeType);
      if (!receipt) return false;

      const txn = createTransactionFromReceipt(receipt, message.messageId, message.senderPhone, message.receivedAt);
      const saved = this.store.saveTransaction(txn);

      if (saved) {
        // Send to backend
        await this.sendToBackend(txn, receipt);

        const msg = formatReceiptConfirmation(
          txn.merchant.name,
          txn.transaction.total,
          txn.merchant.category,
          txn.items,
          txn.transaction.paymentMethod
        );
        await this.server.sendExternal(message.senderPhone, msg);
        this.store.markSent(msg);
      }
      return saved;
    }

    // Handle text chat
    if (message.text) {
      if (this.store.isBotResponse(message.text)) {
        this.store.markProcessed(message.messageId);
        return true;
      }

      try {
        const response = await fetch(`${config.BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: "aman", message: message.text }),
        });

        if (!response.ok) throw new Error(`Backend: ${response.status}`);

        const { response: botReply } = await response.json();
        if (botReply) {
          await this.server.sendExternal(message.senderPhone, botReply);
          this.store.markSent(botReply);
          this.store.markProcessed(message.messageId);
          return true;
        }
      } catch (err) {
        console.error("Chat error:", err);
        const errMsg = "Sorry, I'm having trouble connecting. Please try again.";
        await this.server.sendExternal(message.senderPhone, errMsg);
        this.store.markSent(errMsg);
      }
    }

    return false;
  }

  private async sendToBackend(txn: any, receipt: any): Promise<void> {
    try {
      const knotTransaction = this.convertToKnotFormat(txn, receipt);
      
      const response = await fetch(`${config.BACKEND_URL}/api/knot/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "aman",
          transactions: [knotTransaction]
        }),
      });

      if (response.ok) {
        console.log("✅ Receipt sent to backend successfully");
      } else {
        console.error(`⚠️ Backend error: ${response.status}`);
      }
    } catch (err) {
      console.error("Backend send error:", err);
    }
  }

  private convertToKnotFormat(txn: any, receipt: any): any {
    const merchantCategoryMap: Record<string, number> = {
      grocery: 43,
      restaurant: 56,
      retail: 44,
      gas: 47,
      pharmacy: 51,
      entertainment: 13,
      travel: 10,
      utilities: 99,
      hotel: 10,
      bar: 56,
    };

    const category = txn.merchant.category?.toLowerCase() || "other";
    const merchantId = merchantCategoryMap[category] || 99;

    // Build products array
    const products = txn.items.map((item: any) => ({
      name: item.description,
      quantity: item.quantity,
      price: {
        unit_price: String(item.price),
        total: String(item.price * item.quantity),
      },
    }));

    // Build adjustments
    const adjustments = [];
    if (txn.transaction.tax && txn.transaction.tax > 0) {
      adjustments.push({
        type: "TAX",
        label: "Tax",
        amount: String(txn.transaction.tax),
      });
    }

    // Parse payment method
    let paymentType = "CARD";
    let paymentBrand = "Card";
    let lastFour = null;

    const pm = txn.transaction.paymentMethod || "";
    const pmUpper = pm.toUpperCase();
    if (pmUpper.includes("PAYPAL") || pmUpper.includes("APPLE PAY")) {
      paymentType = "PAYPAL";
      paymentBrand = pmUpper.includes("PAYPAL") ? "PayPal" : "Apple Pay";
    } else if (pm) {
      const parts = pm.split(/\s+/);
      if (parts.length > 0) paymentBrand = parts[0];
      // Extract last 4 digits
      const digits = pm.match(/\d{4}/);
      if (digits) lastFour = digits[0];
    }

    return {
      id: txn.id,
      external_id: txn.sourceMessageId,
      datetime: txn.receivedAt.toISOString(),
      merchant_id: merchantId,
      merchant_name: txn.merchant.name,
      order_status: "COMPLETED",
      payment_method: paymentType,
      payment_methods: [
        {
          type: paymentType,
          brand: paymentBrand,
          last_four: lastFour,
          transaction_amount: String(txn.transaction.total),
        },
      ],
      price: {
        currency: "USD",
        sub_total: String(txn.transaction.subtotal || txn.transaction.total),
        total: String(txn.transaction.total),
        adjustments,
      },
      products,
      total_amount: String(txn.transaction.total),
      confidence_score: txn.confidenceScore,
    };
  }

  async runOnce(): Promise<number> {
    const messages = await this.listener.getNewMessages();
    let processed = 0;
    for (const msg of messages) {
      if (await this.processMessage(msg)) processed++;
    }
    return processed;
  }

  async run(): Promise<void> {
    this.running = true;
    const pollMs = config.POLL_INTERVAL_SECONDS * 1000;

    console.log(`Photon Agent started | Poll: ${config.POLL_INTERVAL_SECONDS}s | Ctrl+C to stop`);

    while (this.running) {
      try {
        const n = await this.runOnce();
        if (n > 0) console.log(`Processed ${n} message(s)`);
      } catch (err) {
        console.error("Loop error:", err);
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
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
