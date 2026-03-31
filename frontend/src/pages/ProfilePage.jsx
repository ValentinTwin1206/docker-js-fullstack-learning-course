import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast           from 'react-hot-toast';

import { useAuth }    from '../hooks/useAuth';
import Navbar         from '../components/Navbar';
import ProfileForm    from '../components/profile/ProfileForm';
import ApiKeySection  from '../components/profile/ApiKeySection';
import { deleteUser,
         updateUser } from '../api/users';
import { getApiKeys } from '../api/apikeys';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  // 
  const navigate = useNavigate();
  const username = user?.username;

  const [apiKeys, setApiKeys] = useState([]);

  // Load API keys
  const loadApiKeys = useCallback(async () => {
    if (!username) return;
    try {
      const res = await getApiKeys(username);
      if (res.ok && res.success) {
        setApiKeys(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load API keys', err);
    }
  }, [username]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  // Update profile
  const handleUpdateProfile = async ({ firstname, lastname, email }) => {
    const res = await updateUser(username, { firstname, lastname, email });
    if (res.ok && res.success) {
      toast.success(res.message || 'Profile updated');
      await refreshUser(); // refresh session data
    } else {
      toast.error(res.message || 'Update failed');
    }
    return res;
  };

  // Delete account
  const handleDeleteAccount = async () => {

    try {
      const res = await deleteUser(username);
      if (res.ok && res.success) {
        toast.success('Account deleted');
        navigate('/login'); // redirect
      } else { toast.error(res.message || 'Delete failed'); }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    }
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <div className="d-flex flex-wrap justify-content-center gap-4">
          {/* LEFT SIDE: User Info + API Keys */}
          <div className="card shadow-sm p-3" style={{ flex: '0 0 380px' }}>
            <div className="text-center">
              <h4 className="mb-1">{user.username}</h4>
              <p className="mb-3">{user.firstname} {user.lastname}</p>
            </div>

            <ApiKeySection
              username={username}
              apiKeys={apiKeys}
              onKeysChanged={loadApiKeys}
            />
          </div>

          {/* RIGHT SIDE: Profile Form */}
          <div className="card shadow-sm p-4 flex-grow-1" style={{ minWidth: 300, maxWidth: 600 }}>
            <ProfileForm user={user} onSubmit={handleUpdateProfile} onDelete={handleDeleteAccount}/>
          </div>
        </div>
      </div>
    </>
  );
}
