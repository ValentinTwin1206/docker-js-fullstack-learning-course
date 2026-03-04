/**
 * FilesTable — renders the file list as a Bootstrap table.
 * Replaces the `renderFilesTable()` function from home.hbs.
 */
export default function FilesTable({ files, loading, onShow, onDelete }) {
  if (loading) {
    return <p className="mt-3 text-muted text-center">Loading files...</p>;
  }

  if (!files || files.length === 0) {
    return <p className="mt-3 text-muted text-center">No files found.</p>;
  }

  return (
    <table className="table table-striped mt-3 align-middle">
      <thead>
        <tr>
          <th>Filename</th>
          <th>Size (KB)</th>
          <th>Uploaded At</th>
          <th>File Type</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file._id}>
            <td>{file.originalName}</td>
            <td>{(file.size / 1024).toFixed(1)}</td>
            <td>{new Date(file.createdAt).toLocaleString()}</td>
            <td>
              {file.isBinary && (
                <span className="badge bg-light text-dark">binary</span>
              )}
            </td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-lightgray me-1"
                onClick={() => onShow(file._id, file.originalName, file.mimetype)}
              >
                Show
              </button>
              <button
                type="button"
                className="btn btn-sm btn-lightred"
                onClick={() => onDelete(file._id, file.originalName)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
