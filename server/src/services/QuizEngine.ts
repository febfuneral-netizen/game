import GameRecord from '../models/GameRecord';
import User from '../models/User';
import Question from '../models/Question';

interface SubmitResult {
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  distribution: { optionId: string; count: number }[];
  isLastQuestion: boolean;
  eliminated: boolean;
  score: number;
}

const MAX_SECONDS = 15; // 与前端 COUNTDOWN_SECONDS 保持一致

/**
 * 提交答案判题（答错即止）
 */
export async function judgeAnswer(
  gameRecord: any,
  questionId: string,
  optionId: string,
  timeSpent: number
): Promise<SubmitResult> {
  const question = await Question.findById(questionId);
  if (!question) throw new Error('题目不存在');

  const correct = question.correctId === optionId;
  const isLastQuestion = gameRecord.answeredCount + 1 >= gameRecord.totalQuestions;

  // 单题积分：基础分100 + 速度奖励
  let singleScore = 0;
  if (correct) {
    const speedBonus = Math.max(0, Math.floor((MAX_SECONDS - timeSpent) * 10));
    singleScore = 100 + speedBonus;
  }

  // 更新答题记录
  gameRecord.answeredCount += 1;
  gameRecord.correctCount += correct ? 1 : 0;
  gameRecord.questions.push({
    questionId: question._id,
    selectedOptionId: optionId,
    correct,
    timeSpent,
  });

  // 答错即淘汰
  if (!correct) {
    gameRecord.status = 'eliminated';
    gameRecord.finishedAt = new Date();
    gameRecord.score = 0;
    await gameRecord.save();
    await updateUserProgress(gameRecord);

    return {
      correct,
      correctOptionId: question.correctId,
      explanation: question.explanation,
      distribution: await getDistribution(questionId),
      isLastQuestion,
      eliminated: true,
      score: 0,
    };
  }

  // 答对且是最后一题 → 通关结算
  if (isLastQuestion) {
    gameRecord.status = 'completed';
    gameRecord.finishedAt = new Date();
    const totalScore = gameRecord.questions.reduce(
      (sum: number, q: any) => sum + (q.correct ? 100 + Math.max(0, Math.floor((MAX_SECONDS - q.timeSpent) * 10)) : 0),
      0
    );
    gameRecord.score = totalScore;
    await gameRecord.save();
    await updateUserProgress(gameRecord);

    return {
      correct,
      correctOptionId: question.correctId,
      explanation: question.explanation,
      distribution: await getDistribution(questionId),
      isLastQuestion: true,
      eliminated: false,
      score: totalScore,
    };
  }

  // 继续下一题
  await gameRecord.save();
  return {
    correct,
    correctOptionId: question.correctId,
    explanation: question.explanation,
    distribution: await getDistribution(questionId),
    isLastQuestion: false,
    eliminated: false,
    score: singleScore,
  };
}

/**
 * 游戏结束后更新用户总分和学科进度
 */
async function updateUserProgress(gameRecord: any) {
  try {
    const user = await User.findById(gameRecord.userId);
    if (!user) return;

    const subject = gameRecord.subject;
    const current = user.subjects.get(subject);
    const oldBest = current?.bestScore || 0;

    if (gameRecord.score > oldBest) {
      user.totalScore += (gameRecord.score - oldBest);
      user.subjects.set(subject, {
        progress: gameRecord.correctCount >= 8 ? 'cleared' : 'ongoing',
        bestScore: gameRecord.score,
      });
    } else {
      const newProgress = current?.progress === 'cleared' ? 'cleared'
        : gameRecord.correctCount >= 8 ? 'cleared'
        : gameRecord.correctCount > 0 ? 'ongoing' : 'newbie';
      if (newProgress !== current?.progress) {
        user.subjects.set(subject, { progress: newProgress, bestScore: oldBest });
      }
    }

    await user.save();
  } catch (err) {
    console.error('更新用户进度失败:', err);
  }
}

async function getDistribution(questionId: string): Promise<{ optionId: string; count: number }[]> {
  const question = await Question.findById(questionId);
  if (!question) return [];
  return question.options.map((opt) => ({
    optionId: opt.id,
    count: Math.floor(Math.random() * 100) + 10,
  }));
}
