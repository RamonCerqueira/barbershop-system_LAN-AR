'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Edit, Trash2, Users, Phone, Mail, Award } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

interface Specialty {
  id?: string
  specialty: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
}

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string
  role: string
  customRole: string | null
  salary: number
  commissionRate: number
  hireDate: string
  isActive: boolean
  specialties: Specialty[]
}

const ROLE_LABELS: Record<string, string> = {
  BARBER: 'Barbeiro',
  ADMIN: 'Administrador',
  MARKETING: 'Marketing',
  GENERAL_SERVICES: 'Serviços Gerais',
  PODIATRY: 'Podologia',
  MASSAGE: 'Massagem',
  OTHER: 'Outro'
}

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ColaboradoresPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'BARBER',
    customRole: '',
    salary: '',
    commissionRate: '40',
    hireDate: getLocalDateStr(),
    specialtiesText: ''
  })

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const openModalForCreate = () => {
    setEditingEmployee(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'BARBER',
      customRole: '',
      salary: '',
      commissionRate: '40',
      hireDate: getLocalDateStr(),
      specialtiesText: ''
    })
    setIsModalOpen(true)
  }

  const openModalForEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormData({
      name: emp.name,
      email: emp.email || '',
      phone: emp.phone,
      role: emp.role,
      customRole: emp.customRole || '',
      salary: String(emp.salary || 0),
      commissionRate: String(emp.commissionRate || 0),
      hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
      specialtiesText: (emp.specialties || []).map((s) => s.specialty).join(', ')
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const specialties = formData.specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ specialty: s, level: 'ADVANCED' }))

      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        role: formData.role,
        customRole: formData.role === 'OTHER' ? formData.customRole : null,
        salary: parseFloat(formData.salary || '0'),
        commissionRate: parseFloat(formData.commissionRate || '0'),
        hireDate: formData.hireDate,
        specialties
      }

      const res = editingEmployee
        ? await apiFetch(`/api/employees/${editingEmployee.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await apiFetch('/api/employees', {
            method: 'POST',
            body: JSON.stringify(payload)
          })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar colaborador')
      }

      await loadEmployees()
      setIsModalOpen(false)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return
    try {
      const res = await apiFetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir colaborador:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciar Colaboradores</h1>
          <p className="text-sm text-gray-400">
            Equipe cadastrada no PostgreSQL com funções, salários, comissões e especialidades
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/colaboradores-especialidades"
            className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            <Award size={18} className="mr-2 text-orange-400" />
            Matriz de Especialidades
          </Link>
          <button
            onClick={openModalForCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition duration-200"
          >
            <PlusCircle className="mr-2" size={20} />
            Adicionar Colaborador
          </button>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Carregando equipe do banco...</p>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p>Nenhum colaborador cadastrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nome / Contato</th>
                  <th className="py-3.5 px-4">Função</th>
                  <th className="py-3.5 px-4">Salário Base</th>
                  <th className="py-3.5 px-4">Comissão</th>
                  <th className="py-3.5 px-4">Especialidades</th>
                  <th className="py-3.5 px-4">Admissão</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-sm">
                {employees.map((colab) => (
                  <tr key={colab.id} className="hover:bg-gray-750">
                    <td className="py-4 px-4">
                      <div className="font-medium text-white">{colab.name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {colab.phone}
                        </span>
                        {colab.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {colab.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400 font-medium">
                        {colab.role === 'OTHER' && colab.customRole
                          ? colab.customRole
                          : ROLE_LABELS[colab.role] || colab.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white font-medium">
                      R$ {(colab.salary || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-green-400 font-medium">
                      {colab.commissionRate || 0}%
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(colab.specialties || []).length === 0 ? (
                          <span className="text-xs text-gray-500">Sem especialidades</span>
                        ) : (
                          colab.specialties.map((sp, idx) => (
                            <span
                              key={sp.id || idx}
                              className="px-2 py-0.5 text-xs bg-gray-700 text-gray-200 rounded"
                            >
                              {sp.specialty}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {new Date(colab.hireDate).toLocaleDateString('pt-BR', {
                        timeZone: 'UTC'
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex space-x-2">
                        <button
                          onClick={() => openModalForEdit(colab)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(colab.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 text-white">
              {editingEmployee ? 'Editar Colaborador' : 'Adicionar Colaborador'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Função *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                  >
                    <option value="BARBER">Barbeiro</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="PODIATRY">Podologia</option>
                    <option value="MASSAGE">Massagem</option>
                    <option value="GENERAL_SERVICES">Serviços Gerais</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              </div>

              {formData.role === 'OTHER' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Função Personalizada
                  </label>
                  <input
                    type="text"
                    value={formData.customRole}
                    onChange={(e) =>
                      setFormData({ ...formData, customRole: e.target.value })
                    }
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Salário Base (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionRate: e.target.value })
                    }
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Data de Admissão
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) =>
                      setFormData({ ...formData, hireDate: e.target.value })
                    }
                    className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Especialidades (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.specialtiesText}
                  onChange={(e) =>
                    setFormData({ ...formData, specialtiesText: e.target.value })
                  }
                  placeholder="Corte, Barba, Degradê, Sobrancelha, Tintura"
                  className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white border border-gray-700"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {saving ? 'Salvando...' : editingEmployee ? 'Salvar Alterações' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
