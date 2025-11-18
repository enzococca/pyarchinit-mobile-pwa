import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Shield, Clock, Mail, User } from 'lucide-react';

/**
 * AdminPanel - Pannello di amministrazione per gestire utenti
 *
 * Funzionalità:
 * - Visualizza tutti gli utenti registrati
 * - Approva/Rifiuta utenti in stato "pending"
 * - Mostra statistiche utenti
 */
export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento degli utenti');
      }

      const data = await response.json();
      setUsers(data.users || []);

      // Calculate stats
      const pending = data.users.filter(u => u.approval_status === 'pending').length;
      const approved = data.users.filter(u => u.approval_status === 'approved').length;
      setStats({
        pending,
        approved,
        total: data.users.length
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/admin/users/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Errore nell\'approvazione');
      }

      setSuccess('Utente approvato con successo!');
      await loadUsers();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectUser = async (userId) => {
    if (!confirm('Sei sicuro di voler rifiutare questo utente?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/admin/users/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Errore nel rifiuto');
      }

      setSuccess('Utente rifiutato');
      await loadUsers();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: {
        bg: '#fef3c7',
        color: '#92400e',
        icon: Clock,
        text: 'In attesa'
      },
      approved: {
        bg: '#d1fae5',
        color: '#065f46',
        icon: CheckCircle,
        text: 'Approvato'
      },
      rejected: {
        bg: '#fee2e2',
        color: '#991b1b',
        icon: XCircle,
        text: 'Rifiutato'
      }
    };

    const config = styles[status] || styles.pending;
    const Icon = config.icon;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: config.bg,
        color: config.color,
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: '600'
      }}>
        <Icon size={14} />
        {config.text}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isAdmin = role === 'admin';
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: isAdmin ? '#dbeafe' : '#f3f4f6',
        color: isAdmin ? '#1e40af' : '#374151',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {isAdmin && <Shield size={12} />}
        {isAdmin ? 'Admin' : 'Utente'}
      </span>
    );
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <Shield size={32} />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
            Pannello Amministrazione
          </h1>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
          Gestisci gli utenti e approva le richieste di registrazione
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                In attesa
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {stats.approved}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Approvati
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              background: '#dbeafe',
              color: '#1e40af',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Totale utenti
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <XCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {/* Users List */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Users size={24} />
            Utenti Registrati
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Caricamento...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Nessun utente registrato
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Utente
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Email
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Ruolo
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Stato
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>
                            {user.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px' }}>
                        <Mail size={16} style={{ color: '#9ca3af' }} />
                        {user.email}
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {getRoleBadge(user.role)}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {getStatusBadge(user.approval_status)}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      {user.approval_status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => approveUser(user.id)}
                            disabled={loading}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            <CheckCircle size={16} />
                            Approva
                          </button>
                          <button
                            onClick={() => rejectUser(user.id)}
                            disabled={loading}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            <XCircle size={16} />
                            Rifiuta
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
