'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Student } from '@/lib/supabase'
import { Plus, Edit, Trash2, Users, User, Phone, Mail } from 'lucide-react'

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone_number: ''
  })
  const formRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    if (showForm) {
      // Form görünür olduktan sonra sayfayı yukarı kaydır
      setTimeout(() => {
        if (formRef.current) {
          const y = formRef.current.getBoundingClientRect().top + window.scrollY - 12
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 0)
    }
  }, [showForm])

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name')
      
      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Öğrenciler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setMessage('Öğrenci adı gereklidir')
      return
    }
    
    setSaving(true)
    setMessage('')
    
    try {
      if (editingStudent) {
        // Güncelle
        const { error } = await supabase
          .from('students')
          .update(formData)
          .eq('id', editingStudent.id)
        
        if (error) throw error
        setMessage('Öğrenci başarıyla güncellendi!')
      } else {
        // Yeni öğrenci ekle
        const { error } = await supabase
          .from('students')
          .insert(formData)
        
        if (error) throw error
        setMessage('Öğrenci başarıyla eklendi!')
      }
      
      setShowForm(false)
      setEditingStudent(null)
      setFormData({ name: '', phone_number: '' })
      fetchStudents()
    } catch (error) {
      console.error('Öğrenci kaydedilirken hata:', error)
      setMessage('Öğrenci kaydedilirken hata oluştu. Lütfen daha sonra tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      phone_number: student.phone_number || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) return
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setMessage('Öğrenci başarıyla silindi!')
      fetchStudents()
    } catch (error) {
      console.error('Öğrenci silinirken hata:', error)
      setMessage('Öğrenci silinirken hata oluştu. Lütfen daha sonra tekrar deneyin.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <div>
                <h2 className="text-lg font-bold">Öğrenci Yönetimi</h2>
                <p className="text-green-100 text-sm">Öğrencileri ekleyin ve düzenleyin</p>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] bg-white/20 px-2 py-1 rounded-md">
                    <Users className="w-3 h-3" />
                    Toplam {students.length} öğrenci
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(true)
                setEditingStudent(null)
                setFormData({ name: '', phone_number: '' })
              }}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Öğrenci Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-green-900 text-sm">
              {editingStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Öğrenci Adı
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Telefon Numarası (Opsiyonel)
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                placeholder="05XX XXX XX XX"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor...' : editingStudent ? 'Güncelle' : 'Ekle'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowForm(false)
                  setEditingStudent(null)
                  setFormData({ name: '', phone_number: '' })
                  setMessage('')
                }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 text-sm disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Öğrenci Listesi */}
      <div className="space-y-2">
        {students.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium text-sm">Henüz öğrenci bulunmuyor</p>
            <p className="text-gray-500 text-xs mt-1">Yeni öğrenci eklemek için + butonuna tıklayın</p>
          </div>
        ) : (
          students.map(student => (
            <div key={student.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 space-y-3">
                {/* Öğrenci Bilgisi */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {student.name}
                      </h3>
                    </div>
                    {student.phone_number && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{student.phone_number}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Aksiyon Butonları */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(student)}
                      className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all duration-200"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Öğrenci Detayları */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>ID: {student.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>Kayıt: {new Date(student.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mesaj */}
      {message && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${
          message.includes('başarıyla') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
} 