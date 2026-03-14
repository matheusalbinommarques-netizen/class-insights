import test from 'node:test';
import assert from 'node:assert/strict';

import {
	countDecimals,
	normalizeNumericString,
	normalizeTextForMatch,
	resolveEffectiveScale,
	validateScaleConfig,
	validateScoreInput
} from './scoring.ts';

test('normalizeTextForMatch removes accents, trims and lowercases', () => {
	assert.equal(normalizeTextForMatch('  Álgebra   Básica '), 'algebra basica');
});

test('normalizeNumericString handles pt-BR and en-US formats', () => {
	assert.equal(normalizeNumericString('1.234,56'), '1234.56');
	assert.equal(normalizeNumericString('1,234.56'), '1234.56');
	assert.equal(normalizeNumericString(' 7,5 '), '7.5');
});

test('countDecimals uses normalized input', () => {
	assert.equal(countDecimals('7,50'), 2);
	assert.equal(countDecimals('10'), 0);
});

test('resolveEffectiveScale prefers skill override over class scale', () => {
	const scale = resolveEffectiveScale(
		{ score_min: 0, score_max: 10, score_decimals: 1 },
		{ score_min: 2, score_max: 8, score_decimals: 2 }
	);

	assert.deepEqual(scale, { min: 2, max: 8, decimals: 2 });
});

test('validateScaleConfig rejects invalid ranges and decimals', () => {
	assert.equal(
		validateScaleConfig({ min: 10, max: 10, decimals: 0 }),
		'Escala inválida: max precisa ser maior que min.'
	);
	assert.equal(
		validateScaleConfig({ min: 0, max: 10, decimals: 7 }),
		'Decimais inválidos (0 a 6).'
	);
});

test('validateScoreInput accepts valid score inside scale', () => {
	const result = validateScoreInput('7,5', { min: 0, max: 10, decimals: 1 });

	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.value, 7.5);
	}
});

test('validateScoreInput rejects scores outside range and with too many decimals', () => {
	const outOfRange = validateScoreInput('11', { min: 0, max: 10, decimals: 0 });
	assert.equal(outOfRange.ok, false);
	if (!outOfRange.ok) {
		assert.equal(outOfRange.message, 'Fora do range (0–10).');
	}

	const tooManyDecimals = validateScoreInput('7,555', { min: 0, max: 10, decimals: 2 });
	assert.equal(tooManyDecimals.ok, false);
	if (!tooManyDecimals.ok) {
		assert.equal(tooManyDecimals.message, 'Muitas casas decimais (máx 2).');
	}
});
