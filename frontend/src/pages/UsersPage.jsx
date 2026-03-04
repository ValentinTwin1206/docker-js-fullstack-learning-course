import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

import Navbar from '../components/Navbar';
import Sidemenu from '../components/Sidemenu';
import Pagination from '../components/Pagination';
import UsersTable from '../components/users/UsersTable';
import { getUsersPaginated } from '../api/users';

/**
 * Admin "Registered Users" page — replaces users.hbs.
 * Provides search, items-per-page selector, paginated table with role toggle and delete.
 */
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const res = await getUsersPaginated({ page, limit, username: search });

      if (!res.ok) {
        toast.error('Could not fetch users');
        return;
      }

      const { users: data, total: t, limit: l, page: p } = res.data || res;
      setUsers(data || []);
      setTotal(t ?? 0);
      setTotalPages(Math.ceil((t ?? 0) / (l ?? limit)));
      setPage(p ?? page);
    } catch {
      toast.error('Error fetching users');
    }
  }, [page, limit, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Search handler — only query when ≥3 chars or empty
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (value.length >= 3 || value.length === 0) {
      setPage(1);
    }
  };

  // Items per page change
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  // Range text (e.g. "1-10 of 500")
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const rangeText = `${start}–${end} of ${total}`;

  return (
    <>
      <Navbar />

      <div className="d-flex">
        <Sidemenu />

        <div className="flex-grow-1 p-4">
          <h4 className="mb-4">Registered Users</h4>

          {/* Search & Display Controls */}
          <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
            <input
              type="text"
              className="form-control w-50"
              placeholder="Search by username (min 3 letters)"
              value={search}
              onChange={handleSearchChange}
            />

            <div className="d-flex align-items-center gap-2">
              <label htmlFor="itemsPerPage" className="form-label mb-0">
                Show:
              </label>
              <select
                id="itemsPerPage"
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={limit}
                onChange={handleLimitChange}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-muted ms-2 small">{rangeText}</span>
            </div>
          </div>

          {/* Table */}
          <UsersTable users={users} onRefresh={loadUsers} />

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </>
  );
}
