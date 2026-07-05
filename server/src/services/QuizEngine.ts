import GameRecord from '../models/GameRecord';
import User, { ISubjectProgress } from '../models/User';
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
    const current = (user.subjects as any).get?.(subject)
      || (user.subjects instanceof Map ? user.subjects.get(subject) : (user as any).subjects?.[subject]);
    const currentData: ISubjectProgress | undefined = current && typeof current === 'object' ? current : undefined;
    const oldBest = currentData?.bestScore || 0;

    const isChapterCleared = gameRecord.correctCount >= 8;
    // 章节通关后 currentChapter 自动 +1（最多到5），否则保持当前章节
    const playedChapter = gameRecord.chapter || 1;
    const existingChapter = currentData?.currentChapter || 1;
    // 只有玩的章节刚好是当前章节时，通关才推进
    const nextChapter = isChapterCleared && playedChapter === existingChapter
      ? Math.min(existingChapter + 1, 5)
      : Math.max(existingChapter, playedChapter);

    if (gameRecord.score > oldBest) {
      user.totalScore += (gameRecord.score - oldBest);
      (user.subjects as any).set(subject, {
        progress: isChapterCleared ? 'cleared' : 'ongoing',
        bestScore: gameRecord.score,
        currentChapter: nextChapter,
      });
    } else {
      const newProgress = currentData?.progress === 'cleared' ? 'cleared'
        : isChapterCleared ? 'cleared'
        : gameRecord.correctCount > 0 ? 'ongoing' : 'newbie';
      if (newProgress !== currentData?.progress || nextChapter !== existingChapter) {
        (user.subjects as any).set(subject, { progress: newProgress, bestScore: oldBest, currentChapter: nextChapter });
      } else {
        (user.subjects as any).set(subject, { progress: currentData?.progress || 'newbie', bestScore: oldBest, currentChapter: nextChapter });
      }
    }

    // 记录已答题目ID（去重用）
    const answeredIds: any[] = user.answeredQuestionIds || [];
    const questionIdsInGame = (gameRecord.questions || [])
      .map((q: any) => q.questionId?.toString())
      .filter(Boolean);
    for (const qid of questionIdsInGame) {
      if (!answeredIds.some((id: any) => id.toString() === qid)) {
        answeredIds.push(qid);
      }
    }
    user.answeredQuestionIds = answeredIds;

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
