import { useState, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import FilesTable from '../components/files/FilesTable';
import UploadModal from '../components/files/UploadModal';
import FilePreviewModal from '../components/files/FilePreviewModal';
import Pagination from '../components/Pagination';
import { getFilesPaginated, uploadFile, deleteFile, getFileRaw } from '../api/files';

export default function HomePage() {
  const { user } = useAuth();
  const username = user?.username;

  // Pagination & search state
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { content, contentType, filename }

  // Fetch files
  const loadFiles = useCallback(async (p = page, l = limit, s = search) => {
    setLoading(true);
    try {
      const res = await getFilesPaginated({ username, page: p, limit: l, search: s });
      if (res.ok && res.success) {
        setFiles(res.data.files);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Failed to load files', err);
    } finally {
      setLoading(false);
    }
  }, [username, page, limit, search]);

  // Initial load
  useState(() => {
    loadFiles(1, limit, search);
  });

  // Page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadFiles(newPage, limit, search);
  };

  // Limit change
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setLimit(newLimit);
    setPage(1);
    loadFiles(1, newLimit, search);
  };

  // Search
  const handleSearch = (e) => {
    const val = e.target.value.trim();
    setSearch(val);
    setPage(1);
    loadFiles(1, limit, val);
  };

  // Upload
  const handleUpload = async (file) => {
    try {
      const res = await uploadFile(username, file);
      if (res.ok && res.success) {
        toast.success(res.message || 'File uploaded');
        setShowUpload(false);
        loadFiles(page, limit, search);
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.message || 'Network error');
    }
  };

  // Delete
  const handleDelete = async (id, filename) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Delete File?',
      text: `Are you sure you want to delete "${filename}"?`,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteFile(id);
      if (res.ok && res.success) {
        toast.success('File deleted');
        loadFiles(page, limit, search);
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Network error' });
    }
  };

  // Show file content
  const handleShowContent = async (fileId, filename, mimetype) => {
    try {
      const response = await getFileRaw(fileId);
      if (!response.ok) throw new Error('Failed to fetch file');

      const contentType = response.headers.get('Content-Type') || '';
      let content;

      if (contentType.startsWith('text/') || contentType === 'application/json') {
        content = await response.text();
      } else if (contentType.startsWith('image/')) {
        const blob = await response.blob();
        content = URL.createObjectURL(blob);
      } else if (contentType === 'application/pdf') {
        const blob = await response.blob();
        content = URL.createObjectURL(blob);
      } else {
        content = null; // unsupported preview
      }

      setPreviewFile({ content, contentType, filename, fileId });
    } catch (err) {
      toast.error('Error loading file');
      console.error(err);
    }
  };

  // Range text
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Navbar />
      <div className="container-md">
        <h1>Welcome {username}</h1>

        {/* Controls */}
        <div className="mt-5 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              Upload
            </button>
            <input
              type="text"
              className="form-control"
              style={{ width: 300 }}
              placeholder="Search by filename (min 3 letters)"
              onChange={handleSearch}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="filesPerPage" className="form-label mb-0">Show:</label>
            <select
              id="filesPerPage"
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={limit}
              onChange={handleLimitChange}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-muted small ms-2">{start}-{end} of {total}</span>
          </div>
        </div>

        {/* File table */}
        <FilesTable
          files={files}
          loading={loading}
          onShow={handleShowContent}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Upload modal */}
      <UploadModal
        show={showUpload}
        onHide={() => setShowUpload(false)}
        onUpload={handleUpload}
      />

      {/* File preview modal */}
      <FilePreviewModal
        file={previewFile}
        onHide={() => setPreviewFile(null)}
      />
    </>
  );
}
