import { useState } from 'react';

/**
 * ProfileForm — editable user profile fields.
 */
export default function ProfileForm({ user, onSubmit, onDelete }) {
  const [firstname, setFirstname] = useState(user.firstname || '');
  const [lastname, setLastname] = useState(user.lastname || '');
  const [email, setEmail] = useState(user.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ firstname: firstname.trim(), lastname: lastname.trim(), email: email.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFirstname(user.firstname || '');
    setLastname(user.lastname || '');
    setEmail(user.email || '');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="username" className="form-label">Username</label>
        <input type="text" className="form-control" id="username" value={user.username} disabled />
      </div>

      <div className="mb-3">
        <label htmlFor="firstname" className="form-label">Firstname</label>
        <input
          type="text"
          className="form-control"
          id="firstname"
          required
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="lastname" className="form-label">Lastname</label>
        <input
          type="text"
          className="form-control"
          id="lastname"
          required
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="d-flex gap-2">
        <button type="button" className="btn btn-sm btn-lightgray flex-grow-1" onClick={handleCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary flex-grow-1" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update'}
        </button>
      </div>

      <hr className="my-4" />

      <div className="text-center">
        <button id="deleteAccountButton" type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)} >
            Unregister Account
        </button>
        {confirming && (
          <div className="mt-3">
            <p className="text-danger small">
              Are you sure? This action cannot be undone.
            </p>

            <div className="d-flex gap-2 justify-content-center">
              <button id="cancelDeleteButton" type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)} >
                Cancel
              </button>

              <button id="confirmDeleteButton" type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
                Yes, delete my account
              </button>
            </div>
          </div>
        )}
      </div>

    </form>
  );
}
