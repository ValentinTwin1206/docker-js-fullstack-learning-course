import { useState } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { deleteUser } from '../../api/users';
import { updateUserRole } from '../../api/roles';

/**
 * Renders the paginated users table with role-toggle switch and delete button.
 * Replaces the dynamic table from users.hbs.
 */
export default function UsersTable({ users, onRefresh }) {
  const [togglingUser, setTogglingUser] = useState(null);

  const handleRoleToggle = async (username, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setTogglingUser(username);
    try {
      const res = await updateUserRole(username, newRole);
      if (res.ok) {
        toast.success(`${username} is now "${newRole}"`);
        onRefresh();
      } else {
        toast.error(res.error || 'Failed to update role');
      }
    } catch {
      toast.error('Error updating role');
    } finally {
      setTogglingUser(null);
    }
  };

  const handleDelete = async (username) => {
    const result = await Swal.fire({
      title: `Delete "${username}"?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await deleteUser(username);
      if (res.ok || res.success) {
        toast.success(`User "${username}" deleted`);
        onRefresh();
      } else {
        toast.error(res.error || 'Failed to delete user');
      }
    } catch {
      toast.error('Error deleting user');
    }
  };

  if (!users || users.length === 0) {
    return <p className="text-muted mt-3">No users found.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">Username</th>
            <th scope="col">Email</th>
            <th scope="col">Permission</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSysadmin = user.role === 'sysadmin';

            return (
              <tr key={user.username}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span
                    className={`badge ${
                      user.role === 'admin'
                        ? 'bg-success'
                        : user.role === 'sysadmin'
                        ? 'bg-danger'
                        : 'bg-secondary'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="d-flex gap-2 align-items-center">
                  {/* Role toggle switch */}
                  <div className="form-check form-switch" title={`Toggle admin rights for ${user.username}`}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={user.role === 'admin'}
                      disabled={isSysadmin || togglingUser === user.username}
                      onChange={() => handleRoleToggle(user.username, user.role)}
                    />
                  </div>

                  {/* Delete button */}
                  <button
                    className="btn btn-sm btn-outline-danger"
                    title="Delete this user"
                    disabled={isSysadmin}
                    onClick={() => handleDelete(user.username)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
