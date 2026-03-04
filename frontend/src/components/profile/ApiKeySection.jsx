import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

import { createApiKey, deleteApiKey } from '../../api/apikeys';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeyCreatedModal from './ApiKeyCreatedModal';

/**
 * ApiKeySection — lists API keys and lets the user create/delete them.
 * Replaces the #apiKeySection + inline script logic in profile.hbs.
 */
export default function ApiKeySection({ username, apiKeys, onKeysChanged }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createdToken, setCreatedToken] = useState(null); // the raw JWT shown once

  // Create API key
  const handleCreate = async (tokenName) => {
    const res = await createApiKey(username, tokenName);
    if (res.ok && res.data?.token) {
      setShowCreate(false);
      setCreatedToken(res.data.token);
    } else {
      toast.error(res.message || 'Failed to create API key');
    }
  };

  // After the "created" modal closes, refresh the list
  const handleCreatedClose = () => {
    setCreatedToken(null);
    onKeysChanged();
  };

  // Delete API key
  const handleDelete = async (tokenName) => {
    if (!confirm(`Are you sure you want to revoke the API key "${tokenName}"?`)) return;

    const res = await deleteApiKey(username, tokenName);
    if (res.ok && res.success) {
      toast.success(res.message || 'API key revoked');
      onKeysChanged();
    } else {
      toast.error(res.message || 'Failed to delete API key');
    }
  };

  // Format expiration date
  const formatExpiry = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return `Expires on ${date.toLocaleDateString('en-US', options)}`;
  };

  const isExpired = (dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date < new Date();
  };

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">API Keys</h6>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(true)}>
          Generate new key
        </button>
      </div>

      {apiKeys.length > 0 && (
        <div className="list-group mb-3">
          {apiKeys.map((key) => (
            <div
              key={key.tokenName}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div className="flex-grow-1">
                <strong>{key.tokenName}</strong>
                {' - '}
                <small className={isExpired(key.expiresAt) ? 'text-danger' : 'text-muted'}>
                  {formatExpiry(key.expiresAt)}
                </small>
              </div>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDelete(key.tokenName)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key modal */}
      <CreateApiKeyModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      {/* Show created token modal */}
      <ApiKeyCreatedModal
        token={createdToken}
        onClose={handleCreatedClose}
      />
    </div>
  );
}
