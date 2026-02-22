import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { z } from 'zod';

import { createEnvironment } from '../src/index.ts';
import { loadEnvironment } from '../src/load.ts';

function makeTempDir() {
    return mkdtempSync(path.join(tmpdir(), 'env-env-'));
}

function writeEnvFiles(root: string, files: Record<string, string>) {
    for (const [name, content] of Object.entries(files)) {
        writeFileSync(path.join(root, name), content);
    }
}

describe('loadEnvironment', () => {
    it('loads files in order with later files overriding earlier ones', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': 'A=base\nB=base\nEMPTY=\n',
                '.env.local': 'B=local\nC=local\n',
                '.env.test': 'C=test\nD=test\n',
            });

            const loaded = loadEnvironment({
                root,
                files: ['.env', '.env.local', '.env.test'],
            });

            expect(loaded).toEqual({
                A: 'base',
                B: 'local',
                C: 'test',
                D: 'test',
            });
            expect(loaded.EMPTY).toBeUndefined();
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('keeps empty strings when emptyStringsAsUndefined is false', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': 'EMPTY=\nBLANK=   \n',
            });

            const loaded = loadEnvironment({
                root,
                files: ['.env'],
                emptyStringsAsUndefined: false,
            });

            expect(loaded).toEqual({ EMPTY: '', BLANK: '' });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('parses spaces, export prefix, and colon separator', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': '  KEY_A  =  value a  \nexport KEY_B=world\nKEY_C: colon value\n',
            });

            const loaded = loadEnvironment({ root, files: ['.env'] });
            expect(loaded).toEqual({
                KEY_A: 'value a',
                KEY_B: 'world',
                KEY_C: 'colon value',
            });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('parses keys with dots and dashes', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': 'MY.CUSTOM-KEY=works\nAPP-VERSION.0=1.0.0\n',
            });

            const loaded = loadEnvironment({ root, files: ['.env'] });
            expect(loaded).toEqual({
                'MY.CUSTOM-KEY': 'works',
                'APP-VERSION.0': '1.0.0',
            });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('handles comments and keeps hashes in quoted values', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': [
                    '# full-line comment',
                    'VISIBLE=true # inline comment',
                    'RAW=value#trimmed-at-hash',
                    "SINGLE='value # kept'",
                    'DOUBLE="value # also kept"',
                    '',
                ].join('\n'),
            });

            const loaded = loadEnvironment({ root, files: ['.env'] });
            expect(loaded).toEqual({
                VISIBLE: 'true',
                RAW: 'value',
                SINGLE: 'value # kept',
                DOUBLE: 'value # also kept',
            });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('handles single, double, and backtick quotes including multiline values', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': [
                    String.raw`SINGLE='literal \n newline'`,
                    String.raw`DOUBLE="line1\nline2\rline3"`,
                    'BACKTICK=`line1',
                    'line2`',
                    String.raw`MULTI_DOUBLE="lineA`,
                    'lineB"',
                    String.raw`MULTI_SINGLE='lineX`,
                    "lineY'",
                ].join('\n'),
            });

            const loaded = loadEnvironment({ root, files: ['.env'] });

            expect(loaded.SINGLE).toBe('literal \\n newline');
            expect(loaded.DOUBLE).toBe('line1\nline2\rline3');
            expect(loaded.BACKTICK).toBe('line1\nline2');
            expect(loaded.MULTI_DOUBLE).toBe('lineA\nlineB');
            expect(loaded.MULTI_SINGLE).toBe('lineX\nlineY');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('normalizes CRLF newlines', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': 'A=1\r\nB=2\r\n',
            });

            const loaded = loadEnvironment({ root, files: ['.env'] });
            expect(loaded).toEqual({ A: '1', B: '2' });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('ignores missing files', () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': 'A=1\n',
            });

            const loaded = loadEnvironment({
                root,
                files: ['.missing', '.env', '.also-missing'],
            });

            expect(loaded).toEqual({ A: '1' });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('createEnvironment', () => {
    it('validates and returns parsed values', () => {
        const env = createEnvironment({
            source: { NODE_ENV: 'production', PORT: '3000' },
            schema: {
                NODE_ENV: z.enum(['development', 'test', 'production']),
                PORT: z.string().transform((v) => Number(v)),
            },
        });

        expect(env).toEqual({ NODE_ENV: 'production', PORT: 3000 });
    });

    it('throws useful validation errors for invalid values', () => {
        expect(() =>
            createEnvironment({
                source: { NODE_ENV: 'staging' },
                schema: {
                    NODE_ENV: z.enum(['development', 'test', 'production']),
                },
            }),
        ).toThrow('Invalid environment variable');
    });
});

describe('config entrypoint', () => {
    const originalCwd = process.cwd();
    const originalNodeEnv = process.env.NODE_ENV;
    const originalInTestPort = process.env.INTEST_PORT;

    beforeEach(() => {
        process.chdir(originalCwd);
        process.env.NODE_ENV = originalNodeEnv;
        process.env.INTEST_PORT = originalInTestPort;
    });

    afterEach(() => {
        process.chdir(originalCwd);
        process.env.NODE_ENV = originalNodeEnv;
        process.env.INTEST_PORT = originalInTestPort;
    });

    it('loads mode dependent chain into process.env', async () => {
        const root = makeTempDir();

        try {
            writeEnvFiles(root, {
                '.env': 'INTEST_PORT=1000\n',
                '.env.local': 'INTEST_PORT=2000\n',
                '.env.test': 'INTEST_PORT=3000\n',
                '.env.test.local': 'INTEST_PORT=4000\n',
            });

            process.chdir(root);
            process.env.NODE_ENV = 'test';
            process.env.INTEST_PORT = undefined;

            await import(`../src/config/index.ts?ts=${Date.now()}`);

            expect(process.env.INTEST_PORT as string | undefined).toBe('4000');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('throws when NODE_ENV is not set', async () => {
        const root = makeTempDir();

        try {
            process.chdir(root);
            delete process.env.NODE_ENV;

            await expect(import(`../src/config/index.ts?ts=${Date.now()}`)).rejects.toThrow(
                '`NODE_ENV` must be set',
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
