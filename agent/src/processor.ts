import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";
import type { ParsedReceipt, Merchant, TransactionDetails, LineItem } from "./types.js";

const RECEIPT_EXTRACTION_PROMPT = `
Analyze this receipt image and extract the following information in JSON format.

Extract:
1. Merchant name and category (grocery, restaurant, retail, gas, pharmacy, entertainment, travel, etc.)
2. Merchant address if visible
3. Transaction date (format: YYYY-MM-DD)
4. Subtotal, tax, and total amounts (as numbers, no currency symbols)
5. Payment method if visible (e.g., "Visa ending in 1234", "Cash", "Apple Pay")
6. Individual line items with descriptions, quantities, and prices

If any field is unclear or not visible, set it to null.
For items without clear quantities, assume quantity of 1.

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation):
{
  "merchant": {
    "name": "string",
    "category": "string or null",
    "address": "string or null"
  },
  "transaction": {
    "date": "YYYY-MM-DD or null",
    "subtotal": number or null,
    "tax": number or null,
    "total": number
  },
  "payment_method": "string or null",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "price": number
    }
  ],
  "confidence_score": number between 0 and 1
}

Important:
- The total field is REQUIRED - estimate if not clearly visible
- confidence_score should reflect how clearly you could read the receipt (1.0 = perfect, 0.5 = partially readable)
- Category should be one of: grocery, restaurant, retail, gas, pharmacy, entertainment, travel, utilities, other
`;

export class ReceiptProcessor {
  private ai: GoogleGenAI;
  private model: string = "gemini-2.5-flash";

  constructor(apiKey?: string) {
    const key = apiKey || config.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: key });
    console.log(`ReceiptProcessor initialized with Gemini API (${this.model})`);
  }

  private parseResponse(responseText: string): ParsedReceipt {
    // Clean up response - remove markdown code blocks if present
    let text = responseText.trim();
    if (text.startsWith("```json")) {
      text = text.slice(7);
    }
    if (text.startsWith("```")) {
      text = text.slice(3);
    }
    if (text.endsWith("```")) {
      text = text.slice(0, -3);
    }
    text = text.trim();

    const data = JSON.parse(text);

    // Build merchant
    const merchantData = data.merchant || {};
    const merchant: Merchant = {
      name: merchantData.name || "Unknown",
      category: merchantData.category || null,
      address: merchantData.address || null,
    };

    // Build transaction details
    const txnData = data.transaction || {};
    const transaction: TransactionDetails = {
      date: txnData.date || null,
      subtotal: txnData.subtotal ?? null,
      tax: txnData.tax ?? null,
      total: txnData.total || 0,
      paymentMethod: data.payment_method || null,
    };

    // Build line items
    const items: LineItem[] = (data.items || []).map((item: any) => ({
      description: item.description || "Unknown item",
      quantity: item.quantity || 1,
      price: item.price || 0,
    }));

    return {
      merchant,
      transaction,
      items,
      confidenceScore: data.confidence_score || 0.5,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async processReceipt(
    imageData: Buffer,
    useFallback: boolean = false,
    mimeType: string = "image/jpeg",
    retryCount: number = 0
  ): Promise<ParsedReceipt | null> {
    const maxRetries = 3;

    try {
      // Create the content with image
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: RECEIPT_EXTRACTION_PROMPT },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageData.toString("base64"),
                },
              },
            ],
          },
        ],
      });

      const text = response.text;

      if (!text) {
        console.warn("Empty response from Gemini");
        return null;
      }

      // Parse response
      const receipt = this.parseResponse(text);
      console.log(
        `Parsed receipt: ${receipt.merchant.name} - $${receipt.transaction.total.toFixed(2)} (confidence: ${(receipt.confidenceScore * 100).toFixed(0)}%)`
      );
      return receipt;
    } catch (err: any) {
      // Handle rate limit errors with retry
      if (err?.status === 429 && retryCount < maxRetries) {
        // Extract retry delay from error or use default
        const retryDelay = 20; // seconds
        console.log(`Rate limited. Waiting ${retryDelay}s before retry ${retryCount + 1}/${maxRetries}...`);
        await this.sleep(retryDelay * 1000);
        return this.processReceipt(imageData, useFallback, mimeType, retryCount + 1);
      }

      if (err instanceof SyntaxError) {
        console.error("Failed to parse Gemini response as JSON:", err);
      } else {
        console.error("Error processing receipt:", err);
      }
      return null;
    }
  }
}
