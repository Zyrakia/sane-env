import path from 'path';
import fs from 'fs';

export interface EnvLoadOptions {
    /**
     * The root path to load files from.
     * Default `process.cwd()`
     */
    root?: string;

    /**
     * The files (relative to `root`) to load and parse.
     * In Lowest -> Highest priority order.
     */
    files: string[];

    /**
     * Whether empty (`''`) or blank (`'   '`) entries are parsed as `undefined`.
     * Default `true`
     */
    emptyStringsAsUndefined?: boolean;

    /**
     * Whether to display logging messages during parsing.
     * Default `false`
     */
    debug?: boolean;
}

// https://github.com/motdotla/dotenv/blob/9d93f227bd04e1c364da31128a3606f98b321e61/lib/main.js#L46
const LINE =
    /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/gm;

/**
 * Parses environment variable declaration content into a record.
 *
 * @param content the raw declaration content
 * @param emptyStringsAsUndefined whether an empty string (after trimming) is coerced to `undefined`
 */
function parse(content: string, emptyStringsAsUndefined: boolean) {
    const normalizedContent = content.replace(/\r\n?/g, '\n');
    const result: Record<string, string> = {};

    for (const match of normalizedContent.matchAll(LINE)) {
        const key = match[1];
        let value = (match[2] || '').trim();

        if (key === undefined) continue;
        if (value === '' && emptyStringsAsUndefined) continue;

        const isDoubleQuoted = value[0] === '"';

        // https://github.com/motdotla/dotenv/blob/9d93f227bd04e1c364da31128a3606f98b321e61/lib/main.js#L72
        value = value.replace(/^(['"`])([\s\S]*)\1$/gm, '$2');

        if (isDoubleQuoted) {
            value = value.replace(/\\n/g, '\n');
            value = value.replace(/\\r/g, '\r');
        }

        result[key] = value;
    }

    return result;
}

/**
 * Reads and parses environment files into a combined
 * environment record.
 */
export function loadEnvironment(options: EnvLoadOptions) {
    const { root = process.cwd(), files, emptyStringsAsUndefined = true, debug = false } = options;

    let combinedResult: Record<string, string> = {};
    for (const filename of files) {
        const dotenvPath = path.resolve(root, filename);
        if (!fs.existsSync(dotenvPath)) {
            if (debug) console.warn(`Skipping "${filename}", file missing`);
            continue;
        }

        const content = fs.readFileSync(dotenvPath, { encoding: 'utf-8' });

        const result = parse(content, emptyStringsAsUndefined);
        combinedResult = { ...combinedResult, ...result };

        if (debug) console.log(`Loaded "${filename}" (${Object.keys(result).length})`);
    }

    return combinedResult;
}
