export interface Merchant {
  name: string;
  category: string | null;
  address: string | null;
}

export interface TransactionDetails {
  date: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number;
  paymentMethod: string | null;
}

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

export interface ParsedReceipt {
  merchant: Merchant;
  transaction: TransactionDetails;
  items: LineItem[];
  confidenceScore: number;
}

export interface Transaction {
  id: string;
  sourceMessageId: string;
  senderPhone: string;
  receivedAt: Date;
  processedAt: Date;
  merchant: Merchant;
  transaction: TransactionDetails;
  items: LineItem[];
  rawText: string | null;
  confidenceScore: number;
  status: string;
}

export interface ReceivedMessage {
  messageId: string;
  senderPhone: string;
  receivedAt: Date;
  imagePath?: string;
  imageData?: Buffer;
  mimeType?: string;
  text?: string;
}
