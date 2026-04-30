import { ResumeResult, RubricCriteria } from './types';

export async function downloadExcel(
  results: ResumeResult[],
  rubric: RubricCriteria[],
  jobDescription: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows = results.map((r, i) => {
    const base: Record<string, string | number> = {
      Rank: i + 1,
      'Candidate Name': r.name,
      Email: r.email,
      Phone: r.phone,
      Location: r.location,
      'Years of Experience': r.yearsOfExperience,
      'Current Title': r.currentTitle,
      Education: r.education,
      'Key Strengths': r.keyStrengths?.join('; ') ?? '',
      'Key Weaknesses': r.keyWeaknesses?.join('; ') ?? '',
      'Overall Score (0-100)': r.overallScore,
    };

    for (const c of rubric) {
      base[`${c.name} Score (0-10)`] = r.rubricScores?.[c.name] ?? '';
      base[`${c.name} Comment`] = r.rubricComments?.[c.name] ?? '';
    }

    base['Recommendation'] = r.recommendation;
    base['Summary'] = r.summary;

    return base;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 20),
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Resume Scores');

  // Job Description sheet — one line per row for readability
  const jdSheet = XLSX.utils.aoa_to_sheet([
    ['Job Description'],
    [],
    ...jobDescription.split('\n').map((line) => [line]),
  ]);
  jdSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, jdSheet, 'Job Description');

  // Rubric reference sheet
  const rubricRows = rubric.map((c) => ({
    'Criterion': c.name,
    'Description': c.description,
    'Weight (%)': c.weight,
  }));
  const wsRubric = XLSX.utils.json_to_sheet(rubricRows);
  XLSX.utils.book_append_sheet(wb, wsRubric, 'Rubric');

  XLSX.writeFile(wb, 'resume_scores.xlsx');
}
