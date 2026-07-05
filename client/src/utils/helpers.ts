/**
 * 随机取数组元素
 */
export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 格式化得分 120 → "120"
 */
export function formatScore(score: number): string {
  return score.toString();
}

/**
 * 格式化时间(毫秒→秒)
 */
export function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1);
}

/**
 * 生成随机ID
 */
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 学科中文名
 */
export function subjectLabel(key: string): string {
  const map: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
    science: '科学',
    history: '历史',
    geography: '地理',
  };
  return map[key] || key;
}
