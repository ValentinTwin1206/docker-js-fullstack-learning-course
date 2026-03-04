import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/auth/LoginForm';
import RegisterModal from '../components/auth/RegisterModal';

export default function LoginPage() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // If user fills in a generated username after registration,
  // we pass it down to pre-fill the login form.
  const [prefillUsername, setPrefillUsername] = useState('');

  const handleRegistered = (username) => {
    setPrefillUsername(username);
    setShowRegister(false);
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="card shadow-lg p-4" style={{ maxWidth: 420, width: '100%', borderRadius: 12 }}>
        <h1 className="text-center mb-4">Login</h1>
        <p className="text-center text-muted mb-4">Welcome! Please login to continue.</p>

        <LoginForm prefillUsername={prefillUsername} />

        <button
          type="button"
          className="btn btn-link w-100 mt-2"
          data-bs-target="#registerModal"
          onClick={() => setShowRegister(true)}
        >
          Register
        </button>
      </div>

      <RegisterModal
        show={showRegister}
        onHide={() => setShowRegister(false)}
        onRegistered={handleRegistered}
      />
    </div>
  );
}
