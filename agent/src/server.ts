import { createServer, IncomingMessage, ServerResponse } from "http";
import { IMessageSDK } from "@photon-ai/imessage-kit";

export interface SendMessageRequest {
  phoneNumber: string;
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  error?: string;
  sentAt?: string;
}

export class MessageServer {
  private sdk: IMessageSDK;
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;

  constructor(port: number = 3456) {
    this.sdk = new IMessageSDK();
    this.port = port;
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }

  private sendJson(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(JSON.stringify(data, null, 2));
  }

  private async handleSendMessage(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.parseBody(req) as SendMessageRequest;

      // Validate request
      if (!body.phoneNumber) {
        this.sendJson(res, 400, {
          success: false,
          error: "phoneNumber is required",
        });
        return;
      }

      if (!body.message) {
        this.sendJson(res, 400, {
          success: false,
          error: "message is required",
        });
        return;
      }

      // Normalize phone number
      let phoneNumber = body.phoneNumber;
      if (!phoneNumber.startsWith("+")) {
        // Assume US number if no country code
        const digits = phoneNumber.replace(/\D/g, "");
        phoneNumber = digits.length === 10 ? `+1${digits}` : `+${digits}`;
      }

      console.log(`\n[API] Sending message to ${phoneNumber}: "${body.message.slice(0, 50)}..."`);

      // Send message via iMessage SDK
      const result = await this.sdk.send(phoneNumber, body.message);

      console.log(`[API] Message sent successfully at ${result.sentAt}`);

      this.sendJson(res, 200, {
        success: true,
        sentAt: result.sentAt.toISOString(),
      });
    } catch (err: any) {
      console.error("[API] Error sending message:", err);
      this.sendJson(res, 500, {
        success: false,
        error: err.message || "Failed to send message",
      });
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || "/";
    const method = req.method || "GET";

    // Handle CORS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    // Route requests
    if (url === "/api/send" && method === "POST") {
      await this.handleSendMessage(req, res);
    } else if (url === "/api/health" && method === "GET") {
      this.sendJson(res, 200, { status: "ok", service: "photon-agent" });
    } else if (url === "/" && method === "GET") {
      this.sendJson(res, 200, {
        service: "Photon Agent API",
        endpoints: {
          "POST /api/send": "Send an iMessage to a phone number",
          "GET /api/health": "Health check",
        },
        example: {
          endpoint: "POST /api/send",
          body: {
            phoneNumber: "+1234567890",
            message: "Hello from Photon Agent!",
          },
        },
      });
    } else {
      this.sendJson(res, 404, { error: "Not found" });
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch((err) => {
          console.error("[API] Unhandled error:", err);
          this.sendJson(res, 500, { error: "Internal server error" });
        });
      });

      this.server.listen(this.port, () => {
        console.log(`\n[API] Message API server running on http://localhost:${this.port}`);
        console.log(`[API] Endpoints:`);
        console.log(`      POST http://localhost:${this.port}/api/send - Send a message`);
        console.log(`      GET  http://localhost:${this.port}/api/health - Health check\n`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log("[API] Server stopped");
          resolve();
        });
      });
    }
    await this.sdk.close();
  }
}
