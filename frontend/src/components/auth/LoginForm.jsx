import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';

/**
 * LoginForm — username / password form.
 * Mirrors the #loginForm in the old login.hbs.
 */
export default function LoginForm({ prefillUsername = '' }) {
  const { login } = useAuth();

  const [username, setUsername] = useState(prefillUsername);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When a new prefillUsername arrives (after register), update the field
  useEffect(() => {
    if (prefillUsername) {
      setUsername(prefillUsername);
      setPassword('');
    }
  }, [prefillUsername]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await login(username, password);

      // login() in useAuth already navigates to /home on success.
      // If it was NOT successful, show an error dialog.
      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: res.error?.message || res.message || 'Invalid credentials',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Unexpected Error',
        text: err.error || 'Something went wrong',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="loginForm" onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Username</label>
        <input
          name="username"
          className="form-control"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          name="password"
          className="form-control"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Login'}
      </button>
    </form>
  );
}
