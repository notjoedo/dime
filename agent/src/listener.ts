import { IMessageSDK } from "@photon-ai/imessage-kit";
import { readFileSync, existsSync } from "fs";
import { config } from "./config.js";
import type { ReceivedMessage } from "./types.js";

export class MessageListener {
  private sdk: IMessageSDK;
  private monitoredPhone: string;
  private processedIds: Set<string> = new Set();
  private lastCheckTime: Date | null = null;

  constructor(monitoredPhone?: string) {
    this.monitoredPhone = monitoredPhone || config.MONITORED_PHONE;
    this.sdk = new IMessageSDK();
    console.log(`MessageListener initialized for phone: ${this.monitoredPhone}`);
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except leading +
    const digits = phone.replace(/\D/g, "");
    // Handle US numbers - add country code if missing
    if (digits.length === 10) {
      return "+1" + digits;
    }
    return "+" + digits;
  }

  private isFromMonitoredPhone(sender: string): boolean {
    if (!this.monitoredPhone) {
      return true; // Accept all if no filter set
    }
    const normalizedSender = this.normalizePhone(sender);
    const normalizedTarget = this.normalizePhone(this.monitoredPhone);
    return normalizedSender === normalizedTarget;
  }

  private isImageAttachment(filename: string | null | undefined): boolean {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".heic") ||
      lower.endsWith(".heif")
    );
  }

  private getMimeType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".heic")) return "image/heic";
    if (lower.endsWith(".heif")) return "image/heif";
    return "image/jpeg"; // Default for .jpg, .jpeg
  }

  async getNewMessages(): Promise<ReceivedMessage[]> {
    const newMessages: ReceivedMessage[] = [];

    try {
      // Get recent messages using the SDK - returns MessageQueryResult
      const result = await this.sdk.getMessages({
        limit: 50,
        hasAttachments: true,
        excludeOwnMessages: true,
      });

      for (const msg of result.messages) {
        const msgId = msg.guid || String(msg.id);
        if (!msgId || this.processedIds.has(msgId)) {
          continue;
        }

        // Check sender
        const sender = msg.sender || "";
        if (!sender || !this.isFromMonitoredPhone(sender)) {
          continue;
        }

        // Check for image attachments
        if (!msg.attachments || msg.attachments.length === 0) {
          continue;
        }

        for (const attachment of msg.attachments) {
          if (!this.isImageAttachment(attachment.filename)) {
            continue;
          }

          const imagePath = attachment.path;
          if (!imagePath || !existsSync(imagePath)) {
            console.warn(`Image path not found for message ${msgId}`);
            continue;
          }

          try {
            const imageData = readFileSync(imagePath);
            const mimeType = this.getMimeType(attachment.filename);

            const receivedMsg: ReceivedMessage = {
              messageId: msgId,
              senderPhone: sender,
              receivedAt: msg.date,
              imagePath: imagePath,
              imageData: imageData,
              mimeType: mimeType,
            };

            newMessages.push(receivedMsg);
            this.processedIds.add(msgId);
            console.log(`New receipt image from ${sender}: ${attachment.filename} (${mimeType})`);
          } catch (err) {
            console.error(`Failed to read image ${imagePath}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }

    return newMessages;
  }

  markProcessed(messageId: string): void {
    this.processedIds.add(messageId);
  }

  loadProcessedIds(ids: Set<string>): void {
    ids.forEach((id) => this.processedIds.add(id));
    console.log(`Loaded ${ids.size} previously processed message IDs`);
  }

  async close(): Promise<void> {
    await this.sdk.close();
  }
}
