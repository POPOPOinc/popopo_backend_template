import {createReactConfig} from "../eslint/eslint-base-react.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default createReactConfig(__dirname);
