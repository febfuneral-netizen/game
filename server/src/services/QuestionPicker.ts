import Question, { IQuestion } from '../models/Question';

/**
 * 选题策略：按难度递进随机选10题
 * 1-3题: 难度1
 * 4-6题: 难度2
 * 7-9题: 难度2-3
 * 10题: 难度3
 */
const DIFFICULTY_MAP: Record<number, number[]> = {
  1: [1],
  2: [1],
  3: [1],
  4: [2],
  5: [2],
  6: [2],
  7: [2, 3],
  8: [2, 3],
  9: [2, 3],
  10: [3],
};

export async function pickQuestions(subject: string): Promise<IQuestion[]> {
  const picked: IQuestion[] = [];

  for (let i = 1; i <= 10; i++) {
    const difficulties = DIFFICULTY_MAP[i];
    // 在所有可选难度中随机选一个
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

    // 在已选题目之外随机选一题
    const excludeIds = picked.map((q) => q._id);
    const query: any = {
      subject,
      difficulty: randomDifficulty,
    };
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    const question = await Question.findOne(query).exec();
    if (question) {
      picked.push(question);
    } else {
      // 降级：如果没找到对应难度，放宽到任意难度
      const fallback = await Question.findOne({
        subject,
        _id: { $nin: excludeIds },
      }).exec();
      if (fallback) picked.push(fallback);
    }
  }

  return picked;
}
