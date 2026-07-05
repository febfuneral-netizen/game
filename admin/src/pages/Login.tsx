import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { login } from '../api/questions';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { nickname: string }) => {
    setLoading(true);
    try {
      const res = await login(values.nickname);
      if (res.token) {
        message.success('登录成功');
        window.location.href = '/admin/';
      }
    } catch {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 已登录则跳转
  if (localStorage.getItem('admin_token')) {
    window.location.href = '/admin/';
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: '40px 32px 24px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0, color: '#667eea' }}>
              闯关学社
            </Title>
            <Text type="secondary">题库管理后台</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="nickname"
              label="管理员昵称"
              rules={[{ required: true, message: '请输入昵称' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="输入管理员昵称登录"
                autoFocus
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 44,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontSize: 16,
                }}
              >
                登录管理后台
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default Login;
