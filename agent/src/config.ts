import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenvConfig({ path: join(__dirname, "..", ".env") });

export const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  MONITORED_PHONE: process.env.MONITORED_PHONE || "",
  POLL_INTERVAL_SECONDS: parseInt(process.env.POLL_INTERVAL_SECONDS || "5", 10),
  DATABASE_PATH: process.env.DATABASE_PATH || "./data/transactions.db",
  LOG_LEVEL: process.env.LOG_LEVEL || "INFO",
  API_PORT: parseInt(process.env.API_PORT || "3456", 10),
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:5001",

  getDatabasePath(): string {
    const dbPath = this.DATABASE_PATH;
    if (dbPath.startsWith("/")) {
      return dbPath;
    }
    return join(__dirname, "..", dbPath);
  },

  validate(): string[] {
    const errors: string[] = [];
    if (!this.GEMINI_API_KEY) {
      errors.push("GEMINI_API_KEY is not set");
    }
    return errors;
  },
};
