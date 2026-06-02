import fsPkg from "fs-extra";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

const { existsSync, remove, copy } = fsPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This script copies the whisper.cpp directory (including models) to the Tauri target dir.
// This is needed because:
// - Tauri needs to access the models at runtime, so they must be in the target dir.
// - We don't want to include the large models in the npm package, so we keep them out of src.
const SRC = resolve(__dirname, "..", "whisper.cpp");
const DEST_BASE = resolve(__dirname, "..", "src-tauri", "target");
const MODE = process.argv[2] === "release" ? "release" : "debug";
const DEST = join(DEST_BASE, MODE, "whisper.cpp");

async function main() {
    try {
        // if source doesn't exist, abort with error
        if (!existsSync(SRC)) {
            console.error(`Source not found: ${SRC}`);
            process.exit(2);
        }

        // always copy the executable, since it's small and may be updated
        await copy(join(SRC, "whisper-cli.exe"), join(DEST, "whisper-cli.exe"), {
            overwrite: true,
        });

        // if dest already has models, assume it's already copied and skip
        const destModels = join(DEST, "models");
        if (!existsSync(destModels)) {
            await copy(join(SRC, "models"), destModels, { overwrite: true, recursive: true });
            console.log("Copied models");
        } else {
            console.log("Skipping models copy: already exists");
        }

        // remove dest if it exists, then copy src to dest
        await remove(DEST);
        await copy(SRC, DEST, { overwrite: true, recursive: true });
        console.log(`Copied ${SRC} -> ${DEST}`);
    } catch (err) {
        console.error("Copy failed:", err);
        process.exit(1);
    }
}

main();
