import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionResult {
  questionId: mongoose.Types.ObjectId;
  selectedOptionId: string;
  correct: boolean;
  timeSpent: number;
}

export interface IGameRecord extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  mode: 'single';
  status: 'completed' | 'eliminated';
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  score: number;
  questions: IQuestionResult[];
  startedAt: Date;
  finishedAt: Date;
}

const QuestionResultSchema = new Schema<IQuestionResult>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionId: { type: String, required: true },
    correct: { type: Boolean, required: true },
    timeSpent: { type: Number, required: true },
  },
  { _id: false }
);

const GameRecordSchema = new Schema<IGameRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true },
  mode: { type: String, enum: ['single'], default: 'single' },
  status: { type: String, enum: ['completed', 'eliminated'], required: true },
  totalQuestions: { type: Number, default: 10 },
  answeredCount: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  questions: [QuestionResultSchema],
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date, required: true },
});

export default mongoose.model<IGameRecord>('GameRecord', GameRecordSchema);
