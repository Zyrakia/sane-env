import { describe, it, expect } from 'bun:test';
import { parse } from '../src/index.ts';

describe('parser', () => {
	it('parses basic key-value pairs', () => {
		const parsed = parse('BASIC=value\nNUMBER=123\nEMPTY=');
		expect(parsed).toEqual({
			BASIC: 'value',
			NUMBER: '123',
			EMPTY: '',
		});
	});

	it('handles spaces around keys and values', () => {
		const parsed = parse('  SPACED_KEY  =  spaced value  \nTRIMMED= trimmed');
		expect(parsed).toEqual({
			SPACED_KEY: 'spaced value',
			TRIMMED: 'trimmed',
		});
	});

	it('allows keys with dots and dashes', () => {
		const parsed = parse('MY.CUSTOM-KEY=works\nAPP-VERSION.0=1.0.0');
		expect(parsed).toEqual({
			'MY.CUSTOM-KEY': 'works',
			'APP-VERSION.0': '1.0.0',
		});
	});

	it('strips export prefixes', () => {
		const parsed = parse('export PREFIXED=hello\n  export   PADDED=world');
		expect(parsed).toEqual({
			PREFIXED: 'hello',
			PADDED: 'world',
		});
	});

	it('supports the colon separator instead of equals', () => {
		const parsed = parse('COLON: value\nexport DB_HOST: localhost');
		expect(parsed).toEqual({
			COLON: 'value',
			DB_HOST: 'localhost',
		});
	});

	it('ignores full-line and inline comments', () => {
		const parsed = parse(`
      # This is a full line comment
      VALID=true # This is an inline comment
      ANOTHER=value#Without spaces
      # IGNORE_ME=true
    `);
		expect(parsed).toEqual({
			VALID: 'true',
			ANOTHER: 'value',
		});
	});

	it('respects single quotes (no expansion)', () => {
		const parsed = parse(`
      SINGLE_QUOTES='literal \\n newline'
      SINGLE_HASH='value # with hash'
    `);
		expect(parsed).toEqual({
			SINGLE_QUOTES: 'literal \\n newline',
			SINGLE_HASH: 'value # with hash',
		});
	});

	it('respects double quotes (expands newlines)', () => {
		const parsed = parse(`
      DOUBLE_QUOTES="line1\\nline2"
      DOUBLE_HASH="value # with hash"
      ESCAPED_QUOTE="she said \\"hello\\""
    `);
		expect(parsed).toEqual({
			DOUBLE_QUOTES: 'line1\nline2',
			DOUBLE_HASH: 'value # with hash',
			ESCAPED_QUOTE: 'she said \\"hello\\"',
		});
	});

	it('respects backticks (multiline support without expansion)', () => {
		const parsed = parse(`
      BACKTICKS=\`literal \\n newline\`
      BACKTICK_MULTILINE=\`line1
line2\`
    `);
		expect(parsed).toEqual({
			BACKTICKS: 'literal \\n newline',
			BACKTICK_MULTILINE: 'line1\nline2',
		});
	});

	it('handles literal multiline values inside quotes', () => {
		const parsed = parse(`
      MULTI_DOUBLE="line1
line2"
      MULTI_SINGLE='line3
line4'
    `);
		expect(parsed).toEqual({
			MULTI_DOUBLE: 'line1\nline2',
			MULTI_SINGLE: 'line3\nline4',
		});
	});

	it('skips empty lines gracefully', () => {
		const parsed = parse('\n\nKEY=value\n\n\nNEXT=value2\n');
		expect(parsed).toEqual({
			KEY: 'value',
			NEXT: 'value2',
		});
	});
});
