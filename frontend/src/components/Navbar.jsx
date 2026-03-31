import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Top navigation bar — replaces _navbar.hbs.
 * Shows Home, Admin (if admin/sysadmin), Profile dropdown with logout.
 */
export default function Navbar() {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'sysadmin';

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container-fluid">
        <a className="navbar-brand" href="/home">FancyFileServer</a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Left side */}
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/home">
                Home
              </NavLink>
            </li>

            {isAdmin && (
              <li className="nav-item">
                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/admin/users">
                  Admin
                </NavLink>
              </li>
            )}
          </ul>

          {/* Right side — Profile dropdown */}
          <ul className="navbar-nav ms-auto">
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="navbarProfile"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Profile
              </a>
              <ul className="dropdown-menu" aria-labelledby="navbarProfile">
                <li>
                  <NavLink id="profileLink" className="dropdown-item" to="/profile">Edit Profile</NavLink>
                </li>
                <li>
                  <a className="dropdown-item" href="#" onClick={handleLogout}>Logout</a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
