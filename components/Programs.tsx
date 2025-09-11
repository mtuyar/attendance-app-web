'use client'

import { useState, useEffect } from 'react'
import { supabase, Program, Student } from '@/lib/supabase'
import { Plus, Edit, Trash2, Settings, Calendar, Users } from 'lucide-react'

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    day_of_week: '',
    time: ''
  })
  // Öğrenciler ve üyelik seçimleri
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [membershipCounts, setMembershipCounts] = useState<Record<string, number>>({})
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => {
    fetchPrograms()
    fetchStudents()
    fetchMembershipCounts()
  }, [])

  const fetchMembershipCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('program_students')
        .select('program_id')
      if (error) throw error
      const counts: Record<string, number> = {}
      ;(data || []).forEach((row: any) => {
        const pid = row.program_id as string
        counts[pid] = (counts[pid] || 0) + 1
      })
      setMembershipCounts(counts)
    } catch (error) {
      console.error('Üyelik sayıları yüklenirken hata:', error)
    }
  }

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name')
      
      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Programlar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

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
    }
  }

  const loadMembership = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('program_students')
        .select('student_id')
        .eq('program_id', programId)
      if (error) throw error
      const ids = (data || []).map(r => r.student_id as string)
      setSelectedStudentIds(ids)
    } catch (error) {
      console.error('Üyelikler yüklenirken hata:', error)
      setSelectedStudentIds([])
    }
  }

  const syncMembership = async (programId: string, nextIds: string[]) => {
    // Mevcut üyelikleri al, farkları uygula
    const { data: current, error: curErr } = await supabase
      .from('program_students')
      .select('student_id')
      .eq('program_id', programId)
    if (curErr) throw curErr
    const currentIds = new Set((current || []).map(r => r.student_id as string))
    const nextSet = new Set(nextIds)

    const toAdd = nextIds.filter(id => !currentIds.has(id))
    const toRemove = Array.from(currentIds).filter(id => !nextSet.has(id))

    // Ekle
    if (toAdd.length > 0) {
      const insertRows = toAdd.map(student_id => ({ program_id: programId, student_id }))
      const { error: insErr } = await supabase
        .from('program_students')
        .insert(insertRows)
      if (insErr) throw insErr
    }

    // Sil
    if (toRemove.length > 0) {
      const { error: delErr } = await supabase
        .from('program_students')
        .delete()
        .eq('program_id', programId)
        .in('student_id', toRemove)
      if (delErr) throw delErr
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setMessage('Program adı gereklidir')
      return
    }
    
    setSaving(true)
    setMessage('')
    
    try {
      if (editingProgram) {
        // Güncelle
        const { error: updErr } = await supabase
          .from('programs')
          .update(formData)
          .eq('id', editingProgram.id)
        if (updErr) throw updErr

        // Üyelikleri senkronize et
        await syncMembership(editingProgram.id, selectedStudentIds)

        setMessage('Program ve üyeler başarıyla güncellendi!')
        await fetchMembershipCounts()
      } else {
        // Yeni program ekle ve id al
        const { data: inserted, error: insErr } = await supabase
          .from('programs')
          .insert({ ...formData })
          .select()
          .single()
        if (insErr) throw insErr

        // Üyelikleri senkronize et (varsa seçimler)
        if (inserted?.id) {
          await syncMembership(inserted.id, selectedStudentIds)
        }

        setMessage('Program ve üyeler başarıyla eklendi!')
        await fetchMembershipCounts()
      }
      
      setShowForm(false)
      setEditingProgram(null)
      setFormData({ name: '', day_of_week: '', time: '' })
      setSelectedStudentIds([])
      fetchPrograms()
    } catch (error) {
      console.error('Program kaydedilirken hata:', error)
      setMessage('Program kaydedilirken hata oluştu. Lütfen daha sonra tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (program: Program) => {
    setEditingProgram(program)
    setFormData({
      name: program.name,
      day_of_week: program.day_of_week || '',
      time: program.time || ''
    })
    setSelectedStudentIds([])
    setShowForm(true)
    // Üyelikleri getir
    loadMembership(program.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu programı silmek istediğinizden emin misiniz?')) return
    
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setMessage('Program başarıyla silindi!')
      fetchPrograms()
      fetchMembershipCounts()
    } catch (error) {
      console.error('Program silinirken hata:', error)
      setMessage('Program silinirken hata oluştu. Lütfen daha sonra tekrar deneyin.')
    }
  }

  const getDayName = (day: string) => {
    const days: { [key: string]: string } = {
      'monday': 'Pazartesi',
      'tuesday': 'Salı',
      'wednesday': 'Çarşamba',
      'thursday': 'Perşembe',
      'friday': 'Cuma',
      'saturday': 'Cumartesi',
      'sunday': 'Pazar'
    }
    return days[day] || day
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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <div>
                <h2 className="text-lg font-bold">Program Yönetimi</h2>
                <p className="text-indigo-100 text-sm">Programları oluşturun ve düzenleyin</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(true)
                setEditingProgram(null)
                setFormData({ name: '', day_of_week: '', time: '' })
                setSelectedStudentIds([])
                setMessage('')
              }}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Program Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-blue-900 text-sm">
              {editingProgram ? 'Program Düzenle' : 'Yeni Program Ekle'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Program Adı
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Gün
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-sm"
                  required
                >
                  <option value="">Gün seçin</option>
                  <option value="monday">Pazartesi</option>
                  <option value="tuesday">Salı</option>
                  <option value="wednesday">Çarşamba</option>
                  <option value="thursday">Perşembe</option>
                  <option value="friday">Cuma</option>
                  <option value="saturday">Cumartesi</option>
                  <option value="sunday">Pazar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Saat
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Öğrenci Seçimi */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Öğrenciler (Bu programa bağlı öğrenciler)
              </label>
              {/* Arama */}
              <div className="mb-2">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Öğrenci ara..."
                  className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <div className="max-h-56 overflow-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                {students.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500">Öğrenci bulunamadı</div>
                ) : (
                  students
                    .filter(s =>
                      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      (s.phone_number && s.phone_number.includes(studentSearch))
                    )
                    .map(s => {
                      const checked = selectedStudentIds.includes(s.id)
                      return (
                        <label key={s.id} className="flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedStudentIds(prev => {
                                if (e.target.checked) return Array.from(new Set([...prev, s.id]))
                                return prev.filter(id => id !== s.id)
                              })
                            }}
                          />
                          <span className="text-gray-800">
                            {s.name}{s.phone_number ? ` • ${s.phone_number}` : ''}
                          </span>
                        </label>
                      )
                    })
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor...' : editingProgram ? 'Güncelle' : 'Ekle'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowForm(false)
                  setEditingProgram(null)
                  setFormData({ name: '', day_of_week: '', time: '' })
                  setSelectedStudentIds([])
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

      {/* Program Listesi */}
      <div className="space-y-2">
        {programs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium text-sm">Henüz program bulunmuyor</p>
            <p className="text-gray-500 text-xs mt-1">Yeni program eklemek için + butonuna tıklayın</p>
          </div>
        ) : (
          programs.map(program => (
            <div key={program.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 space-y-3">
                {/* Program Bilgisi */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {program.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {program.name}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Aksiyon Butonları */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(program)}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Program Detayları */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {program.day_of_week && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{getDayName(program.day_of_week)}</span>
                    </div>
                  )}
                  {program.time && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{program.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{membershipCounts[program.id] || 0} öğrenci</span>
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