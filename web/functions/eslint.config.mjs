import {createNodeConfig} from "../../eslint/eslint-base-node.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default createNodeConfig(__dirname);
