import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * Modal to enter a name for a new API key.
 * Replaces the #apiKeyNameModal in profile.hbs.
 */
export default function CreateApiKeyModal({ show, onHide, onCreate }) {
  const [tokenName, setTokenName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    setSubmitting(true);
    try {
      await onCreate(tokenName.trim());
      setTokenName('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New API Key</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>API Key Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Production Server"
              required
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
            />
          </Form.Group>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide} className="flex-grow-1">Cancel</Button>
            <Button variant="primary" type="submit" className="flex-grow-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
