// import express, { type Request, Response, NextFunction } from "express";
// import { registerRoutes } from "./routes";
// import { setupVite, serveStatic, log } from "./vite";
// import { ChatWebSocketServer } from "./websocket";

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// app.use((req, res, next) => {
//   const start = Date.now();
//   const path = req.path;
//   let capturedJsonResponse: Record<string, any> | undefined = undefined;

//   const originalResJson = res.json;
//   res.json = function (bodyJson, ...args) {
//     capturedJsonResponse = bodyJson;
//     return originalResJson.apply(res, [bodyJson, ...args]);
//   };

//   res.on("finish", () => {
//     const duration = Date.now() - start;
//     if (path.startsWith("/api")) {
//       let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
//       if (capturedJsonResponse) {
//         logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
//       }

//       if (logLine.length > 80) {
       
//         logLine = logLine.slice(0, 79) + "…";
//       }

//       log(logLine);
//     }
//   });

//   next();
// });

// (async () => {
//   const server = await registerRoutes(app);

//   // Initialize WebSocket server
//   const wsServer = new ChatWebSocketServer(server);
//   console.log('WebSocket server initialized');

//   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
//     const status = err.status || err.statusCode || 500;
//     const message = err.message || "Internal Server Error";

//     res.status(status).json({ message });
//     throw err;
//   });

//   // importantly only setup vite in development and after
//   // setting up all the other routes so the catch-all route
//   // doesn't interfere with the other routes
//   if (app.get("env") === "development") {
//     await setupVite(app, server);
//   } else {
//     serveStatic(app);
//   }

//   // ALWAYS serve the app on the port specified in the environment variable PORT
//   // Other ports are firewalled. Default to 5000 if not specified.
//   // this serves both the API and the client.
//   // It is the only port that is not firewalled.
//   const port = parseInt(process.env.PORT || '5050', 10);
//   server.listen({
//     port,
//     // host: "0.0.0.0",
//     host: "127.0.0.1",
//     reusePort: true,
//   }, () => {
//     log(`serving on port ${port}`);
//   });
// })();






import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ChatWebSocketServer } from "./websocket";

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "5050", 10);

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });


  next();
});

(async () => {
  // Register app routes
  await registerRoutes(app);

  // ✅ Create HTTP server manually
  const server = http.createServer(app);

  // ✅ Initialize WebSocket server on same HTTP server
  const wsServer = new ChatWebSocketServer(server);
  console.log("WebSocket server initialized");

  // Global error handler middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite dev server (only in development)
  if (app.get("env") === "development") {
    log("Setting up Vite dev server...");
    await setupVite(app, server);
  } else {
    log("Setting up static file serving for production...");
    try {
      serveStatic(app);
      log("Static file serving configured successfully");
    } catch (err: any) {
      log(`Error setting up static file serving: ${err.message}`);
      throw err;
    }
  }

server.listen(port, host, () => {
  log(`🚀 Server running at http://${host}:${port}`);
  log(`Environment: ${app.get("env")}`);
});

})();