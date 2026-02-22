# sane-env

Mode-aware environment loading with schema validation.

## Install

```bash
bun add sane-env
```

## Usage

#### Inject layered env files into `process.env` - requires `NODE_ENV` to be set:

```ts
import 'sane-env/config';
```

Loads these files:

1. `.env`
2. `.env.local`
3. `.env.${NODE_ENV}`
4. `.env.${NODE_ENV}.local`

#### Validate a loaded environment against a schema:

```ts
import { z } from 'zod'; // Standard Schema compatible, bring your own
import { createEnvironment } from 'sane-env';

const env = createEnvironment({
    source: process.env,
    schema: {
        NODE_ENV: z.enum(['development', 'test', 'production']),
        PORT: z.coerce.number().int().positive(),
    },
});
```

#### Custom environment loading logic:

```ts
import { loadEnvironment } from 'sane-env/load';
import { createEnvironment } from 'sane-env';

const envRecord = loadEnvironment({
    // Custom loading configuration (see below)
});

const env = createEnvironment({
    source: envRecord,
    schema: { ... },
});
```

## Loading Configuration

| Property                | Description                                                | Required | Default                                          |
| ----------------------- | ---------------------------------------------------------- | -------- | ------------------------------------------------ |
| files                   | The file names to load in lowest to highest priority order | ✅       |                                                  |
| root                    | The root directory at which to load files from             | ❌       | `process.cwd()`                                  |
| emptyStringsAsUndefined | Whether blank entries are skipped in parsing               | ❌       | `true`                                           |
| debug                   | Whether to announce which files are being loaded/parsed    | ❌       | `false` (`true` with `/config` in `development`) |
