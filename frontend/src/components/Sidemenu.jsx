import { NavLink } from 'react-router-dom';

/**
 * Admin side menu — replaces _sidemenu.hbs.
 * Shown on admin pages (Users, Statistics).
 */
export default function Sidemenu() {
  return (
    <div className="bg-light border-end" style={{ width: 250, minHeight: 'calc(100vh - 56px)' }}>
      <div className="list-group list-group-flush">
        <div
          className="list-group-item border-0 fw-bold text-muted"
          style={{ fontSize: '0.85rem' }}
        >
          Operations
        </div>

        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `list-group-item list-group-item-action${isActive ? ' active' : ''}`
          }
        >
          Users
        </NavLink>

        <NavLink
          to="/admin/statistics"
          className={({ isActive }) =>
            `list-group-item list-group-item-action${isActive ? ' active' : ''}`
          }
        >
          Statistics
        </NavLink>

        <div
          className="list-group-item border-0 fw-bold text-muted"
          style={{ fontSize: '0.85rem' }}
        >
          Maintenance
        </div>

        <a href="#maintenance" className="list-group-item list-group-item-action">
          Maintenance
        </a>
      </div>
    </div>
  );
}
