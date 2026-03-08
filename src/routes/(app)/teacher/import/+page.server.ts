import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

type ParsedCSV = {
	headers: string[];
	rows: string[][];
	delimiter: ',' | ';' | '\t';
};

function detectDelimiter(line: string): ',' | ';' | '\t' {
	const comma = (line.match(/,/g) ?? []).length;
	const semi = (line.match(/;/g) ?? []).length;
	const tab = (line.match(/\t/g) ?? []).length;
	if (semi >= comma && semi >= tab) return ';';
	if (tab >= comma && tab >= semi) return '\t';
	return ',';
}

// CSV parser simples com suporte a aspas ("") e delimitador variável
function parseCSV(text: string): ParsedCSV {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trimEnd())
		.filter((l) => l.trim().length > 0);

	if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' };

	const delimiter = detectDelimiter(lines[0]);

	const parseLine = (line: string): string[] => {
		const out: string[] = [];
		let cur = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const ch = line[i];

			if (ch === '"') {
				// escape "" dentro de aspas
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
	const rows = lines.slice(1).map(parseLine);

	return { headers, rows, delimiter };
}

function toNumberMaybe(raw: string): number | null {
	const v = String(raw ?? '').trim();
	if (!v) return null;
	const n = Number(v.replace(',', '.'));
	return Number.isNaN(n) ? null : n;
}

function countDecimals(raw: string): number {
	const v = String(raw ?? '').trim().replace(',', '.');
	const idx = v.indexOf('.');
	return idx === -1 ? 0 : v.length - idx - 1;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { data: classes, error } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.order('created_at', { ascending: false });

	if (error) return { classes: [] };
	return { classes: classes ?? [] };
};

export const actions: Actions = {
	// 1) Upload + Preview => CRIA JOB + STAGE ROWS (não aplica nada)
	preview: async ({ request, locals }) => {
		const form = await request.formData();

		const file = form.get('file');
		const classId = String(form.get('classId') ?? '').trim();

		if (!classId) return fail(400, { message: 'Selecione uma turma antes de gerar preview.' });
		if (!(file instanceof File)) return fail(400, { message: 'Selecione um arquivo .csv.' });

		const { data: auth } = await locals.supabase.auth.getUser();
		const userId = auth.user?.id;
		if (!userId) return fail(401, { message: 'Você precisa estar logado.' });

		const text = await file.text();
		const parsed = parseCSV(text);

		if (parsed.headers.length < 2) {
			return fail(400, {
				message: 'CSV inválido. Precisa ter cabeçalho e pelo menos 2 colunas (Aluno + Skill).'
			});
		}

		// sugestão: tenta achar coluna de aluno
		const guessIndex = parsed.headers.findIndex((h) => /aluno|student|nome/i.test(h));
		const studentGuess = guessIndex >= 0 ? guessIndex : 0;

		// cria job
		const { data: job, error: jobErr } = await locals.supabase
			.from('import_jobs')
			.insert({
				class_id: classId,
				teacher_id: userId,
				status: 'uploaded',
				delimiter: parsed.delimiter,
				headers: parsed.headers,
				rows_total: parsed.rows.length
			})
			.select('id')
			.single();

		if (jobErr || !job) return fail(400, { message: jobErr?.message ?? 'Erro ao criar job.' });

		// stage rows
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
		if (rowsErr) return fail(400, { message: rowsErr.message });

		// salva skipped (info)
		const { error: updErr } = await locals.supabase
			.from('import_jobs')
			.update({ rows_skipped_no_student: skippedNoStudent })
			.eq('id', job.id);

		if (updErr) return fail(400, { message: updErr.message });

		const preview = parsed.rows.slice(0, 20);

		return {
			success: true,
			jobId: job.id,
			headers: parsed.headers,
			preview,
			studentGuess,
			delimiter: parsed.delimiter
		};
	},

	// 2) Validate => grava map + gera erros (preflight 100%)
	validate: async ({ request, locals }) => {
		const form = await request.formData();

		const jobId = String(form.get('jobId') ?? '').trim();
		const studentColIndex = Number(String(form.get('studentColIndex') ?? '0'));

		const skillColIndices = form
			.getAll('skillColIndex')
			.map((v) => Number(String(v)))
			.filter((n) => !Number.isNaN(n));

		if (!jobId) return fail(400, { message: 'jobId ausente. Gere o preview novamente.' });
		if (Number.isNaN(studentColIndex)) return fail(400, { message: 'Coluna do aluno inválida.' });
		if (skillColIndices.length === 0) return fail(400, { message: 'Selecione pelo menos 1 coluna de skill.' });

		// pega job + headers + turma
		const { data: job, error: jobErr } = await locals.supabase
			.from('import_jobs')
			.select('id, class_id, headers')
			.eq('id', jobId)
			.single();

		if (jobErr || !job) return fail(400, { message: jobErr?.message ?? 'Job não encontrado.' });

		const headers = (job.headers ?? []) as string[];
		if (headers.length === 0) return fail(400, { message: 'Job sem headers.' });

		if (studentColIndex < 0 || studentColIndex >= headers.length) {
			return fail(400, { message: 'Coluna de aluno fora do range.' });
		}

		const selectedSkillCols = skillColIndices.filter(
			(i) => i >= 0 && i < headers.length && i !== studentColIndex
		);

		if (selectedSkillCols.length === 0) return fail(400, { message: 'Seleção de skills inválida.' });

		// grava map
		const { error: mapErr } = await locals.supabase.from('import_column_map').upsert({
			job_id: jobId,
			student_col_index: studentColIndex,
			skill_col_indices: selectedSkillCols,
			updated_at: new Date().toISOString()
		});

		if (mapErr) return fail(400, { message: mapErr.message });

		// zera erros anteriores
		const { error: delErr } = await locals.supabase.from('import_cell_errors').delete().eq('job_id', jobId);
		if (delErr) return fail(400, { message: delErr.message });

		// escala da turma (MVP: valida pelo default da turma; skill override entra no M3)
		const { data: cls, error: clsErr } = await locals.supabase
			.from('classes')
			.select('score_min, score_max, score_decimals')
			.eq('id', job.class_id)
			.single();

		if (clsErr || !cls) return fail(400, { message: clsErr?.message ?? 'Turma não encontrada.' });

		const scale = { min: cls.score_min, max: cls.score_max, decimals: cls.score_decimals };

		// lê rows do staging
		const { data: rows, error: rowsErr } = await locals.supabase
			.from('import_rows')
			.select('row_index, student_name_raw, cells')
			.eq('job_id', jobId)
			.order('row_index', { ascending: true });

		if (rowsErr) return fail(400, { message: rowsErr.message });

		// skills selecionadas (nomes)
		const skillHeaders = selectedSkillCols.map((i) => String(headers[i] ?? '').trim());

		const errors: {
			job_id: string;
			row_index: number;
			column_index: number;
			column_name: string;
			message: string;
			value?: string;
		}[] = [];

		// header vazio nas skills selecionadas
		const emptySkillHeaders = skillHeaders
			.map((h, idx) => ({ h, idx }))
			.filter((x) => !x.h);

		for (const e of emptySkillHeaders) {
			errors.push({
				job_id: jobId,
				row_index: 0,
				column_index: selectedSkillCols[e.idx],
				column_name: '(header)',
				message: 'Cabeçalho de skill vazio.',
				value: ''
			});
		}

		// duplicadas por nome (case-insensitive)
		const normalized = skillHeaders.map((h) => h.toLowerCase());
		const seen = new Map<string, number>();
		for (let i = 0; i < normalized.length; i++) {
			const key = normalized[i];
			if (!key) continue;

			if (seen.has(key)) {
				errors.push({
					job_id: jobId,
					row_index: 0,
					column_index: selectedSkillCols[i],
					column_name: skillHeaders[i],
					message: 'Coluna de skill duplicada (mesmo nome).',
					value: skillHeaders[i]
				});
			} else {
				seen.set(key, i);
			}
		}

		// valida linha a linha
		for (const r of rows ?? []) {
			const rowIndex = r.row_index as number;
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

			const cells = (r.cells ?? {}) as Record<string, string>;

			for (const skillName of skillHeaders) {
				if (!skillName) continue;

				const raw = String(cells[skillName] ?? '').trim();
				if (!raw) continue; // vazio = ok (não cria score)

				const n = toNumberMaybe(raw);
				if (n === null) {
					errors.push({
						job_id: jobId,
						row_index: rowIndex,
						column_index: headers.indexOf(skillName),
						column_name: skillName,
						message: 'Nota inválida (não numérica).',
						value: raw
					});
					continue;
				}

				if (n < scale.min || n > scale.max) {
					errors.push({
						job_id: jobId,
						row_index: rowIndex,
						column_index: headers.indexOf(skillName),
						column_name: skillName,
						message: `Fora do range (${scale.min}–${scale.max}).`,
						value: raw
					});
				}

				if (countDecimals(raw) > Number(scale.decimals ?? 0)) {
					errors.push({
						job_id: jobId,
						row_index: rowIndex,
						column_index: headers.indexOf(skillName),
						column_name: skillName,
						message: `Muitas casas decimais (máx ${scale.decimals}).`,
						value: raw
					});
				}
			}
		}

		// se tem erro, grava e bloqueia
		if (errors.length > 0) {
			const { error: insErr } = await locals.supabase.from('import_cell_errors').insert(errors);
			if (insErr) return fail(400, { message: insErr.message });

			// mantém status uploaded (não validated)
			const { error: stErr } = await locals.supabase
				.from('import_jobs')
				.update({ status: 'uploaded' })
				.eq('id', jobId);

			if (stErr) return fail(400, { message: stErr.message });

			return {
				success: false,
				jobId,
				scale,
				statsPreview: { rowsTotal: rows?.length ?? 0, errors: errors.length },
				errors
			};
		}

		// sem erros => validated
		const { error: okErr } = await locals.supabase
			.from('import_jobs')
			.update({ status: 'validated' })
			.eq('id', jobId);

		if (okErr) return fail(400, { message: okErr.message });

		return {
			success: true,
			jobId,
			scale,
			statsPreview: { rowsTotal: rows?.length ?? 0, errors: 0 },
			errors: []
		};
	},

	// 3) Apply => chama RPC (atômico)
	apply: async ({ request, locals }) => {
		const form = await request.formData();
		const jobId = String(form.get('jobId') ?? '').trim();
		if (!jobId) return fail(400, { message: 'jobId ausente.' });

		const { data, error } = await locals.supabase.rpc('apply_import_job', { p_job_id: jobId });
		if (error) return fail(400, { message: error.message });

		return { success: true, applied: data };
	}
};