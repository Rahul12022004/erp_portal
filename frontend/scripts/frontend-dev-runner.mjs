import { createLogger, createServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const smokeTest = process.argv.includes("--smoke-test");

async function start() {
  const logger = createLogger();
  const originalWarn = logger.warn;
  logger.warn = (message, options) => {
    if (typeof message === "string" && message.includes("Failed to resolve dependency: react/jsx-dev-runtime")) {
      return;
    }

    originalWarn(message, options);
  };

  const server = await createServer({
    root: rootDir,
    configFile: false,
    mode: "development",
    customLogger: logger,
    plugins: [react(), componentTagger()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
    server: {
      host: "::",
      port: 8081,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      minify: false,
      target: "esnext",
    },
  });

  const closeServer = async () => {
    await server.close();
  };

  process.on("SIGINT", () => {
    void closeServer().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void closeServer().finally(() => process.exit(0));
  });

  await server.listen();
  server.printUrls();
  console.log("Frontend dev runner started.");

  if (smokeTest) {
    setTimeout(() => {
      void closeServer().finally(() => process.exit(0));
    }, 2000);
  }
}

start().catch((error) => {
  console.error("Frontend dev runner failed:", error);
  process.exit(1);
});
