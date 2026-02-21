import z from 'zod';
import type { StandardSchemaV1 } from '@standard-schema/spec';

type SchemaValue = StandardSchemaV1<string | undefined, any>;
type Schema = Record<string, SchemaValue>;
type InferSchema<T extends Schema> = {
	[K in keyof T]: StandardSchemaV1.InferOutput<T[K]>;
};

export interface EnvEnvOptions<T extends Schema> {
	mode: string;
	schema: T;
}

// https://github.com/motdotla/dotenv/blob/9d93f227bd04e1c364da31128a3606f98b321e61/lib/main.js#L46
const LINE =
	/^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/gm;

export function parse(content: string) {
	const normalizedContent = content.replace(/\r\n?/g, '\n');
	const result: Record<string, string> = {};

	for (const match of normalizedContent.matchAll(LINE)) {
		const key = match[1];
		let value = (match[2] || '').trim();
		if (key === undefined) continue;

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

function loadEnvironment(mode: string) {
	const overrideOrder = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
	// TODO
}

export function createEnvironment<T extends Schema>(opts: EnvEnvOptions<T>): InferSchema<T> {
	const result = {} as InferSchema<T>;
	// TODO
	return result;
}
