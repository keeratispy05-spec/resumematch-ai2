import type { Candidate, Criterion, CriterionResult, Job } from '../types';

export function normalizeText(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('th-TH')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findOccurrences(text: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const haystack = normalizeText(text);
  const needle = normalizeText(keyword);
  if (!needle) return 0;
  // For Thai terms, literal substring search is often more useful than word boundaries.
  if (/[\u0E00-\u0E7F]/.test(needle)) return haystack.includes(needle) ? 1 : 0;
  const matches = haystack.match(new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'gi'));
  return matches?.length ?? (haystack.includes(needle) ? 1 : 0);
}

function evidenceFor(text: string, keyword: string): string[] {
  if (!text || !keyword) return [];
  const lines = text
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Zก-๙])/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const normalized = normalizeText(keyword);
  const found = lines.find((line) => normalizeText(line).includes(normalized));
  if (!found) return [];
  if (found.length <= 260) return [found];
  const index = normalizeText(found).indexOf(normalized);
  const start = Math.max(0, index - 105);
  const end = Math.min(found.length, index + keyword.length + 130);
  return [`${start > 0 ? '…' : ''}${found.slice(start, end)}${end < found.length ? '…' : ''}`];
}

export function scoreResume(job: Job, rawText: string): { score: number | null; results: CriterionResult[]; version: string } {
  const totalWeight = job.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01 || job.criteria.length === 0 || !rawText.trim()) {
    return { score: null, results: [], version: `v${job.criteriaVersion ?? 1}` };
  }

  const results = job.criteria.map((criterion) => {
    const keywords = criterion.keywords.map((item) => item.trim()).filter(Boolean);
    if (keywords.length === 0) {
      return {
        criterionId: criterion.id,
        label: criterion.label,
        category: criterion.category,
        weight: criterion.weight,
        percent: 0,
        matchedKeywords: [],
        missingKeywords: [],
        evidence: [],
        status: 'unknown' as const,
      };
    }
    const matchedKeywords = keywords.filter((keyword) => findOccurrences(rawText, keyword) > 0);
    const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));
    const percent = Math.round((matchedKeywords.length / keywords.length) * 100);
    const evidence = [...new Set(matchedKeywords.flatMap((keyword) => evidenceFor(rawText, keyword)))].slice(0, 3);
    return {
      criterionId: criterion.id,
      label: criterion.label,
      category: criterion.category,
      weight: criterion.weight,
      percent,
      matchedKeywords,
      missingKeywords,
      evidence,
      status: percent === 100 ? 'matched' as const : percent > 0 ? 'partial' as const : 'missing' as const,
    };
  });

  // Score is a weighted average of keyword coverage explicitly defined by HR.
  const usableWeight = results.reduce((sum, result) => sum + (result.status === 'unknown' ? 0 : result.weight), 0);
  if (usableWeight === 0) return { score: null, results, version: `v${job.criteriaVersion ?? 1}` };
  const weighted = results.reduce((sum, result) => sum + (result.status === 'unknown' ? 0 : result.percent * result.weight), 0);
  return { score: Math.round(weighted / usableWeight), results, version: `v${job.criteriaVersion ?? 1}` };
}

export function extractBasicFields(text: string, criteria: Criterion[]) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = text.match(/(?:\+66|0)[\d\s-]{8,13}\d/)?.[0]?.replace(/[\s-]/g, '') ?? '';
  const skillTerms = [...new Set(criteria.flatMap((criterion) => criterion.keywords))];
  const skills = skillTerms.filter((term) => findOccurrences(text, term) > 0);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const educationLine = lines.find((line) => /ปริญญา|มหาวิทยาลัย|คณะ|bachelor|master|degree|university|education/i.test(line)) ?? '';
  const experienceLine = lines.find((line) => /ประสบการณ์|experience|ปี|years?|intern|ฝึกงาน|ทำงาน/i.test(line)) ?? '';
  return { email, phone, skills, education: educationLine, experience: experienceLine };
}

export function reanalyzeCandidate(candidate: Candidate, job: Job): Candidate {
  if (candidate.parseStatus !== 'success' || !candidate.rawText.trim()) {
    return { ...candidate, score: null, results: [], analyzedAt: null, criteriaVersion: `v${job.criteriaVersion ?? 1}` };
  }
  const result = scoreResume(job, candidate.rawText);
  return { ...candidate, score: result.score, results: result.results, analyzedAt: new Date().toISOString(), criteriaVersion: result.version };
}
