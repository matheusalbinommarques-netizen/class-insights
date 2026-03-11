import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	normalizeSkillName,
	normalizeTextForMatch,
	parseNumericInput,
	resolveEffectiveScale,
	validateScoreInput
} from '$lib/server/scoring';

type ParsedCSV = {
	headers: string[];
	rows: string[][];
	delimiter: ',' | ';' | '\t';
};

type OwnedClass = {
	id: string;
	name: string;
	score_min: number;
	score_max: number;
	score_decimals: number;
};

type OwnedImportJob = {
	id: string;
	class_id: string;
	headers: unknown;
	status: string | null;
};

type ExistingSkill = {
	id: string;
	name: string;
	score_min: number | null;
	score_max: number | null;
	score_decimals: number | null;
};

type ImportRowRecord = {
	row_index: number;
	student_name_raw: string | null;
	cells: Record<string, string> | null;
};

type ImportCellIssue = {
	job_id: string;
	row_index: number;
	column_index: number;
	column_name: string;
	message: string;
	value?: string;
};

const MAX_PREVIEW_ROWS = 20;

async function getAuthenticatedUserId(locals: App.Locals): Promise<string | null> {
	const {
		data: { user },
		error
	} = await locals.supabase.auth.getUser();

	if (error || !user) return null;
	return user.id;
}

async function getOwnedClass(
	locals: App.Locals,
	classId: string,
	userId: string
): Promise<OwnedClass | null> {
	const { data, error } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('id', classId)
		.eq('teacher_id', userId)
		.maybeSingle();

	if (error || !data) return null;

	return {
		id: data.id,
		name: data.name,
		score_min: data.score_min,
		score_max: data.score_max,
		score_decimals: data.score_decimals
	};
}

async function getOwnedImportJob(
	locals: App.Locals,
	jobId: string,
	userId: string
): Promise<OwnedImportJob | null> {
	const { data, error } = await locals.supabase
		.from('import_jobs')
		.select('id, class_id, headers, status')
		.eq('id', jobId)
		.eq('teacher_id', userId)
		.maybeSingle();

	if (error || !data) return null;

	return {
		id: data.id,
		class_id: data.class_id,
		headers: data.headers,
		status: data.status ?? null
	};
}

function detectDelimiter(line: string): ',' | ';' | '\t' {
	const comma = (line.match(/,/g) ?? []).length;
	const semi = (line.match(/;/g) ?? []).length;
	const tab = (line.match(/\t/g) ?? []).length;

	if (semi >= comma && semi >= tab) return ';';
	if (tab >= comma && tab >= semi) return '\t';
	return ',';
}

function normalizeRowLength(row: string[], targetLength: number): string[] {
	if (row.length === targetLength) return row;

	if (row.length > targetLength) {
		return row.slice(0, targetLength);
	}

	return [...row, ...Array.from({ length: targetLength - row.length }, () => '')];
}

function parseCSV(text: string): ParsedCSV {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trimEnd())
		.filter((l) => l.trim().length > 0);

	if (lines.length === 0) {
		return { headers: [], rows: [], delimiter: ',' };
	}

	const delimiter = detectDelimiter(lines[0]);

	const parseLine = (line: string): string[] => {
		const out: string[] = [];
		let cur = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const ch = line[i];

			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
				continue;
			}

			if (!inQuotes && ch === delimiter) {
				out.push(cur.trim());
				cur = '';
				continue;
			}

			cur += ch;
		}

		out.push(cur.trim());
		return out;
	};

	const headers = parseLine(lines[0]).map((h) => h.trim());
	const rows = lines
		.slice(1)
		.map(parseLine)
		.map((row) => normalizeRowLength(row, headers.length));

	return { headers, rows, delimiter };
}

function uniqueSortedNumbers(values: number[]): number[] {
	return Array.from(new Set(values)).sort((a, b) => a - b);
}

function countNonEmptyHeaders(headers: string[]): number {
	return headers.filter((h) => String(h ?? '').trim().length > 0).length;
}

async function getExistingSkillsByClass(
	locals: App.Locals,
	classId: string
): Promise<Map<string, ExistingSkill>> {
	const { data, error } = await locals.supabase
		.from('skills')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('class_id', classId);

	if (error || !data) {
		return new Map();
	}

	const byNormalizedName = new Map<string, ExistingSkill>();

	for (const skill of data) {
		const key = normalizeSkillName(skill.name);
		if (!key || byNormalizedName.has(key)) continue;

		byNormalizedName.set(key, {
			id: skill.id,
			name: skill.name,
			score_min: skill.score_min,
			score_max: skill.score_max,
			score_decimals: skill.score_decimals
		});
	}

	return byNormalizedName;
}

async function cleanupImportJob(locals: App.Locals, jobId: string, userId: string) {
	try {
		await locals.supabase.from('import_jobs').delete().eq('id', jobId).eq('teacher_id', userId);
	} catch {
		// best-effort cleanup
	}
}

function hasAnySelectedSkillValue(
	cells: Record<string, string>,
	selectedSkills: Array<{ columnIndex: number; columnName: string }>
): boolean {
	return selectedSkills.some((skill) => String(cells[skill.columnName] ?? '').trim().length > 0);
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = await getAuthenticatedUserId(locals);

	if (!userId) {
		return { classes: [] };
	}

	const { data: classes, error } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.eq('teacher_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		return { classes: [] };
	}

	return { classes: classes ?? [] };
};

export const actions: Actions = {
	preview: async ({ request, locals }) => {
		const form = await request.formData();

		const file = form.get('file');
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) {
			return fail(400, { message: 'Selecione uma turma antes de gerar preview.' });
		}

		if (!(file instanceof File)) {
			return fail(400, { message: 'Selecione um arquivo .csv.' });
		}

		if (file.size === 0) {
			return fail(400, { message: 'O arquivo enviado está vazio.' });
		}

		const userId = await getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const ownedClass = await getOwnedClass(locals, classId, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const text = await file.text();
		const parsed = parseCSV(text);

		if (countNonEmptyHeaders(parsed.headers) < 2) {
			return fail(400, {
				message: 'CSV inválido. Precisa ter cabeçalho e pelo menos 2 colunas úteis.'
			});
		}

		if (parsed.rows.length === 0) {
			return fail(400, { message: 'CSV sem linhas de dados.' });
		}

		const guessIndex = parsed.headers.findIndex((h) => /aluno|student|nome/i.test(h));
		const studentGuess = guessIndex >= 0 ? guessIndex : 0;

		const { data: job, error: jobErr } = await locals.supabase
			.from('import_jobs')
			.insert({
				class_id: ownedClass.id,
				teacher_id: userId,
				status: 'uploaded',
				delimiter: parsed.delimiter,
				headers: parsed.headers,
				rows_total: parsed.rows.length
			})
			.select('id')
			.single();

		if (jobErr || !job) {
			return fail(400, { message: jobErr?.message ?? 'Erro ao criar job.' });
		}

		let skippedNoStudent = 0;

		const staged = parsed.rows.map((r, idx) => {
			const studentName = String(r[studentGuess] ?? '').trim();
			if (!studentName) skippedNoStudent++;

			const cells: Record<string, string> = {};

			for (let i = 0; i < parsed.headers.length; i++) {
				if (i === studentGuess) continue;

				const header = String(parsed.headers[i] ?? '').trim();
				if (!header) continue;

				cells[header] = String(r[i] ?? '').trim();
			}

			return {
				job_id: job.id,
				row_index: idx + 1,
				student_name_raw: studentName,
				cells
			};
		});

		const { error: rowsErr } = await locals.supabase.from('import_rows').insert(staged);
		if (rowsErr) {
			await cleanupImportJob(locals, job.id, userId);
			return fail(400, { message: rowsErr.message });
		}

		const { error: updErr } = await locals.supabase
			.from('import_jobs')
			.update({ rows_skipped_no_student: skippedNoStudent })
			.eq('id', job.id)
			.eq('teacher_id', userId);

		if (updErr) {
			return fail(400, { message: updErr.message });
		}

		const preview = parsed.rows.slice(0, MAX_PREVIEW_ROWS);

		return {
			success: true,
			jobId: job.id,
			headers: parsed.headers,
			preview,
			studentGuess,
			delimiter: parsed.delimiter
		};
	},

	validate: async ({ request, locals }) => {
		const form = await request.formData();

		const jobId = String(form.get('jobId') ?? '').trim();
		const studentColIndex = Number(String(form.get('studentColIndex') ?? '0'));

		const skillColIndices = uniqueSortedNumbers(
			form
				.getAll('skillColIndex')
				.map((v) => Number(String(v)))
				.filter((n) => !Number.isNaN(n))
		);

		if (!jobId) {
			return fail(400, { message: 'jobId ausente. Gere o preview novamente.' });
		}

		if (!Number.isInteger(studentColIndex)) {
			return fail(400, { message: 'Coluna do aluno inválida.' });
		}

		if (skillColIndices.length === 0) {
			return fail(400, { message: 'Selecione pelo menos 1 coluna de skill.' });
		}

		const userId = await getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const job = await getOwnedImportJob(locals, jobId, userId);
		if (!job) {
			return fail(404, { message: 'Job não encontrado.' });
		}

		const ownedClass = await getOwnedClass(locals, job.class_id, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const headers = Array.isArray(job.headers) ? (job.headers as string[]) : [];
		if (headers.length === 0) {
			return fail(400, { message: 'Job sem headers.' });
		}

		if (studentColIndex < 0 || studentColIndex >= headers.length) {
			return fail(400, { message: 'Coluna de aluno fora do range.' });
		}

		const selectedSkillCols = skillColIndices.filter(
			(i) => i >= 0 && i < headers.length && i !== studentColIndex
		);

		if (selectedSkillCols.length === 0) {
			return fail(400, { message: 'Seleção de skills inválida.' });
		}

		const { error: mapErr } = await locals.supabase.from('import_column_map').upsert({
			job_id: jobId,
			student_col_index: studentColIndex,
			skill_col_indices: selectedSkillCols,
			updated_at: new Date().toISOString()
		});

		if (mapErr) {
			return fail(400, { message: mapErr.message });
		}

		const { error: delErr } = await locals.supabase
			.from('import_cell_errors')
			.delete()
			.eq('job_id', jobId);

		if (delErr) {
			return fail(400, { message: delErr.message });
		}

		const { data: rows, error: rowsErr } = await locals.supabase
			.from('import_rows')
			.select('row_index, student_name_raw, cells')
			.eq('job_id', jobId)
			.order('row_index', { ascending: true });

		if (rowsErr) {
			return fail(400, { message: rowsErr.message });
		}

		const existingSkillsByName = await getExistingSkillsByClass(locals, ownedClass.id);

		const selectedSkills = selectedSkillCols.map((columnIndex) => ({
			columnIndex,
			columnName: String(headers[columnIndex] ?? '').trim()
		}));

		const errors: ImportCellIssue[] = [];
		const warnings: ImportCellIssue[] = [];

		const emptySkillHeaders = selectedSkills.filter((s) => !s.columnName);

		for (const skill of emptySkillHeaders) {
			errors.push({
				job_id: jobId,
				row_index: 0,
				column_index: skill.columnIndex,
				column_name: '(header)',
				message: 'Cabeçalho de skill vazio.',
				value: ''
			});
		}

		const seenHeaders = new Map<string, number>();
		for (const skill of selectedSkills) {
			const key = normalizeSkillName(skill.columnName);
			if (!key) continue;

			if (seenHeaders.has(key)) {
				errors.push({
					job_id: jobId,
					row_index: 0,
					column_index: skill.columnIndex,
					column_name: skill.columnName,
					message: 'Coluna de skill duplicada (mesmo nome).',
					value: skill.columnName
				});
			} else {
				seenHeaders.set(key, skill.columnIndex);
			}

			if (!existingSkillsByName.has(key)) {
				warnings.push({
					job_id: jobId,
					row_index: 0,
					column_index: skill.columnIndex,
					column_name: skill.columnName,
					message: 'Skill nova: será criada automaticamente no apply.',
					value: skill.columnName
				});
			}
		}

		const seenStudents = new Map<string, number[]>();

		for (const r of (rows ?? []) as ImportRowRecord[]) {
			const rowIndex = r.row_index;
			const studentName = String(r.student_name_raw ?? '').trim();

			if (!studentName) {
				errors.push({
					job_id: jobId,
					row_index: rowIndex,
					column_index: studentColIndex,
					column_name: headers[studentColIndex] ?? '(aluno)',
					message: 'Aluno vazio.',
					value: ''
				});
				continue;
			}

			const normalizedStudent = normalizeTextForMatch(studentName);
			if (normalizedStudent) {
				const existing = seenStudents.get(normalizedStudent) ?? [];
				existing.push(rowIndex);
				seenStudents.set(normalizedStudent, existing);
			}

			const cells = (r.cells ?? {}) as Record<string, string>;

			if (!hasAnySelectedSkillValue(cells, selectedSkills)) {
				warnings.push({
					job_id: jobId,
					row_index: rowIndex,
					column_index: studentColIndex,
					column_name: headers[studentColIndex] ?? '(aluno)',
					message: 'Linha sem nenhuma nota preenchida nas skills selecionadas.',
					value: studentName
				});
			}

			for (const skill of selectedSkills) {
				if (!skill.columnName) continue;

				const raw = String(cells[skill.columnName] ?? '').trim();
				if (!raw) continue;

				const normalizedSkillName = normalizeSkillName(skill.columnName);
				const existingSkill = existingSkillsByName.get(normalizedSkillName) ?? null;
				const scale = resolveEffectiveScale(ownedClass, existingSkill);

				const validation = validateScoreInput(raw, scale, {
					allowBlank: true
				});

				if (!validation.ok) {
					const maybeNumeric = parseNumericInput(raw);

					errors.push({
						job_id: jobId,
						row_index: rowIndex,
						column_index: skill.columnIndex,
						column_name: skill.columnName,
						message:
							maybeNumeric === null ? 'Nota inválida (não numérica).' : validation.message,
						value: raw
					});
				}
			}
		}

		for (const [studentNameKey, rowIndexes] of seenStudents.entries()) {
			if (rowIndexes.length > 1) {
				for (const rowIndex of rowIndexes) {
					warnings.push({
						job_id: jobId,
						row_index: rowIndex,
						column_index: studentColIndex,
						column_name: headers[studentColIndex] ?? '(aluno)',
						message: 'Aluno repetido no mesmo CSV. Verifique se deve consolidar ou manter linhas separadas.',
						value: studentNameKey
					});
				}
			}
		}

		if (errors.length > 0) {
			const { error: insErr } = await locals.supabase.from('import_cell_errors').insert(errors);
			if (insErr) {
				return fail(400, { message: insErr.message });
			}

			const { error: stErr } = await locals.supabase
				.from('import_jobs')
				.update({ status: 'uploaded' })
				.eq('id', jobId)
				.eq('teacher_id', userId);

			if (stErr) {
				return fail(400, { message: stErr.message });
			}

			return {
				success: false,
				jobId,
				scale: {
					min: ownedClass.score_min,
					max: ownedClass.score_max,
					decimals: ownedClass.score_decimals
				},
				statsPreview: {
					rowsTotal: rows?.length ?? 0,
					errors: errors.length,
					warnings: warnings.length
				},
				errors,
				warnings
			};
		}

		const { error: okErr } = await locals.supabase
			.from('import_jobs')
			.update({ status: 'validated' })
			.eq('id', jobId)
			.eq('teacher_id', userId);

		if (okErr) {
			return fail(400, { message: okErr.message });
		}

		return {
			success: true,
			jobId,
			scale: {
				min: ownedClass.score_min,
				max: ownedClass.score_max,
				decimals: ownedClass.score_decimals
			},
			statsPreview: {
				rowsTotal: rows?.length ?? 0,
				errors: 0,
				warnings: warnings.length
			},
			errors: [],
			warnings
		};
	},

	apply: async ({ request, locals }) => {
		const form = await request.formData();
		const jobId = String(form.get('jobId') ?? '').trim();

		if (!jobId) {
			return fail(400, { message: 'jobId ausente.' });
		}

		const userId = await getAuthenticatedUserId(locals);
		if (!userId) {
			return fail(401, { message: 'Você precisa estar logado.' });
		}

		const job = await getOwnedImportJob(locals, jobId, userId);
		if (!job) {
			return fail(404, { message: 'Job não encontrado.' });
		}

		if (job.status !== 'validated') {
			return fail(400, { message: 'O job precisa estar validado antes de aplicar.' });
		}

		const ownedClass = await getOwnedClass(locals, job.class_id, userId);
		if (!ownedClass) {
			return fail(404, { message: 'Turma não encontrada.' });
		}

		const { data, error } = await locals.supabase.rpc('apply_import_job', {
			p_job_id: jobId
		});

		if (error) {
			return fail(400, { message: error.message });
		}

		return {
			success: true,
			applied: data
		};
	}
};