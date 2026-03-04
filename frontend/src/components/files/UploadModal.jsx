import { useState, useRef } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * UploadModal — file upload dialog.
 * Replaces the #uploadModal in home.hbs.
 */
export default function UploadModal({ show, onHide, onUpload }) {
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return;

    setSubmitting(true);
    try {
      await onUpload(file);
      // Reset form after successful upload
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload a File</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Select a file</Form.Label>
            <Form.Control type="file" ref={fileRef} required />
          </Form.Group>
          <Button variant="primary" type="submit" className="w-100" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Upload'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
