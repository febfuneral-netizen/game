import React from 'react';
import { Modal, Upload, Button, message, Space, Alert } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { Question } from '../api/questions';
import { createQuestions } from '../api/questions';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ========== 格式转换映射表 ==========

/** 学科：中文/英文/大小写/缩写 → 英文 enum（统一小写后匹配） */
const SUBJECT_ALIASES: Record<string, string> = {
  // 中文
  '语文': 'chinese', '数学': 'math', '英语': 'english',
  '科学': 'science', '历史': 'history', '地理': 'geography',
  // 英文（全小写/首字母大写/全大写 均归一化）
  'chinese': 'chinese', 'math': 'math', 'english': 'english',
  'science': 'science', 'history': 'history', 'geography': 'geography',
  // 常见缩写
  'cn': 'chinese', 'zh': 'chinese',
  'en': 'english', 'eng': 'english',
  'ma': 'math', 'sci': 'science',
  'his': 'history', 'geo': 'geography',
  // 活动题（部分用户可能导入 activity 类型）
  'activity': 'chinese', '活动': 'chinese',
  'physics': 'science', '物理': 'science',
  'chemistry': 'science', '化学': 'science',
  'biology': 'science', '生物': 'science',
  'politics': 'history', '政治': 'history',
};

/** 难度：中/英/数字 → 1|2|3（统一小写后匹配） */
const DIFFICULTY_ALIASES: Record<string, number> = {
  // 中文
  '简单': 1, '容易': 1, '初级': 1, '入门': 1,
  '普通': 2, '中等': 2, '一般': 2, '中级': 2,
  '困难': 3, '难': 3, '高级': 3, '难题': 3,
  // 英文
  'easy': 1, 'beginner': 1, 'basic': 1,
  'medium': 2, 'normal': 2, 'intermediate': 2,
  'hard': 3, 'difficult': 3, 'advanced': 3,
  // 纯数字字符串
  '1': 1, '2': 2, '3': 3,
};

interface TransformReport {
  questions: any[];
  total: number;
  subjectFixed: number;
  difficultyFixed: number;
  typeFixed: number;
  chapterMapping: Map<string, number>;
  skippedCount: number;
  /** 收集所有无法识别的值，便于用户排查 */
  unknownSubjects: Set<string>;
  unknownDifficulties: Set<string>;
}

/**
 * 智能转换：自动兼容中文/英文/大小写/缩写等多种格式的题目数据
 * 不会修改原始 JSON 文件，只在导入时做内存转换
 *
 * 支持的格式示例：
 *   subject: "chinese" | "Chinese" | "CHINESE" | "语文" | "cn" | "zh"
 *   difficulty: 1 | "1" | "简单" | "easy" | "Easy" | "medium" | "难" | "hard"
 *   chapter: 数字 | 字符串（自动编号）
 */
function transformQuestions(raw: any[]): TransformReport {
  const report: TransformReport = {
    questions: [],
    total: raw.length,
    subjectFixed: 0,
    difficultyFixed: 0,
    typeFixed: 0,
    chapterMapping: new Map(),
    skippedCount: 0,
    unknownSubjects: new Set(),
    unknownDifficulties: new Set(),
  };

  // 第一遍：收集所有章节名，自动编号
  const seenChapters: string[] = [];
  for (const item of raw) {
    const ch = typeof item.chapter === 'string' ? item.chapter.trim() : '';
    if (ch && !seenChapters.includes(ch)) {
      seenChapters.push(ch);
    }
  }
  seenChapters.forEach((name, i) => {
    report.chapterMapping.set(name, i + 1);
  });

  // 第二遍：逐题转换
  for (const item of raw) {
    const rawSubject = (item.subject || '').toString().trim();
    const rawDiff = item.difficulty;
    const rawType = (item.type || '').toString().trim();
    const rawChapter = typeof item.chapter === 'string' ? item.chapter.trim() : '';

    // --- subject：大小写不敏感匹配 ---
    const subjectKey = rawSubject.toLowerCase();
    const mappedSubject = SUBJECT_ALIASES[subjectKey] || SUBJECT_ALIASES[rawSubject];
    if (!mappedSubject) {
      report.skippedCount++;
      report.unknownSubjects.add(rawSubject || '(空)');
      continue;
    }
    // 是否发生了转换（如 语文→chinese, en→english）
    if (mappedSubject !== rawSubject.toLowerCase() && mappedSubject !== rawSubject) {
      report.subjectFixed++;
    }

    // --- difficulty：数字直接使用，字符串大小写不敏感匹配 ---
    let difficulty: number;
    if (typeof rawDiff === 'number') {
      difficulty = rawDiff;
      // 数字必须为 1/2/3
      if (difficulty < 1 || difficulty > 3) {
        report.skippedCount++;
        report.unknownDifficulties.add(String(difficulty));
        continue;
      }
    } else {
      const rawDiffStr = (rawDiff || '').toString().trim();
      difficulty = DIFFICULTY_ALIASES[rawDiffStr.toLowerCase()] ?? DIFFICULTY_ALIASES[rawDiffStr] ?? 0;
      if (difficulty === 0) {
        report.skippedCount++;
        report.unknownDifficulties.add(rawDiffStr || '(空)');
        continue;
      }
      // 发生了中文→数字或英文→数字的转换
      if (!['1', '2', '3'].includes(rawDiffStr)) {
        report.difficultyFixed++;
      }
    }

    // --- type：统一为 single ---
    const typeChanged = rawType && rawType.toLowerCase() !== 'single';
    if (typeChanged) report.typeFixed++;

    // --- chapter：字符串→自动编号，数字原样保留 ---
    let chapterNum: number | undefined;
    if (typeof item.chapter === 'number') {
      chapterNum = item.chapter;
    } else if (rawChapter) {
      chapterNum = report.chapterMapping.get(rawChapter);
    }

    report.questions.push({
      subject: mappedSubject,
      ...(chapterNum != null ? { chapter: chapterNum } : {}),
      difficulty,
      type: 'single',
      text: item.text,
      options: item.options,
      correctId: item.correctId,
      explanation: item.explanation,
    });
  }

  return report;
}

// ========== 组件 ==========

const SampleQuestion: Question = {
  subject: 'chinese',
  chapter: 1,
  difficulty: 1,
  type: 'single',
  text: '「床前明月光」的下一句是？',
  options: [
    { id: 'A', text: '疑是地上霜' },
    { id: 'B', text: '举头望明月' },
    { id: 'C', text: '低头思故乡' },
    { id: 'D', text: '春眠不觉晓' },
  ],
  correctId: 'A',
  explanation: '出自李白《静夜思》',
};

const BatchImport: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const downloadSample = () => {
    const blob = new Blob([JSON.stringify([SampleQuestion], null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (file: File) => {
    try {
      const text = await file.text();
      let parsed = JSON.parse(text);

      // 智能解包：如果数据被包裹在对象里（如 {"questions": [...]} / {"data": [...]}），自动提取
      if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        const arrayKey = keys.find((k) => Array.isArray(parsed[k]));
        if (arrayKey) {
          console.log(`[BatchImport] 自动解包: 从 "${arrayKey}" 提取 ${parsed[arrayKey].length} 道题`);
          parsed = parsed[arrayKey];
        }
      }

      const questions = parsed;

      if (!Array.isArray(questions)) {
        message.error('JSON 必须是题目数组，或包含题目数组的对象（如 {"questions": [...]}）');
        return false;
      }

      // 智能格式转换
      const report = transformQuestions(questions);

      if (report.questions.length === 0 && report.skippedCount > 0) {
        const details: string[] = [];
        if (report.unknownSubjects.size > 0) {
          details.push(`未知学科: ${Array.from(report.unknownSubjects).join(', ')}`);
        }
        if (report.unknownDifficulties.size > 0) {
          details.push(`未知难度: ${Array.from(report.unknownDifficulties).join(', ')}`);
        }
        message.error(
          `无法导入：${report.skippedCount} 道题目的 subject/difficulty 无法识别。${details.join('；')}`,
          8,
        );
        return false;
      }

      // 构建转换摘要
      const fixes: string[] = [];
      if (report.subjectFixed > 0) fixes.push(`${report.subjectFixed} 道科目名自动转换`);
      if (report.difficultyFixed > 0) fixes.push(`${report.difficultyFixed} 道难度自动转换`);
      if (report.typeFixed > 0) fixes.push(`${report.typeFixed} 道题型自动转换`);
      if (report.chapterMapping.size > 0) {
        const chList = Array.from(report.chapterMapping.entries())
          .map(([name, num]) => `${num}→${name}`)
          .join('，');
        fixes.push(`章节自动编号：${chList}`);
      }

      await createQuestions(report.questions);

      const summary = [
        `成功导入 ${report.questions.length} 道题目`,
        ...(report.skippedCount > 0
          ? [`${report.skippedCount} 道因格式无法识别已跳过`]
          : []),
        ...(fixes.length > 0 ? [`格式自动修正：${fixes.join('；')}`] : []),
      ].join('\n');

      message.success({
        content: summary,
        duration: 8,
        style: { whiteSpace: 'pre-line' },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      if (serverMsg) {
        message.error(`导入失败：${serverMsg}`, 6);
      } else if (err instanceof SyntaxError) {
        message.error('JSON 格式解析失败，请检查文件是否为合法 JSON');
      } else {
        message.error('导入失败，请检查网络连接后重试');
      }
    }
    return false;
  };

  return (
    <Modal
      title="批量导入题目"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info"
          message="导入格式说明"
          description={
            <div>
              <p>请上传 JSON 文件，格式为题目对象数组。每个题目需包含：</p>
              <code>
                subject, chapter, difficulty, type, text, options(含id+text),
                correctId, explanation
              </code>
            </div>
          }
        />

        <Button icon={<DownloadOutlined />} onClick={downloadSample}>
          下载示例文件
        </Button>

        <Upload.Dragger
          accept=".json"
          maxCount={1}
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 32, color: '#667eea' }} />
          </p>
          <p>点击或拖拽 JSON 文件到此区域上传</p>
        </Upload.Dragger>
      </Space>
    </Modal>
  );
};

export default BatchImport;
