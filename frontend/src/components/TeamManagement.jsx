/**
 * TeamManagement - Gestione team membri del progetto
 *
 * Features:
 * - Lista team members con ruoli e badge
 * - Form per invitare nuovi membri via email
 * - Rimuovi membri (solo owner/admin)
 * - Aggiorna ruoli membri (solo owner/admin)
 * - Validazione permessi in base al ruolo utente
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/TeamManagement.css';

const TeamManagement = ({ projectId, currentUserRole, onClose }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if current user can manage team
  const canManageTeam = ['owner', 'admin'].includes(currentUserRole);

  useEffect(() => {
    if (projectId) {
      fetchTeamMembers();
    }
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${projectId}`);
      if (response.data.project && response.data.project.team_members) {
        setTeamMembers(response.data.project.team_members);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/projects/${projectId}/team`, {
        email: inviteEmail,
        role: inviteRole
      });

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');

      // Refresh team members list
      await fetchTeamMembers();
    } catch (err) {
      console.error('Error inviting member:', err);
      setError(err.response?.data?.detail || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from the project?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.delete(`/projects/${projectId}/team/${userId}`);
      setSuccess(`${userName} removed from project`);

      // Refresh team members list
      await fetchTeamMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      owner: 'role-badge-owner',
      admin: 'role-badge-admin',
      member: 'role-badge-member',
      viewer: 'role-badge-viewer'
    };
    return classes[role] || 'role-badge-default';
  };

  const getRoleLabel = (role) => {
    const labels = {
      owner: 'Owner',
      admin: 'Admin',
      member: 'Member',
      viewer: 'Viewer'
    };
    return labels[role] || role;
  };

  return (
    <div className="team-management">
      {/* Header */}
      <div className="team-header">
        <h3>Team Members ({teamMembers.length})</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      {/* Invite Form (only for owner/admin) */}
      {canManageTeam && (
        <div className="invite-section">
          <h4>Invite New Member</h4>
          <form onSubmit={handleInvite} className="invite-form">
            <div className="form-row">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={loading}
                className="email-input"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={loading}
                className="role-select"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="btn-invite"
              >
                {loading ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Members List */}
      <div className="members-list">
        {loading && teamMembers.length === 0 ? (
          <div className="loading-state">Loading team members...</div>
        ) : teamMembers.length === 0 ? (
          <div className="empty-state">
            <p>No team members yet.</p>
            {canManageTeam && <p>Invite colleagues to collaborate!</p>}
          </div>
        ) : (
          <div className="members-grid">
            {teamMembers.map((member) => (
              <div key={member.user_id} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">
                    {(member.name || member.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="member-details">
                    <div className="member-name">{member.name || member.email || 'Unknown'}</div>
                    <div className="member-email">{member.email}</div>
                  </div>
                </div>

                <div className="member-actions">
                  <span className={`role-badge ${getRoleBadgeClass(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>

                  {/* Remove button (only for owner/admin, can't remove owner) */}
                  {canManageTeam && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id, member.name || member.email || 'this member')}
                      disabled={loading}
                      className="btn-remove"
                      title="Remove member"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permissions Info */}
      {!canManageTeam && (
        <div className="info-box">
          <strong>Note:</strong> Only owners and admins can invite or remove team members.
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
