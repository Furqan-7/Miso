// Copies the unpacked extension into build/ (load it via chrome://extensions → "Load unpacked").
import { cpSync, rmSync } from "node:fs";

rmSync("build", { recursive: true, force: true });
cpSync("src", "build", { recursive: true });
console.log("extension built → apps/extension/build (Load unpacked in chrome://extensions)");
