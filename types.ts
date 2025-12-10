

export enum GameMode {
  NONE = 'NONE',
  TOWER = 'TOWER',
  KITCHEN = 'KITCHEN',
  FLASHCARD = 'FLASHCARD'
}

export interface FileAttachment {
  id: string;
  type: 'image' | 'pdf' | 'text';
  content: string; // Base64 for PDF/Image, Raw string for Text
  mimeType: string;
  name: string;
}

export interface TowerWord {
  id: string;
  english: string;
  chinese: string;
  options: string[]; // Correct word + 3 distractors
}

export interface KitchenOrder {
  id: string;
  chinese: string;
  englishFull: string;
  ingredients: string[]; // The words scrambled
  distractors: string[]; // Extra wrong words
}

export interface MatchingPair {
  id: string;
  english: string;
  chinese: string;
}

export interface FlashcardItem {
  id: string;
  english: string;
  chinese: string;
  visualPrompt: string; // Description for the AI image generator
  generatedImage?: string; // Cache the generated image URL
}

export interface LessonData {
  id: string;         // Unique ID for storage
  timestamp: number;  // Creation time
  topic: string;
  towerWords: TowerWord[];
  kitchenOrders?: KitchenOrder[]; // Legacy support
  matchingPairs?: MatchingPair[]; // New game support
  flashcards: FlashcardItem[];
}

export interface VocabularyWord {
  word: string;
  chinese: string;
  definition: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface DialogueLine {
  character: string;
  emotion: string;
  line: string;
}

export interface SlicerItem {
  text: string;
  isTarget: boolean;
}

export interface SlicerRound {
  rule: string;
  items: SlicerItem[];
}