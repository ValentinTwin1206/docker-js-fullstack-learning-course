import { Modal, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';

/**
 * Modal shown once after a new API key is created, displaying the raw token.
 * Replaces the #apiKeyModal in profile.hbs.
 */
export default function ApiKeyCreatedModal({ token, onClose }) {
  if (!token) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    toast.success('API key copied to clipboard!');
  };

  return (
    <Modal show={!!token} onHide={onClose} centered>
      <Modal.Header className="bg-warning">
        <Modal.Title>API Key generated</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="input-group mb-3">
          <input type="text" className="form-control" value={token} readOnly />
          <button className="btn btn-outline-secondary" type="button" onClick={handleCopy}>
            Copy
          </button>
        </div>
        <small className="text-muted">
          Make sure to copy your API key now. You won't be able to see it again!
        </small>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
