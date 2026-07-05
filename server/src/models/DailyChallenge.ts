import mongoose from 'mongoose';

const DailyChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  subject: { type: String, required: true },
  score: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  questionsAnswered: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

DailyChallengeSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyChallenge = mongoose.model('DailyChallenge', DailyChallengeSchema);

export default DailyChallenge;
