import type { Candidate, Criterion, Job } from './types';
import { scoreResume } from './utils/scoring';

const now = new Date().toISOString();
const criteriaForDeveloper: Criterion[] = [
  { id: 'crit-dev-skill', label: 'ทักษะด้านเว็บ', category: 'ทักษะ', keywords: ['React', 'TypeScript', 'JavaScript', 'REST API'], weight: 40 },
  { id: 'crit-dev-exp', label: 'ประสบการณ์ทำงาน', category: 'ประสบการณ์', keywords: ['frontend', 'developer', 'ปี', 'intern'], weight: 30 },
  { id: 'crit-dev-edu', label: 'พื้นฐานการศึกษา', category: 'การศึกษา', keywords: ['วิทยาการคอมพิวเตอร์', 'เทคโนโลยีสารสนเทศ', 'Computer Science', 'Information Technology'], weight: 20 },
  { id: 'crit-dev-team', label: 'การทำงานร่วมกัน', category: 'คุณสมบัติอื่น', keywords: ['Agile', 'ทีม', 'Git'], weight: 10 },
];
const criteriaForHr: Criterion[] = [
  { id: 'crit-hr-skill', label: 'ทักษะงาน HR', category: 'ทักษะ', keywords: ['สรรหา', 'สัมภาษณ์', 'Excel', 'HRIS'], weight: 40 },
  { id: 'crit-hr-exp', label: 'ประสบการณ์ที่เกี่ยวข้อง', category: 'ประสบการณ์', keywords: ['ทรัพยากรมนุษย์', 'ฝึกงาน', 'ปี'], weight: 30 },
  { id: 'crit-hr-edu', label: 'พื้นฐานการศึกษา', category: 'การศึกษา', keywords: ['บริหารทรัพยากรมนุษย์', 'จิตวิทยา', 'บริหารธุรกิจ'], weight: 20 },
  { id: 'crit-hr-other', label: 'ทักษะเสริม', category: 'คุณสมบัติอื่น', keywords: ['ประสานงาน', 'สื่อสาร', 'ข้อมูล'], weight: 10 },
];

export const demoJobs: Job[] = [
  {
    id: 'demo-job-frontend', title: 'Frontend Developer', department: 'เทคโนโลยีสารสนเทศ',
    description: 'พัฒนาและดูแลส่วนติดต่อผู้ใช้งานของเว็บแอป ทำงานร่วมกับทีมออกแบบและ backend',
    minQualification: 'ปริญญาตรีด้านคอมพิวเตอร์หรือสาขาที่เกี่ยวข้อง และมีผลงานพัฒนาเว็บ',
    criteria: criteriaForDeveloper, createdAt: now, updatedAt: now, criteriaVersion: 1, isDemo: true,
  },
  {
    id: 'demo-job-hr', title: 'HR Recruitment Officer', department: 'ทรัพยากรมนุษย์',
    description: 'ดำเนินงานสรรหา คัดกรองใบสมัคร นัดสัมภาษณ์ และประสานงานกับผู้จัดการฝ่าย',
    minQualification: 'พื้นฐานด้าน HR หรือสาขาเกี่ยวข้อง สื่อสารและจัดการข้อมูลได้ดี',
    criteria: criteriaForHr, createdAt: now, updatedAt: now, criteriaVersion: 1, isDemo: true,
  },
];

function demoCandidate(id: string, job: Job, name: string, fileName: string, rawText: string, status: Candidate['status']): Candidate {
  const result = scoreResume(job, rawText);
  return {
    id, jobId: job.id, name, email: '', phone: '', education: '', experience: '', skills: [], fileName,
    rawText, parseStatus: 'success', score: result.score, results: result.results, status,
    analyzedAt: now, criteriaVersion: result.version, isDemo: true,
  };
}

export const demoCandidates: Candidate[] = [
  demoCandidate('demo-cand-1', demoJobs[0], 'กานต์ธีร์ วัฒนาพงษ์', 'resume-frontend-01.pdf',
    'ประวัติการทำงาน\nFrontend Developer ประสบการณ์ 2 ปี\nพัฒนาเว็บด้วย React, TypeScript, JavaScript และเชื่อมต่อ REST API\nจบสาขาวิทยาการคอมพิวเตอร์\nทำงานเป็นทีม ใช้ Git และ Agile ในการพัฒนาโปรเจกต์', 'pending'),
  demoCandidate('demo-cand-2', demoJobs[0], 'พิมพ์ชนก ศรีวัฒน์', 'resume-frontend-02.pdf',
    'ประวัติการทำงาน\nFrontend intern 1 ปี\nใช้ JavaScript และ React พัฒนาเว็บไซต์\nจบสาขาเทคโนโลยีสารสนเทศ\nร่วมทำงานเป็นทีมและใช้ Git', 'reviewed'),
  demoCandidate('demo-cand-3', demoJobs[0], 'ธนกร พูนผล', 'resume-frontend-03.pdf',
    'ประวัติการทำงาน\nWeb Developer ประสบการณ์ 3 ปี\nพัฒนาเว็บไซต์ด้วย JavaScript และ REST API\nจบสาขาวิศวกรรมคอมพิวเตอร์\nใช้ Git ทำงานร่วมกับทีม', 'consider'),
  demoCandidate('demo-cand-4', demoJobs[1], 'ณัฐริกา วงศ์ดี', 'resume-hr-01.pdf',
    'ประวัติการทำงาน\nเจ้าหน้าที่ทรัพยากรมนุษย์ ประสบการณ์ 2 ปี\nมีทักษะสรรหา คัดกรองเรซูเม่ สัมภาษณ์ และใช้ Excel กับ HRIS\nจบสาขาบริหารทรัพยากรมนุษย์\nประสานงานและสื่อสารข้อมูลกับทีมได้ดี', 'interview'),
  demoCandidate('demo-cand-5', demoJobs[1], 'วรเมธ ภักดี', 'resume-hr-02.pdf',
    'ประวัติการศึกษา\nฝึกงานฝ่ายบุคคล 4 เดือน\nมีพื้นฐาน Excel และประสานงาน\nจบสาขาบริหารธุรกิจ\nสนใจงานสรรหาและการจัดการข้อมูล', 'pending'),
];

export function loadDemoData() {
  return { jobs: demoJobs.map((job) => ({ ...job, criteria: job.criteria.map((criterion) => ({ ...criterion, keywords: [...criterion.keywords] })) })), candidates: demoCandidates.map((candidate) => ({ ...candidate, results: candidate.results.map((result) => ({ ...result, evidence: [...result.evidence], matchedKeywords: [...result.matchedKeywords], missingKeywords: [...result.missingKeywords] })) })) };
}
