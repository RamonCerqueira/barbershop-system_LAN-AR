'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Star,
  Award,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Specialty {
  id?: string
  specialty: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  isActive?: boolean
}

interface Collaborator {
  id: string
  name: string
  email: string | null
  phone: string
  role: 'BARBER' | 'ADMIN' | 'MARKETING' | 'GENERAL_SERVICES' | 'PODIATRY' | 'MASSAGE' | 'OTHER'
  customRole?: string | null
  hireDate: string
  isActive: boolean
  specialties: Specialty[]
}

const availableSpecialties = [
  'Corte',
  'Corte Livre',
  'Barba',
  'Bigode',
  'Sobrancelha',
  'Tintura',
  'Luzes',
  'Relaxamento',
  'Hidratação',
  'Massagem Capilar',
  'Limpeza de Pele',
  'Design de Sobrancelha',
  'Podologia',
  'Massagem Corporal'
]

const roleTranslations: Record<string, string> = {
  BARBER: 'Barbeiro',
  ADMIN: 'Administrador',
  MARKETING: 'Marketing',
  GENERAL_SERVICES: 'Serviços Gerais',
  PODIATRY: 'Podologia',
  MASSAGE: 'Massagem',
  OTHER: 'Outro'
}

const levelTranslations: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  EXPERT: 'Especialista'
}

const levelColors: Record<string, string> = {
  BEGINNER: 'bg-gray-700 text-gray-200',
  INTERMEDIATE: 'bg-blue-500/20 text-blue-300',
  ADVANCED: 'bg-green-500/20 text-green-300',
  EXPERT: 'bg-purple-500/20 text-purple-300'
}

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ColaboradoresEspecialidades() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null)
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null)

  const [newCollaborator, setNewCollaborator] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'BARBER' as Collaborator['role'],
    customRole: '',
    hireDate: getLocalDateStr()
  })

  const [newSpecialty, setNewSpecialty] = useState({
    specialty: '',
    customSpecialty: '',
    level: 'INTERMEDIATE' as Specialty['level']
  })

  const loadCollaborators = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setCollaborators(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCollaborators()
  }, [loadCollaborators])

  const filteredCollaborators = collaborators.filter((collaborator) => {
    const matchesSearch =
      collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collaborator.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      collaborator.specialties.some((s) =>
        s.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      )
    const matchesRole = selectedRole === 'ALL' || collaborator.role === selectedRole
    return matchesSearch && matchesRole
  })

  const handleSaveCollaborator = async () => {
    if (!newCollaborator.name || !newCollaborator.phone) {
      alert('Preencha nome e telefone')
      return
    }

    try {
      const res = editingCollaborator
        ? await apiFetch(`/api/employees/${editingCollaborator.id}`, {
            method: 'PUT',
            body: JSON.stringify(newCollaborator)
          })
        : await apiFetch('/api/employees', {
            method: 'POST',
            body: JSON.stringify({
              ...newCollaborator,
              specialties: []
            })
          })

      if (res.ok) {
        await loadCollaborators()
        setShowAddModal(false)
        setEditingCollaborator(null)
      }
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error)
    }
  }

  const handleAddSpecialty = async () => {
    if (!selectedCollaborator) return
    const specialtyName =
      newSpecialty.specialty === 'CUSTOM'
        ? newSpecialty.customSpecialty.trim()
        : newSpecialty.specialty

    if (!specialtyName) return

    const updatedSpecialties = [
      ...selectedCollaborator.specialties.filter((s) => s.specialty !== specialtyName),
      {
        specialty: specialtyName,
        level: newSpecialty.level,
        isActive: true
      }
    ]

    try {
      const res = await apiFetch(`/api/employees/${selectedCollaborator.id}`, {
        method: 'PUT',
        body: JSON.stringify({ specialties: updatedSpecialties })
      })
      if (res.ok) {
        await loadCollaborators()
        setShowSpecialtyModal(false)
        setNewSpecialty({ specialty: '', customSpecialty: '', level: 'INTERMEDIATE' })
      }
    } catch (error) {
      console.error('Erro ao adicionar especialidade:', error)
    }
  }

  const handleRemoveSpecialty = async (collaborator: Collaborator, specialtyName: string) => {
    const updatedSpecialties = collaborator.specialties.filter(
      (s) => s.specialty !== specialtyName
    )
    try {
      const res = await apiFetch(`/api/employees/${collaborator.id}`, {
        method: 'PUT',
        body: JSON.stringify({ specialties: updatedSpecialties })
      })
      if (res.ok) {
        await loadCollaborators()
      }
    } catch (error) {
      console.error('Erro ao remover especialidade:', error)
    }
  }

  const toggleCollaboratorStatus = async (collaborator: Collaborator) => {
    try {
      const res = await apiFetch(`/api/employees/${collaborator.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !collaborator.isActive })
      })
      if (res.ok) {
        await loadCollaborators()
      }
    } catch (error) {
      console.error('Erro ao alternar status:', error)
    }
  }

  const deleteCollaborator = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return
    try {
      const res = await apiFetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir colaborador:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Colaboradores & Matriz de Especialidades
          </h1>
          <p className="text-sm text-gray-400">
            Gerencie as competências técnicas e níveis de cada profissional no banco
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCollaborator(null)
            setNewCollaborator({
              name: '',
              email: '',
              phone: '',
              role: 'BARBER',
              customRole: '',
              hireDate: getLocalDateStr()
            })
            setShowAddModal(true)
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total de Colaboradores</p>
            <p className="text-2xl font-bold text-white">{collaborators.length}</p>
          </div>
          <Users className="h-8 w-8 text-blue-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Colaboradores Ativos</p>
            <p className="text-2xl font-bold text-green-400">
              {collaborators.filter((c) => c.isActive).length}
            </p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Barbeiros</p>
            <p className="text-2xl font-bold text-orange-400">
              {collaborators.filter((c) => c.role === 'BARBER').length}
            </p>
          </div>
          <Award className="h-8 w-8 text-orange-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total de Especialidades</p>
            <p className="text-2xl font-bold text-purple-400">
              {collaborators.reduce((acc, c) => acc + c.specialties.length, 0)}
            </p>
          </div>
          <Star className="h-8 w-8 text-purple-400" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nome, email ou especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
        >
          <option value="ALL">Todas as funções</option>
          <option value="BARBER">Barbeiro</option>
          <option value="ADMIN">Administrador</option>
          <option value="MARKETING">Marketing</option>
          <option value="PODIATRY">Podologia</option>
          <option value="MASSAGE">Massagem</option>
          <option value="GENERAL_SERVICES">Serviços Gerais</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      {/* Collaborators Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCollaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{collaborator.name}</h3>
                  <p className="text-sm text-gray-400">
                    {collaborator.email || 'Sem e-mail'} • {collaborator.phone}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
                      {collaborator.role === 'OTHER' && collaborator.customRole
                        ? collaborator.customRole
                        : roleTranslations[collaborator.role]}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        collaborator.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {collaborator.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCollaboratorStatus(collaborator)}
                    className="p-2 text-gray-400 hover:text-white"
                    title={collaborator.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {collaborator.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingCollaborator(collaborator)
                      setNewCollaborator({
                        name: collaborator.name,
                        email: collaborator.email || '',
                        phone: collaborator.phone,
                        role: collaborator.role,
                        customRole: collaborator.customRole || '',
                        hireDate: new Date(collaborator.hireDate).toISOString().split('T')[0]
                      })
                      setShowAddModal(true)
                    }}
                    className="p-2 text-blue-400 hover:text-blue-300"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => deleteCollaborator(collaborator.id)}
                    className="p-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-300">Especialidades</h4>
                  <button
                    onClick={() => {
                      setSelectedCollaborator(collaborator)
                      setShowSpecialtyModal(true)
                    }}
                    className="text-orange-400 hover:text-orange-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <Plus size={16} />
                    <span>Adicionar</span>
                  </button>
                </div>

                {collaborator.specialties.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Nenhuma especialidade cadastrada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collaborator.specialties.map((specialty, idx) => (
                      <div
                        key={specialty.id || idx}
                        className="flex items-center justify-between p-2.5 bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">
                            {specialty.specialty}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              levelColors[specialty.level] || levelColors.INTERMEDIATE
                            }`}
                          >
                            {levelTranslations[specialty.level] || specialty.level}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveSpecialty(collaborator, specialty.specialty)
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo/Editar Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome completo *"
                value={newCollaborator.name}
                onChange={(e) =>
                  setNewCollaborator({ ...newCollaborator, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={newCollaborator.email}
                onChange={(e) =>
                  setNewCollaborator({ ...newCollaborator, email: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
              <input
                type="text"
                placeholder="Telefone *"
                value={newCollaborator.phone}
                onChange={(e) =>
                  setNewCollaborator({ ...newCollaborator, phone: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
              <select
                value={newCollaborator.role}
                onChange={(e) =>
                  setNewCollaborator({
                    ...newCollaborator,
                    role: e.target.value as Collaborator['role']
                  })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
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
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCollaborator}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Especialidade */}
      {showSpecialtyModal && selectedCollaborator && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Adicionar Especialidade — {selectedCollaborator.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Especialidade</label>
                <select
                  value={newSpecialty.specialty}
                  onChange={(e) =>
                    setNewSpecialty({ ...newSpecialty, specialty: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Selecione uma especialidade</option>
                  {availableSpecialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="CUSTOM">Personalizada...</option>
                </select>
              </div>
              {newSpecialty.specialty === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Digite o nome da especialidade"
                  value={newSpecialty.customSpecialty}
                  onChange={(e) =>
                    setNewSpecialty({ ...newSpecialty, customSpecialty: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              )}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nível</label>
                <select
                  value={newSpecialty.level}
                  onChange={(e) =>
                    setNewSpecialty({
                      ...newSpecialty,
                      level: e.target.value as Specialty['level']
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                  <option value="EXPERT">Especialista</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSpecialtyModal(false)}
                className="px-4 py-2 text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSpecialty}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
