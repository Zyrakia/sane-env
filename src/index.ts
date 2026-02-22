import type { StandardSchemaV1 } from '@standard-schema/spec';

type Environment = Record<string, string | undefined>;

type SchemaValue = StandardSchemaV1<string | undefined, any>;
type Schema = Record<string, SchemaValue>;
type InferSchema<T extends Schema> = {
    [K in keyof T]: StandardSchemaV1.InferOutput<T[K]>;
};

export interface EnvCreateOptions<T extends Schema> {
    /**
     * The raw environment values to compare against the schema.
     */
    source: Environment;

    /**
     * The schema defining which variables to pull and
     * validate from the environment source.
     */
    schema: T;
}

function throwValidationError(
    envKey: string,
    parsedValue: any,
    issues: readonly StandardSchemaV1.Issue[],
): never {
    console.error(`Invalid environment variable:
Key: ${envKey}
Parsed Value: ${parsedValue}
Message: ${issues[0]?.message}`);
    process.exit(1);
}

function resolveSchema<T extends SchemaValue>(standard: T) {
    return standard['~standard'];
}

/**
 * Given a schema and environment, validate a single key and
 * return the output value.
 */
function validateEnvironmentValue<T extends Schema, K extends keyof T>(
    schema: T,
    environment: Environment,
    key: K,
) {
    const standard = resolveSchema(schema[key]);

    const envKey = String(key);
    const envValue = environment[envKey];

    const result = standard.validate(envValue);
    if (result instanceof Promise) {
        throw new Error(`Validation of key "${envKey}" is not synchronous`);
    }

    if (result.issues) {
        throwValidationError(envKey, envValue, result.issues);
    }

    return result.value as StandardSchemaV1.InferOutput<T[K]>;
}

/**
 * Ensures an environment record matches a schema and returns the
 * validated result.
 */
export function createEnvironment<T extends Schema>(opts: EnvCreateOptions<T>): InferSchema<T> {
    const { schema, source } = opts;
    const result = {} as InferSchema<T>;

    for (const key in opts.schema) {
        const value = validateEnvironmentValue(schema, source, key);
        result[key] = value;
    }

    return result;
}
