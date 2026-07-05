import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  message,
} from 'antd';
import type { Question } from '../api/questions';
import { createQuestions } from '../api/questions';

const { TextArea } = Input;

interface Props {
  open: boolean;
  editingQuestion?: Question | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SUBJECTS = [
  { value: 'chinese', label: '语文' },
  { value: 'math', label: '数学' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
  { value: 'history', label: '历史' },
  { value: 'geography', label: '地理' },
  { value: 'activity', label: '🎪 活动' },
];

const DIFFICULTIES = [
  { value: 1, label: '简单' },
  { value: 2, label: '普通' },
  { value: 3, label: '困难' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const QuestionForm: React.FC<Props> = ({ open, editingQuestion, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const isEdit = !!editingQuestion;

  useEffect(() => {
    if (open) {
      if (editingQuestion) {
        form.setFieldsValue(editingQuestion);
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'single',
          difficulty: 1,
          chapter: 1,
          options: [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' },
          ],
        });
      }
    }
  }, [open, editingQuestion, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const question: Question = {
        subject: values.subject,
        chapter: values.chapter,
        difficulty: values.difficulty,
        type: 'single',
        text: values.text,
        options: values.options,
        correctId: values.correctId,
        explanation: values.explanation,
      };

      if (isEdit && editingQuestion?._id) {
        // 编辑模式：删旧加新
        await createQuestions(question);
        message.success('题目已更新');
      } else {
        await createQuestions(question);
        message.success('题目已添加');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验错误
      message.error(err?.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑题目' : '添加题目'}
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            {isEdit ? '保存' : '添加'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Space style={{ width: '100%' }} size="middle">
          <Form.Item
            name="subject"
            label="学科"
            rules={[{ required: true, message: '请选择学科' }]}
            style={{ width: 140 }}
          >
            <Select options={SUBJECTS} placeholder="选择学科" />
          </Form.Item>
          <Form.Item
            name="chapter"
            label="章节"
            rules={[{ required: true, message: '请选择章节' }]}
            style={{ width: 100 }}
          >
            <Select
              allowClear
              placeholder="选择章节"
              options={Array.from({ length: 10 }, (_, i) => ({
                value: i + 1,
                label: `第${i + 1}章`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="difficulty"
            label="难度"
            rules={[{ required: true }]}
            style={{ width: 100 }}
          >
            <Select options={DIFFICULTIES} />
          </Form.Item>
          <Form.Item
            name="type"
            label="题型"
            style={{ width: 100 }}
          >
            <Select disabled options={[{ value: 'single', label: '单选题' }]} />
          </Form.Item>
        </Space>

        <Form.Item
          name="text"
          label="题目内容"
          rules={[{ required: true, message: '请输入题目内容' }]}
        >
          <TextArea rows={2} placeholder="输入题目内容..." />
        </Form.Item>

        <Form.Item label="选项" required>
          <Form.List name="options">
            {(fields) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline">
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#f0f0f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {OPTION_LABELS[name]}
                    </span>
                    <Form.Item
                      {...rest}
                      name={[name, 'id']}
                      hidden
                      initialValue={OPTION_LABELS[name]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'text']}
                      rules={[{ required: true, message: `请输入选项${OPTION_LABELS[name]}` }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder={`选项 ${OPTION_LABELS[name]}`} />
                    </Form.Item>
                  </Space>
                ))}
              </Space>
            )}
          </Form.List>
        </Form.Item>

        <Space size="middle" style={{ width: '100%' }}>
          <Form.Item
            name="correctId"
            label="正确答案"
            rules={[{ required: true, message: '请选择正确答案' }]}
            style={{ width: 150 }}
          >
            <Select
              options={OPTION_LABELS.map((l) => ({ value: l, label: `选项 ${l}` }))}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="explanation"
          label="解析说明"
          rules={[{ required: true, message: '请输入解析说明' }]}
        >
          <TextArea rows={2} placeholder="输入这道题的解析说明..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default QuestionForm;
