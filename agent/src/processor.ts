import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import heicConvert from "heic-convert";
import { config } from "./config.js";
import type { ParsedReceipt } from "./types.js";

// Improved prompt with explicit payment method instruction
const RECEIPT_PROMPT = `Extract ALL data from this receipt as JSON. IMPORTANT: Look carefully for the PAYMENT METHOD (card type, last 4 digits, Apple Pay, Cash, etc.) - it's usually at the bottom.

Return ONLY valid JSON:
{"merchant":{"name":"str","category":"grocery|restaurant|retail|gas|pharmacy|entertainment|travel|utilities|other","address":"str|null"},"transaction":{"date":"YYYY-MM-DD|null","subtotal":num|null,"tax":num|null,"total":num},"payment_method":"str|null (e.g. 'Visa ****1234', 'Apple Pay', 'Cash')","items":[{"description":"str","quantity":num,"price":num}],"confidence_score":0-1}`;

// Image compression settings for faster processing
const MAX_IMAGE_WIDTH = 1200;
const JPEG_QUALITY = 80;

export class ReceiptProcessor {
  private ai: GoogleGenAI;
  private model = "gemini-2.5-flash";

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || config.GEMINI_API_KEY });
  }

  // Convert HEIC to JPEG using heic-convert
  private async convertHeicToJpeg(imageData: Buffer): Promise<Buffer> {
    const result = await heicConvert({
      buffer: imageData,
      format: "JPEG",
      quality: JPEG_QUALITY / 100,
    });
    return Buffer.from(result);
  }

  // Compress image to reduce upload size and processing time
  private async compressImage(imageData: Buffer, mimeType: string): Promise<{ data: Buffer; mimeType: string }> {
    try {
      let jpegData: Buffer;

      // Handle HEIC/HEIF separately using heic-convert
      if (mimeType === "image/heic" || mimeType === "image/heif") {
        console.log("Converting HEIC to JPEG...");
        jpegData = await this.convertHeicToJpeg(imageData);
        mimeType = "image/jpeg";
      } else {
        jpegData = imageData;
      }

      // Now use sharp for resizing/compression
      let sharpInstance = sharp(jpegData);
      const metadata = await sharpInstance.metadata();

      // Only resize if image is larger than max width
      if (metadata.width && metadata.width > MAX_IMAGE_WIDTH) {
        sharpInstance = sharpInstance.resize(MAX_IMAGE_WIDTH, null, { withoutEnlargement: true });
      }

      // Compress to JPEG
      if (mimeType === "image/png") {
        const compressed = await sharpInstance.png({ compressionLevel: 8 }).toBuffer();
        return { data: compressed, mimeType: "image/png" };
      }

      const compressed = await sharpInstance.jpeg({ quality: JPEG_QUALITY }).toBuffer();
      return { data: compressed, mimeType: "image/jpeg" };
    } catch (err) {
      console.warn("Image compression failed, using original:", err);
      return { data: imageData, mimeType };
    }
  }

  private parseResponse(text: string): ParsedReceipt {
    let clean = text.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    else if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);

    const data = JSON.parse(clean.trim());
    const m = data.merchant || {};
    const t = data.transaction || {};

    return {
      merchant: { name: m.name || "Unknown", category: m.category || null, address: m.address || null },
      transaction: {
        date: t.date || null,
        subtotal: t.subtotal ?? null,
        tax: t.tax ?? null,
        total: t.total || 0,
        paymentMethod: data.payment_method || null,
      },
      items: (data.items || []).map((i: any) => ({
        description: i.description || "Item",
        quantity: i.quantity || 1,
        price: i.price || 0,
      })),
      confidenceScore: data.confidence_score || 0.5,
    };
  }

  async processReceipt(imageData: Buffer, _useFallback = false, mimeType = "image/jpeg", retryCount = 0): Promise<ParsedReceipt | null> {
    try {
      // Compress image for faster upload and processing
      const compressed = await this.compressImage(imageData, mimeType);
      const originalSize = imageData.length;
      const newSize = compressed.data.length;
      if (newSize < originalSize) {
        console.log(`Image compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB`);
      }

      const base64Data = compressed.data.toString("base64");
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { inlineData: { mimeType: compressed.mimeType, data: base64Data } },
          { text: RECEIPT_PROMPT },
        ],
      });

      if (!response.text) return null;

      const receipt = this.parseResponse(response.text);
      const paymentInfo = receipt.transaction.paymentMethod ? ` | Payment: ${receipt.transaction.paymentMethod}` : "";
      console.log(`Parsed: ${receipt.merchant.name} - $${receipt.transaction.total.toFixed(2)}${paymentInfo}`);
      return receipt;
    } catch (err: any) {
      // Log full error details for debugging
      console.error("Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));

      const status = err?.status || err?.response?.status || err?.code;
      if ((status === 429 || err?.message?.includes("429") || err?.message?.includes("rate")) && retryCount < 3) {
        const delay = Math.min(5 * Math.pow(2, retryCount), 30); // 5s, 10s, 20s
        console.log(`Rate limited (status: ${status}). Retry ${retryCount + 1}/3 in ${delay}s...`);
        await new Promise((r) => setTimeout(r, delay * 1000));
        return this.processReceipt(imageData, _useFallback, mimeType, retryCount + 1);
      }
      console.error("Receipt processing error:", err instanceof SyntaxError ? "Invalid JSON" : err.message || err);
      return null;
    }
  }
}
