const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "src");
const envFile = path.join(projectRoot, ".env");
const nodeModulesDir = path.join(projectRoot, "node_modules");
const serverEntry = path.join(srcDir, "server.ts");

let child = null;
let restartTimer = null;
let shuttingDown = false;

function log(message) {
  console.log(`[dev-runner] ${message}`);
}

function startServer() {
  child = spawn(
    process.execPath,
    ["-r", "ts-node/register", serverEntry],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_PATH: nodeModulesDir,
      },
    }
  );

  child.on("exit", (code, signal) => {
    const wasCurrent = child !== null;
    child = null;

    if (!shuttingDown && wasCurrent && signal !== "SIGTERM") {
      log(`server exited with code ${code ?? "unknown"}${signal ? ` (signal ${signal})` : ""}`);
      log("waiting for file changes before restarting");
    }
  });

  child.on("error", (error) => {
    log(`failed to start server: ${error.message}`);
  });
}

function restartServer(reason) {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    log(`change detected in ${reason}, restarting server`);

    if (!child) {
      startServer();
      return;
    }

    const currentChild = child;
    child = null;

    currentChild.once("exit", () => {
      if (!shuttingDown) {
        startServer();
      }
    });

    currentChild.kill();

    setTimeout(() => {
      if (!currentChild.killed) {
        currentChild.kill("SIGKILL");
      }
    }, 2000);
  }, 150);
}

function watchFile(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.watchFile(
    targetPath,
    { interval: 500 },
    (current, previous) => {
      if (current.mtimeMs !== previous.mtimeMs) {
        restartServer(path.relative(projectRoot, targetPath));
      }
    }
  );
}

function watchDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.watch(
    targetPath,
    { recursive: true },
    (_eventType, filename) => {
      if (!filename) {
        restartServer(path.relative(projectRoot, targetPath));
        return;
      }

      restartServer(path.join(path.relative(projectRoot, targetPath), filename.toString()));
    }
  );
}

function cleanupAndExit() {
  shuttingDown = true;
  fs.unwatchFile(envFile);

  if (!child) {
    process.exit(0);
    return;
  }

  const currentChild = child;
  child = null;

  currentChild.once("exit", () => process.exit(0));
  currentChild.kill();

  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);

watchDirectory(srcDir);
watchFile(envFile);

log("starting backend watcher");
startServer();
