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

export const load: PageServerLoad = async ({ locals }) => {
	const { data: classes, error } = await locals.supabase
		.from('classes')
		.select('id, name, score_min, score_max, score_decimals')
		.order('created_at', { ascending: false });

	if (error) return { classes: [] };

	return { classes: classes ?? [] };
};

export const actions: Actions = {
	preview: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('file');

		if (!(file instanceof File)) {
			return fail(400, { message: 'Selecione um arquivo .csv.' });
		}

		const text = await file.text();
		const parsed = parseCSV(text);

		if (parsed.headers.length < 2) {
			return fail(400, {
				message: 'CSV inválido. Precisa ter cabeçalho e pelo menos 2 colunas (Aluno + Skill).'
			});
		}

		const previewRows = parsed.rows.slice(0, 20);

		// sugestão: tenta achar coluna de aluno
		const guessIndex = parsed.headers.findIndex((h) => /aluno|student|nome/i.test(h));

		return {
			success: true,
			headers: parsed.headers,
			preview: previewRows,
			studentGuess: guessIndex >= 0 ? guessIndex : 0,
			delimiter: parsed.delimiter
		};
	},

	apply: async ({ request, locals }) => {
		const form = await request.formData();

		const file = form.get('file');
		const classId = String(form.get('classId') ?? '').trim();
		const studentColIndex = Number(String(form.get('studentColIndex') ?? '0'));

		const skillColIndices = form
			.getAll('skillColIndex')
			.map((v) => Number(String(v)))
			.filter((n) => !Number.isNaN(n));

		if (!(file instanceof File)) return fail(400, { message: 'Selecione o CSV novamente para aplicar.' });
		if (!classId) return fail(400, { message: 'Selecione uma turma.' });
		if (Number.isNaN(studentColIndex)) return fail(400, { message: 'Coluna de aluno inválida.' });
		if (skillColIndices.length === 0)
			return fail(400, { message: 'Selecione pelo menos 1 coluna de skill.' });

		const text = await file.text();
		const parsed = parseCSV(text);

		if (parsed.headers.length === 0) return fail(400, { message: 'CSV vazio.' });
		if (studentColIndex < 0 || studentColIndex >= parsed.headers.length) {
			return fail(400, { message: 'Coluna de aluno fora do range.' });
		}

		const selectedSkillCols = skillColIndices.filter(
			(i) => i >= 0 && i < parsed.headers.length && i !== studentColIndex
		);

		if (selectedSkillCols.length === 0)
			return fail(400, { message: 'Seleção de skills inválida.' });

		const skillNames = selectedSkillCols.map((i) => parsed.headers[i].trim()).filter(Boolean);
		if (skillNames.length === 0) return fail(400, { message: 'Cabeçalhos de skills vazios.' });

		const rows = parsed.rows;

		const rawStudents: string[] = [];
		type ScoreCell = { studentName: string; skillName: string; score: number };
		const scoreCells: ScoreCell[] = [];

		let skippedRows = 0;

		for (const r of rows) {
			const studentName = String(r[studentColIndex] ?? '').trim();
			if (!studentName) {
				skippedRows++;
				continue;
			}

			rawStudents.push(studentName);

			for (const colIndex of selectedSkillCols) {
				const skillName = String(parsed.headers[colIndex] ?? '').trim();
				if (!skillName) continue;

				const scoreRaw = String(r[colIndex] ?? '').trim();
				const score = toNumberMaybe(scoreRaw);

				if (score === null) continue; // vazio, pula
				scoreCells.push({ studentName, skillName, score });
			}
		}

		const uniqueStudentNames = Array.from(new Set(rawStudents.map((s) => s.trim()))).filter(Boolean);
		const uniqueSkillNames = Array.from(new Set(skillNames.map((s) => s.trim()))).filter(Boolean);

		// students existentes da turma
		const { data: existingStudents, error: studentsErr } = await locals.supabase
			.from('students')
			.select('id, name')
			.eq('class_id', classId);

		if (studentsErr) return fail(400, { message: studentsErr.message });

		const studentMap = new Map<string, string>();
		for (const st of existingStudents ?? []) studentMap.set(st.name, st.id);

		// inserir students faltantes
		const missingStudents = uniqueStudentNames.filter((name) => !studentMap.has(name));
		let createdStudents = 0;

		if (missingStudents.length > 0) {
			const { data: inserted, error } = await locals.supabase
				.from('students')
				.insert(missingStudents.map((name) => ({ name, class_id: classId })))
				.select('id, name');

			if (error) return fail(400, { message: error.message });

			for (const st of inserted ?? []) studentMap.set(st.name, st.id);
			createdStudents = inserted?.length ?? 0;
		}

		// skills existentes da turma
		const { data: existingSkills, error: skillsErr } = await locals.supabase
			.from('skills')
			.select('id, name')
			.eq('class_id', classId);

		if (skillsErr) return fail(400, { message: skillsErr.message });

		const skillMap = new Map<string, string>();
		for (const sk of existingSkills ?? []) skillMap.set(sk.name, sk.id);

		// inserir skills faltantes
		const missingSkills = uniqueSkillNames.filter((name) => !skillMap.has(name));
		let createdSkills = 0;

		if (missingSkills.length > 0) {
			const { data: inserted, error } = await locals.supabase
				.from('skills')
				.insert(missingSkills.map((name) => ({ name, class_id: classId })))
				.select('id, name');

			if (error) return fail(400, { message: error.message });

			for (const sk of inserted ?? []) skillMap.set(sk.name, sk.id);
			createdSkills = inserted?.length ?? 0;
		}

		// payload de upsert
		const upserts = scoreCells
			.map((cell) => {
				const studentId = studentMap.get(cell.studentName);
				const skillId = skillMap.get(cell.skillName);
				if (!studentId || !skillId) return null;

				return { student_id: studentId, skill_id: skillId, score: cell.score };
			})
			.filter(Boolean) as { student_id: string; skill_id: string; score: number }[];

		// chunk para evitar payload gigante
		const chunkSize = 500;
		let upserted = 0;

		for (let i = 0; i < upserts.length; i += chunkSize) {
			const chunk = upserts.slice(i, i + chunkSize);

			const { error } = await locals.supabase
				.from('student_skill_scores')
				.upsert(chunk, { onConflict: 'student_id,skill_id' });

			if (error) return fail(400, { message: error.message });

			upserted += chunk.length;
		}

		return {
			success: true,
			stats: {
				rowsTotal: rows.length,
				rowsSkippedNoStudent: skippedRows,
				studentsCreated: createdStudents,
				skillsCreated: createdSkills,
				scoresUpserted: upserted
			}
		};
	}
};