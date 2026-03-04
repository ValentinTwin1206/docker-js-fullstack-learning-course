import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';

/**
 * RegisterModal — registration form shown in a Bootstrap modal.
 * Mirrors the #registerModal / #registerForm in the old login.hbs.
 *
 * Props:
 *   show          – boolean, controls modal visibility
 *   onHide        – called when the modal should close
 *   onRegistered  – called with the generated username on success
 */
export default function RegisterModal({ show, onHide, onRegistered }) {
  const { register } = useAuth();

  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await register(form);

      if (res.ok && res.success) {
        const result = await Swal.fire({
          icon: 'success',
          title: 'Registration Successful',
          html: `<p>Your account has been created!</p>
                 <p><strong>Generated Username:</strong> ${res.data.username}</p>`,
          confirmButtonText: 'Go to Login',
        });

        if (result.isConfirmed) {
          setForm({ firstname: '', lastname: '', email: '', password: '' });
          onRegistered(res.data.username);
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || res.message || 'Registration failed',
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
    <Modal id="registerModal" show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Register</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form id="registerForm" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Firstname</Form.Label>
            <Form.Control
              name="firstname"
              required
              minLength={3}
              value={form.firstname}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Lastname</Form.Label>
            <Form.Control
              name="lastname"
              required
              minLength={2}
              value={form.lastname}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange}
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
