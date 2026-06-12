import React, { useEffect, useState } from 'react';
import { AppUser } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'Vendedor' as AppUser['role'],
  sellerCode: '',
  active: true,
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      setUsers(await api.getAppUsers());
    } catch (error) {
      setMessage({ type: 'error', text: api.getErrorMessage(error, 'No se pudieron cargar los usuarios.') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const created = await api.createAppUser(
        {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          sellerCode: form.sellerCode.trim() || form.email.split('@')[0],
          active: form.active,
        },
        form.password
      );
      setUsers((prev) => [created, ...prev.filter((user) => user.id !== created.id)]);
      setForm(initialForm);
      setMessage({
        type: 'success',
        text: 'Usuario creado. Si Supabase exige confirmación de email, el usuario deberá confirmar antes de ingresar.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: api.getErrorMessage(error, 'No se pudo crear el usuario.') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Crear usuarios</h2>
        <p className="text-sm text-gray-500">Da acceso a vendedores, gerentes y administradores.</p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          message.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Nuevo Usuario</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              placeholder="Juan Perez"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full rounded-lg border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              placeholder="juan@empresa.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Contraseña Inicial</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Código Vendedor</label>
            <input
              value={form.sellerCode}
              onChange={(e) => setForm({ ...form, sellerCode: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              placeholder="V001"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AppUser['role'] })}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="Vendedor">Vendedor</option>
              <option value="Gerente">Gerente</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 self-end rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Activo
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSaving ? 'Creando usuario...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Usuarios Creados</h3>
          <button onClick={loadUsers} className="text-sm font-bold text-green-700 hover:text-green-800">Actualizar</button>
        </div>
        {isLoading ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
            Todavía no hay usuarios cargados en la tabla de administración.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
                  <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">{user.role}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{user.sellerCode}</span>
                  <span className={`rounded-full px-2 py-1 ${user.active ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700'}`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminUsers;
