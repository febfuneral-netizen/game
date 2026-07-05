import mongoose, { Schema, Document } from 'mongoose';

export interface IOption {
  id: string;
  text: string;
}

export interface IQuestion extends Document {
  subject: 'chinese' | 'math' | 'english' | 'science' | 'history' | 'geography';
  difficulty: 1 | 2 | 3;
  type: 'single';
  text: string;
  options: IOption[];
  correctId: string;
  explanation: string;
}

const QuestionSchema = new Schema<IQuestion>({
  subject: {
    type: String,
    enum: ['chinese', 'math', 'english', 'science', 'history', 'geography'],
    required: true,
    index: true,
  },
  difficulty: { type: Number, enum: [1, 2, 3], required: true, index: true },
  type: { type: String, enum: ['single'], default: 'single' },
  text: { type: String, required: true },
  options: [
    {
      id: { type: String, required: true },
      text: { type: String, required: true },
    },
  ],
  correctId: { type: String, required: true },
  explanation: { type: String, required: true },
});

QuestionSchema.index({ subject: 1, difficulty: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
