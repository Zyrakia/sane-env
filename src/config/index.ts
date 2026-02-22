import { loadEnvironment } from '../load.ts';

const mode = Reflect.get(process.env, 'NODE_ENV') as string | undefined;
if (mode === undefined) throw new Error('`NODE_ENV` must be set when injecting environment variables');

const environment = loadEnvironment({
    files: ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`],
    debug: mode === 'development',
});

for (const [key, value] of Object.entries(environment)) {
    process.env[key] = value;
}
