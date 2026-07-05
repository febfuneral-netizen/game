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

const SAMPLE_DATA: Question[] = [
  {
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
  },
];

const BatchImport: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_DATA, null, 2)], {
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
      const questions = JSON.parse(text);
      
      if (!Array.isArray(questions)) {
        message.error('JSON 必须是题目数组');
        return false;
      }

      await createQuestions(questions);
      message.success(`成功导入 ${questions.length} 道题目`);
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.error || '导入失败，请检查 JSON 格式');
    } finally {
      // done
    }
    return false; // 阻止默认上传
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
