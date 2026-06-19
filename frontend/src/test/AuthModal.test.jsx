import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthModal from '../components/AuthModal';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    post: vi.fn()
  }
}));

describe('AuthModal Component tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <AuthModal isOpen={false} onClose={vi.fn()} onLoginSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render inputs and header when isOpen is true', () => {
    render(
      <AuthModal isOpen={true} onClose={vi.fn()} onLoginSuccess={vi.fn()} />
    );
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).toBeNull(); // Login mode shouldn't have Name
  });

  it('should toggle to register mode and show Name input', () => {
    render(
      <AuthModal isOpen={true} onClose={vi.fn()} onLoginSuccess={vi.fn()} />
    );
    
    // Toggle to Sign Up
    const signUpBtn = screen.getByText('Sign Up');
    fireEvent.click(signUpBtn);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should handle login submit successfully and save token', async () => {
    const mockUser = { id: '123', name: 'Sachin Saroj', email: 'sachin@example.com' };
    api.post.mockResolvedValue({
      data: {
        success: true,
        token: 'mock-jwt-token',
        user: mockUser
      }
    });

    const mockOnLoginSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <AuthModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
    );

    // Fill details
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sachin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

    // Submit
    const loginBtn = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'sachin@example.com',
        password: 'password123'
      });
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should display error message when auth fails', async () => {
    api.post.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Invalid credentials'
          }
        }
      }
    });

    render(
      <AuthModal isOpen={true} onClose={vi.fn()} onLoginSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sachin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });

    const loginBtn = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
