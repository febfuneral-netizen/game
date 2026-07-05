import mongoose, { Schema, Document } from 'mongoose';

export interface ISubjectProgress {
  progress: 'locked' | 'newbie' | 'ongoing' | 'cleared';
  bestScore: number;
}

export interface IUser extends Document {
  openid: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  subjects: Record<string, ISubjectProgress>;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectProgressSchema = new Schema<ISubjectProgress>(
  {
    progress: {
      type: String,
      enum: ['locked', 'newbie', 'ongoing', 'cleared'],
      default: 'newbie',
    },
    bestScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    openid: { type: String, required: true, unique: true },
    nickname: { type: String, default: '玩家' },
    avatar: { type: String, default: '' },
    totalScore: { type: Number, default: 0 },
    subjects: {
      type: Map,
      of: SubjectProgressSchema,
      default: () => {
        const subjects = ['chinese', 'math', 'english', 'science', 'history', 'geography'];
        const map: Record<string, ISubjectProgress> = {};
        subjects.forEach((s) => {
          map[s] = { progress: 'newbie', bestScore: 0 };
        });
        return map;
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
