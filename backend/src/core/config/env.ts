import dotenv from "dotenv";
import fs from "fs";
import path from "path";

let environmentLoaded = false;

export function loadEnvironment() {
  if (environmentLoaded) {
    return;
  }

  const cwd = process.cwd();

  const defaultEnvPath = path.resolve(cwd, ".env");
  if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath, override: false });
  }

  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  if (nodeEnv === "production") {
    const productionEnvPath = path.resolve(cwd, ".env.production");
    if (fs.existsSync(productionEnvPath)) {
      dotenv.config({ path: productionEnvPath, override: true });
    }
  }

  environmentLoaded = true;
}
