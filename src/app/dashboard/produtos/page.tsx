'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertTriangle,
  DollarSign
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Product {
  id: string
  name: string
  category: 'BEVERAGES' | 'SNACKS' | 'GAMES' | 'OTHER'
  price: number
  stock: number
  minStock: number
  description?: string | null
  isActive: boolean
}

const categories = [
  { value: 'BEVERAGES', label: 'Bebidas' },
  { value: 'SNACKS', label: 'Petiscos' },
  { value: 'GAMES', label: 'Jogos' },
  { value: 'OTHER', label: 'Outros' }
]

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    category: 'BEVERAGES' as Product['category'],
    price: '',
    stock: '',
    minStock: '',
    description: '',
    isActive: true
  })

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        description: product.description || '',
        isActive: product.isActive
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        category: 'BEVERAGES',
        price: '',
        stock: '',
        minStock: '5',
        description: '',
        isActive: true
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        minStock: parseInt(formData.minStock, 10),
        description: formData.description,
        isActive: formData.isActive
      }

      const res = editingProduct
        ? await apiFetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        : await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar produto')
      }

      await loadProducts()
      setShowModal(false)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    try {
      const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
    }
  }

  const updateStock = async (product: Product, newStock: number) => {
    const safeStock = Math.max(0, newStock)
    try {
      const res = await apiFetch(`/api/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ stock: safeStock })
      })
      if (res.ok) {
        const updated = await res.json()
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
      }
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'ALL' || product.category === selectedCategory
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.isActive).length
  const lowStockProducts = products.filter(
    (p) => p.stock <= p.minStock && p.minStock > 0
  ).length
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

  const getCategoryLabel = (category: string) => {
    return categories.find((c) => c.value === category)?.label || category
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="ALL">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Novo Produto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total de Produtos</p>
            <p className="text-2xl font-bold text-white">{totalProducts}</p>
          </div>
          <Package className="h-7 w-7 text-blue-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Produtos Ativos</p>
            <p className="text-2xl font-bold text-green-400">{activeProducts}</p>
          </div>
          <Package className="h-7 w-7 text-green-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Estoque Baixo</p>
            <p className="text-2xl font-bold text-red-400">{lowStockProducts}</p>
          </div>
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Valor em Estoque</p>
            <p className="text-2xl font-bold text-orange-400">
              R$ {totalValue.toFixed(2)}
            </p>
          </div>
          <DollarSign className="h-7 w-7 text-orange-400" />
        </div>
      </div>

      {lowStockProducts > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Atenção: {lowStockProducts} produto(s) estão com estoque igual ou abaixo do mínimo configurado.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando estoque do banco...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400">
          Nenhum produto cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                      {product.stock <= product.minStock && product.minStock > 0 && (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-200">
                      {getCategoryLabel(product.category)}
                    </span>
                    {product.description && (
                      <p className="text-sm text-gray-400 mt-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Preço:</span>
                    <span className="text-lg font-bold text-orange-400">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Estoque:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateStock(product, product.stock - 1)}
                        className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold"
                      >
                        -
                      </button>
                      <span
                        className={`text-sm font-bold px-2 ${product.stock <= product.minStock && product.minStock > 0
                            ? 'text-red-400'
                            : 'text-white'
                          }`}
                      >
                        {product.stock}
                      </span>
                      <button
                        onClick={() => updateStock(product, product.stock + 1)}
                        className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Estoque Mínimo:</span>
                    <span className="text-sm text-gray-200">{product.minStock}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Product['category']
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Estoque *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mínimo *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingProduct ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
