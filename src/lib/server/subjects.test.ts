import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildSubjectsSchemaMessage,
	normalizeSubjectCode,
	normalizeSubjectName,
	validateClassSubjectLinkInput,
	validateSubjectInput
} from './subjects.ts';

test('normalize subject helpers format name and code', () => {
	assert.equal(normalizeSubjectName('  Matematica   Basica '), 'Matematica Basica');
	assert.equal(normalizeSubjectCode(' mat 101 '), 'MAT 101');
	assert.equal(normalizeSubjectCode('   '), null);
});

test('validateSubjectInput requires a name', () => {
	assert.equal(validateSubjectInput({ name: '  ' }).ok, false);

	const result = validateSubjectInput({ name: 'Matematica', code: 'mat' });
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.value.code, 'MAT');
	}
});

test('validateClassSubjectLinkInput requires class, subject and teacher ids', () => {
	assert.equal(
		validateClassSubjectLinkInput({
			class_id: '',
			subject_id: 'subject-1',
			teacher_id: 'teacher-1'
		}).ok,
		false
	);

	assert.equal(
		validateClassSubjectLinkInput({
			class_id: 'class-1',
			subject_id: 'subject-1',
			teacher_id: 'teacher-1'
		}).ok,
		true
	);
});

test('buildSubjectsSchemaMessage explains missing relations', () => {
	assert.match(
		buildSubjectsSchemaMessage({ code: '42P01', message: 'relation does not exist' }),
		/schema academico/i
	);
});
