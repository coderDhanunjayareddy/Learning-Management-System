export interface QuestionFolder {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
}

export const mockFolders: QuestionFolder[] = [
  {
    id: "foundation-math",
    name: "Foundation Math",
    description: "Core arithmetic, algebra, and practice sets.",
    questionCount: 120,
  },
  {
    id: "physics-mechanics",
    name: "Physics Mechanics",
    description: "Newton's laws, motion, and force questions.",
    questionCount: 86,
  },
  {
    id: "chemistry-stoichiometry",
    name: "Chemistry Stoichiometry",
    description: "Mole concept, balancing equations, and numericals.",
    questionCount: 64,
  },
];
