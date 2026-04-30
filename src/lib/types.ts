export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // percentage, all weights should sum to 100
}

export interface ResumeResult {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  yearsOfExperience: string;
  currentTitle: string;
  education: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  overallScore: number; // 0–100
  rubricScores: Record<string, number>; // criteria name -> 0–10
  rubricComments: Record<string, string>;
  recommendation: 'Strong Yes' | 'Yes' | 'Maybe' | 'No';
  summary: string;
}

export interface SSEEvent {
  type: 'status' | 'progress' | 'complete' | 'error';
  phase?: 'splitting' | 'scoring';
  message: string;
  processed?: number;
  total?: number;
  batchResults?: ResumeResult[];
  results?: ResumeResult[];
}

export const DEFAULT_RUBRIC: RubricCriteria[] = [
  {
    id: '1',
    name: 'Technical Skills',
    description: 'Match between candidate skills and required technical skills in the JD',
    weight: 30,
  },
  {
    id: '2',
    name: 'Relevant Experience',
    description: 'Years and quality of experience relevant to the role',
    weight: 25,
  },
  {
    id: '3',
    name: 'Leadership & Impact',
    description: 'Evidence of leadership, ownership, and measurable impact',
    weight: 20,
  },
  {
    id: '4',
    name: 'Education',
    description: 'Relevance and level of educational background',
    weight: 10,
  },
  {
    id: '5',
    name: 'Communication',
    description: 'Clarity, structure, and professionalism of the resume',
    weight: 15,
  },
];
