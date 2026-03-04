import { Modal } from 'react-bootstrap';

/**
 * FilePreviewModal — shows file content based on content-type.
 * Replaces the #contentModal in home.hbs.
 *
 * Props:
 *   file   – { content, contentType, filename, fileId } or null
 *   onHide – close handler
 */
export default function FilePreviewModal({ file, onHide }) {
  if (!file) return null;

  const { content, contentType, filename, fileId } = file;

  const renderContent = () => {
    if (contentType.startsWith('text/') || contentType === 'application/json') {
      return <pre style={{ whiteSpace: 'pre-wrap' }}>{content}</pre>;
    }
    if (contentType.startsWith('image/')) {
      return <img src={content} className="img-fluid" alt={filename} />;
    }
    if (contentType === 'application/pdf') {
      return <embed src={content} type="application/pdf" width="100%" height="600px" />;
    }
    return (
      <p className="text-muted">
        Preview not supported.{' '}
        <a href={`/api/v1/files/${fileId}`} target="_blank" rel="noreferrer">Download</a>
      </p>
    );
  };

  return (
    <Modal show={!!file} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>File Content: {filename}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderContent()}</Modal.Body>
    </Modal>
  );
}
