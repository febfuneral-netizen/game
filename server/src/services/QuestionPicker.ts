import Question, { IQuestion } from '../models/Question';
import User from '../models/User';

/**
 * 选题策略：按章节 + 难度递进随机选10题，排除用户已答题目
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

export async function pickQuestions(
  subject: string,
  chapter?: number,
  userId?: string
): Promise<IQuestion[]> {
  const picked: IQuestion[] = [];

  // 获取用户已答题目ID列表
  let answeredIds: string[] = [];
  if (userId) {
    try {
      const user = await User.findById(userId).select('answeredQuestionIds').lean();
      if (user?.answeredQuestionIds) {
        answeredIds = (user.answeredQuestionIds as any[]).map((id: any) => id.toString());
      }
    } catch {
      // 查询失败不阻塞流程
    }
  }

  for (let i = 1; i <= 10; i++) {
    const difficulties = DIFFICULTY_MAP[i];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

    // 构建排除ID列表：本局已选 + 用户已答
    const excludeIds = [...picked.map((q) => q._id.toString()), ...answeredIds];
    const query: any = {
      subject,
      difficulty: randomDifficulty,
    };
    if (chapter) {
      query.chapter = chapter;
    }
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    const question = await Question.findOne(query).exec();
    if (question) {
      picked.push(question);
    } else {
      // 降级：放宽到同主题任意难度（但仍排除已选/已答）
      const fallbackQuery: any = {
        subject,
        _id: { $nin: excludeIds },
      };
      if (chapter) {
        fallbackQuery.chapter = chapter;
      }
      const fallback = await Question.findOne(fallbackQuery).exec();
      if (fallback) {
        picked.push(fallback);
      } else {
        // 二次降级：跨章节但同主题
        const crossQuery: any = {
          subject,
          _id: { $nin: excludeIds },
        };
        const crossFallback = await Question.findOne(crossQuery).exec();
        if (crossFallback) picked.push(crossFallback);
      }
    }
  }

  return picked;
}
