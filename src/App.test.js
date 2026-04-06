import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * Mock the Supabase client so tests never hit the network.
 * We mock `./supabase` (what App imports) so auth behavior is fully controlled per test.
 */
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: {
          subscription: { unsubscribe: jest.fn() },
        },
      }),
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
      signUp: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import { supabase } from './supabase';

const mockSession = (email = 'runner@example.com') => ({
  user: { email },
});

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: { unsubscribe: jest.fn() },
    },
  });
  // clearAllMocks strips mock implementations; restore defaults for auth actions.
  supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
  supabase.auth.signUp.mockResolvedValue({ error: null });
  supabase.auth.signOut.mockResolvedValue(undefined);
});

describe('App (unauthenticated)', () => {
  test('renders Login / Signup when no session exists', () => {
    render(<App />);
    expect(screen.getByText(/login \/ signup/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signup/i })).toBeInTheDocument();
  });

  test('calls signInWithPassword when Login is clicked with credentials', async () => {
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret123',
      });
    });
  });
});

describe('App (authenticated)', () => {
  test('shows dashboard and email after session loads', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession('coach@fh.test') } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/coach@fh\.test/i)).toBeInTheDocument();
    });
    const header = screen.getByRole('banner');
    expect(within(header).getByText(/^Dashboard$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  test('opens Assessment tab by default until assessment is submitted', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession() } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /take assessment/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/how many sit ups can you do/i)).toBeInTheDocument();
    expect(screen.queryByText(/how many chest presses can you do/i)).not.toBeInTheDocument();
    expect(screen.getByText(/question 1 of 2/i)).toBeInTheDocument();
  });

  test('submits assessment and shows results message, then can exit to dashboard', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession() } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /take assessment/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: '20' },
    });
    await userEvent.click(screen.getByRole('button', { name: /continue to next question/i }));

    await waitFor(() => {
      expect(screen.getByText(/how many chest presses can you do/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/question 2 of 2/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: '12' },
    });
    await userEvent.click(screen.getByRole('button', { name: /submit assessment/i }));

    expect(
      screen.getByText(/we will return your assessment results soon/i)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /exit to main dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/stay consistent/i)).toBeInTheDocument();
    });
  });

  test('switches between Dashboard and Assessment tabs', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession() } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /take assessment/i })).toBeInTheDocument();
    });

    const tabRegion = screen.getByRole('region', { name: /dashboard tabs/i });
    await userEvent.click(within(tabRegion).getByRole('button', { name: /^dashboard$/i }));

    await waitFor(() => {
      expect(screen.getByText(/open assessment/i)).toBeInTheDocument();
    });

    await userEvent.click(within(tabRegion).getByRole('button', { name: /^assessment$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /take assessment/i })).toBeInTheDocument();
    });
  });
});
