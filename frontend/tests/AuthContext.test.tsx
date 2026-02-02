import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import React from 'react';

// Mock the api module
vi.mock('../services/api', () => ({
  default: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    verify: vi.fn(),
    resendCode: vi.fn(),
    logout: vi.fn(),
  },
}));

import api from '../services/api';

const TestComponent = () => {
  const { user, isLoading, isAuthenticated, login, register, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button data-testid="login-btn" onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button
        data-testid="register-btn"
        onClick={() => register('new@example.com', 'newuser', 'password')}
      >
        Register
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.getToken as any).mockReturnValue(null);
    (api.getMe as any).mockResolvedValue({ data: null });
  });

  it('should start with loading state and then finish loading', async () => {
    (api.getMe as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: null }), 100))
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // After async initialization, should finish loading
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });
  });

  it('should not be authenticated by default', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('not-authenticated');
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('should restore auth from token', async () => {
    (api.getToken as any).mockReturnValue('existing-token');
    (api.getMe as any).mockResolvedValue({
      data: { user: { id: 1, email: 'existing@example.com', username: 'existinguser' } },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('authenticated');
    expect(screen.getByTestId('user').textContent).toBe('existing@example.com');
  });

  it('should login successfully', async () => {
    (api.login as any).mockResolvedValue({
      data: {
        access_token: 'new-token',
        user: { id: 1, email: 'test@example.com', username: 'testuser' },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('authenticated');
    });

    expect(api.setToken).toHaveBeenCalledWith('new-token');
    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
  });

  it('should handle login error', async () => {
    (api.login as any).mockResolvedValue({
      error: 'Invalid credentials',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('not-authenticated');
  });

  it('should logout successfully', async () => {
    (api.getToken as any).mockReturnValue('existing-token');
    (api.getMe as any).mockResolvedValue({
      data: { user: { id: 1, email: 'test@example.com', username: 'testuser' } },
    });
    (api.logout as any).mockResolvedValue({ data: { message: 'Logged out' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('authenticated');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('not-authenticated');
    });

    expect(api.setToken).toHaveBeenCalledWith(null);
  });

  it('should register successfully', async () => {
    (api.register as any).mockResolvedValue({
      data: { message: 'Registration successful' },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    await act(async () => {
      screen.getByTestId('register-btn').click();
    });

    expect(api.register).toHaveBeenCalledWith('new@example.com', 'newuser', 'password');
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    console.error = consoleError;
  });
});
