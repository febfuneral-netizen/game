import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Popconfirm,
  message,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  ImportOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  BookOutlined,
  LogoutOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Question } from '../api/questions';
import { getQuestions, deleteQuestion, getQuestionCount } from '../api/questions';
import QuestionForm from '../components/QuestionForm';
import BatchImport from '../components/BatchImport';

const { Title } = Typography;

// ============ 常量 ============
const SUBJECT_MAP: Record<string, { label: string; color: string }> = {
  chinese: { label: '语文', color: '#f97060' },
  math: { label: '数学', color: '#3b9eff' },
  english: { label: '英语', color: '#a259ff' },
  science: { label: '科学', color: '#10b981' },
  history: { label: '历史', color: '#f59e0b' },
  geography: { label: '地理', color: '#6366f1' },
  activity: { label: '活动', color: '#ec4899' },
};

const DIFF_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '简单', color: 'green' },
  2: { label: '普通', color: 'orange' },
  3: { label: '困难', color: 'red' },
};

// ============ 组件 ============
const Questions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 筛选
  const [filterSubject, setFilterSubject] = useState<string | undefined>();
  const [filterChapter, setFilterChapter] = useState<number | undefined>();
  const [filterDifficulty, setFilterDifficulty] = useState<number | undefined>();

  // Tab：题库管理 / 活动题库管理
  const [activeTab, setActiveTab] = useState<string>('subjects');

  // 弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ============ 数据加载 ============
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: pageSize, skip: (page - 1) * pageSize };

      // 活动 Tab：固定筛选 subject=activity
      if (activeTab === 'activity') {
        params.subject = 'activity';
        if (filterDifficulty) params.difficulty = filterDifficulty;
      } else {
        if (filterSubject) params.subject = filterSubject;
        if (filterChapter) params.chapter = filterChapter;
        if (filterDifficulty) params.difficulty = filterDifficulty;
      }

      const data = await getQuestions(params);
      setQuestions(data);
      setTotal(data.length >= pageSize ? (page * pageSize + 1) : data.length);
    } catch (err: any) {
      message.error(err?.response?.data?.error || '加载题目失败');
    } finally {
      setLoading(false);
    }
  }, [filterSubject, filterChapter, filterDifficulty, page, pageSize, activeTab]);

  const fetchCounts = useCallback(async () => {
    try {
      const data = await getQuestionCount();
      setCounts(data);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchCounts();
  }, [fetchQuestions, fetchCounts]);

  // Tab 切换时重置筛选
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    if (key === 'activity') {
      setFilterSubject(undefined);
      setFilterChapter(undefined);
    }
  };

  // ============ 操作 ============
  const handleAdd = () => {
    setEditingQuestion(null);
    setFormOpen(true);
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      message.success('题目已删除');
      fetchQuestions();
      fetchCounts();
    } catch (err: any) {
      message.error(err?.response?.data?.error || '删除失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login';
  };

  const onRefresh = () => {
    setPage(1);
    fetchQuestions();
    fetchCounts();
  };

  // ============ 表格列 ============
  const columns: ColumnsType<Question> = [
    {
      title: '学科',
      dataIndex: 'subject',
      width: 80,
      render: (s: string) => {
        const info = SUBJECT_MAP[s] || { label: s, color: '#999' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '章节',
      dataIndex: 'chapter',
      width: 70,
      render: (c: number) => c ? `第${c}章` : '-',
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      width: 70,
      render: (d: number) => {
        const info = DIFF_MAP[d] || { label: d, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '题目',
      dataIndex: 'text',
      ellipsis: true,
      render: (t: string) => (
        <span style={{ fontWeight: 500 }}>{t}</span>
      ),
    },
    {
      title: '答案',
      dataIndex: 'correctId',
      width: 60,
      align: 'center',
      render: (id: string) => (
        <Tag color="green" style={{ fontWeight: 700 }}>
          {id}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除这道题目？"
            onConfirm={() => record._id && handleDelete(record._id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ============ 统计 ============
  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 顶部导航 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space align="center" size={0}>
          <Space style={{ padding: '16px 0' }}>
            <BookOutlined style={{ fontSize: 24, color: '#fff' }} />
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              闯关学社 · 题库管理
            </Title>
          </Space>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            style={{ marginLeft: 40, marginBottom: 0 }}
            tabBarStyle={{ marginBottom: 0 }}
            items={[
              {
                key: 'subjects',
                label: (
                  <span style={{ color: activeTab === 'subjects' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 600 }}>
                    <BookOutlined style={{ marginRight: 4 }} />
                    学科题库
                  </span>
                ),
              },
              {
                key: 'activity',
                label: (
                  <span style={{ color: activeTab === 'activity' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 600 }}>
                    <GiftOutlined style={{ marginRight: 4 }} />
                    活动题库
                  </span>
                ),
              },
            ]}
          />
        </Space>
        <Button
          ghost
          icon={<LogoutOutlined />}
          onClick={handleLogout}
        >
          退出
        </Button>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic title="题目总数" value={totalQuestions} prefix={<BookOutlined />} />
            </Card>
          </Col>
          {Object.entries(SUBJECT_MAP).map(([key, info]) => (
            <Col xs={12} sm={8} md={3} key={key}>
              <Card size="small">
                <Statistic
                  title={info.label}
                  value={counts[key] || 0}
                  valueStyle={{ color: info.color, fontSize: 20 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* 工具栏 */}
        <Card
          style={{ marginBottom: 16 }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Row gutter={[12, 12]} align="middle" justify="space-between">
            <Col>
              <Space size="small" wrap>
                {activeTab !== 'activity' && (
                  <>
                    <Select
                      placeholder="全部学科"
                      allowClear
                      style={{ width: 100 }}
                      value={filterSubject}
                      onChange={(v) => { setFilterSubject(v); setPage(1); }}
                      options={Object.entries(SUBJECT_MAP)
                        .filter(([k]) => k !== 'activity')
                        .map(([k, v]) => ({
                          value: k,
                          label: v.label,
                        }))}
                    />
                    <Select
                      placeholder="全部章节"
                      allowClear
                      style={{ width: 100 }}
                      value={filterChapter}
                      onChange={(v) => { setFilterChapter(v); setPage(1); }}
                      options={Array.from({ length: 5 }, (_, i) => ({
                        value: i + 1,
                        label: `第${i + 1}章`,
                      }))}
                    />
                  </>
                )}
                {activeTab === 'activity' && (
                  <Tag color="#ec4899" style={{ fontSize: 13, padding: '2px 10px' }}>
                    🎪 活动题库
                  </Tag>
                )}
                <Select
                  placeholder="全部难度"
                  allowClear
                  style={{ width: 100 }}
                  value={filterDifficulty}
                  onChange={(v) => { setFilterDifficulty(v); setPage(1); }}
                  options={[
                    { value: 1, label: '简单' },
                    { value: 2, label: '普通' },
                    { value: 3, label: '困难' },
                  ]}
                />
                <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                  刷新
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ImportOutlined />}
                  onClick={() => setBatchOpen(true)}
                >
                  批量导入
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  添加题目
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 题目表格 */}
        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={questions}
            rowKey="_id"
            loading={loading}
            size="middle"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 题`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '8px 0' }}>
                  <p>
                    <strong>选项：</strong>
                    {record.options?.map((o) => (
                      <Tag
                        key={o.id}
                        color={o.id === record.correctId ? 'green' : 'default'}
                        style={{ margin: '2px 4px' }}
                      >
                        {o.id}. {o.text}
                      </Tag>
                    ))}
                  </p>
                  <p style={{ color: '#666', fontSize: 13 }}>
                    <strong>解析：</strong>{record.explanation}
                  </p>
                </div>
              ),
              rowExpandable: () => true,
            }}
          />
        </Card>
      </div>

      {/* 新增/编辑弹窗 */}
      <QuestionForm
        open={formOpen}
        editingQuestion={editingQuestion}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { fetchQuestions(); fetchCounts(); }}
      />

      {/* 批量导入弹窗 */}
      <BatchImport
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onSuccess={() => { fetchQuestions(); fetchCounts(); }}
      />
    </div>
  );
};

export default Questions;
