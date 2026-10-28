import type { Candidate, Job } from '../types';

const JOBS_KEY = 'resumematch.jobs.v1';
const CANDIDATES_KEY = 'resumematch.candidates.v1';

export function loadSaved<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveAll(jobs: Job[], candidates: Candidate[]): boolean {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates));
    return true;
  } catch {
    // The app can still work for this session, but the browser may be out of storage space.
    return false;
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(JOBS_KEY);
    localStorage.removeItem(CANDIDATES_KEY);
  } catch {
    // Ignore storage restrictions; in-memory state is cleared by the app itself.
  }
}
