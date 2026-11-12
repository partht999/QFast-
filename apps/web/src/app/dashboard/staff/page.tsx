'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/read-api-error';
import { useToast } from '@/components/ui/toast';

const roles = [
  { id: 'WAITER', label: 'Front desk', detail: 'Queue and tables' },
  { id: 'KITCHEN_STAFF', label: 'Kitchen', detail: 'Tickets only' },
  { id: 'CASHIER', label: 'Cashier', detail: 'Queue, tables, and bills' },
  { id: 'MANAGER', label: 'Manager', detail: 'The full workspace' },
];

export default function StaffPage() {
  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();
  const [businessId, setBusinessId] = useState('');
  const [staff, setStaff] = useState<Array<{ id: string; role: string; isActive: boolean; user: { email: string } }>>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('WAITER');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const businesses = await fetch(`${apiUrl}/api/v1/business`, { headers }).then((response) => response.json());
    const current = Array.isArray(businesses) ? businesses[0] : null;
    if (!current) return;
    setBusinessId(current.id);
    const list = await fetch(`${apiUrl}/api/v1/business/${current.id}/staff`, { headers });
    if (list.ok) setStaff(await list.json());
  };

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token || !businessId) return;
    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/business/${businessId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, 'Could not add this person'));
      setUsername('');
      setPassword('');
      toast.success('Staff added', `${username} can sign in with that password.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="ui-title">Staff</h1>
        <p className="ui-copy">Front desk runs the line. Kitchen sees tickets. Cashier closes bills.</p>
      </div>
      <ul className="ui-card divide-y divide-neutral-100">
        {staff.map((person) => (
          <li key={person.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-semibold">{person.user.email}</span>
            <span className="text-neutral-500">{roles.find((item) => item.id === person.role)?.label || person.role}</span>
          </li>
        ))}
        {staff.length === 0 && (
          <li className="px-4 py-8 text-sm leading-6 text-neutral-500">
            No staff yet. Add a username for the front desk, kitchen, or cashier. They sign in with that username and password.
          </li>
        )}
      </ul>
      <form onSubmit={submit} className="ui-card space-y-3 p-5">
        <label className="block text-sm font-semibold">
          Username
          <input required value={username} onChange={(event) => setUsername(event.target.value)} className="ui-field mt-1" />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="ui-field mt-1" />
        </label>
        <label className="block text-sm font-semibold">
          Mode
          <select value={role} onChange={(event) => setRole(event.target.value)} className="ui-field mt-1">
            {roles.map((item) => (
              <option key={item.id} value={item.id}>{item.label} — {item.detail}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={saving} className="ui-btn-primary">
          {saving ? 'Adding…' : 'Add staff'}
        </button>
      </form>
    </section>
  );
}
