'use client'

import { useState, useEffect } from 'react'
import { supabase, Program, Student, Attendance } from '@/lib/supabase'
import { Check, X, Save, AlertCircle, Calendar, Users } from 'lucide-react'

interface AttendanceData {
  studentId: string
  status: 'Geldi' | 'Gelmedi' | ''
}

export default function AttendanceForm() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [existingAttendance, setExistingAttendance] = useState<Attendance[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchPrograms()
    fetchStudents()
  }, [])

  useEffect(() => {
    if (students.length > 0) {
      setAttendanceData(
        students.map(student => ({
          studentId: student.id,
          status: '' as any
        }))
      )
    }
  }, [students])

  useEffect(() => {
    if (selectedProgram) {
      checkExistingAttendance()
    }
  }, [selectedProgram])

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

  const checkExistingAttendance = async (showMessage = true) => {
    if (!selectedProgram) return

    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('program_id', selectedProgram)
        .eq('date', today)

      if (error) throw error

      if (data && data.length > 0) {
        setExistingAttendance(data)
        // Mevcut yoklama verilerini yükle
        const existingData = students.map(student => {
          const existing = data.find(a => a.student_id === student.id)
          return {
            studentId: student.id,
            status: existing ? existing.status : ''
          }
        })
        setAttendanceData(existingData)
        if (showMessage) {
          setMessage('Bu program için bugün yoklama alınmış. Mevcut verileri güncelleyebilirsiniz.')
        }
      } else {
        setExistingAttendance([])
        // Yeni yoklama için varsayılan değerleri ayarla
        setAttendanceData(
          students.map(student => ({
            studentId: student.id,
            status: '' as const
          }))
        )
        if (showMessage) {
          setMessage('')
        }
      }
    } catch (error) {
      console.error('Mevcut yoklama kontrolü hatası:', error)
    }
  }

  const handleStatusChange = (studentId: string, status: 'Geldi' | 'Gelmedi') => {
    setAttendanceData(prev =>
      prev.map(item =>
        item.studentId === studentId
          ? { ...item, status: item.status === status ? '' : status }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProgram) {
      setMessage('Lütfen bir program seçin')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      if (existingAttendance.length > 0) {
        // Mevcut yoklamayı güncelle - yeni öğrenciler için insert, mevcutler için update
        const updatePromises: any[] = []
        const insertRecords: any[] = []
        const deletePromises: any[] = []

        attendanceData.forEach(item => {
          const existing = existingAttendance.find(a => a.student_id === item.studentId)
          
          if (existing) {
            if (item.status === '') {
              // Durum boşsa, DB'den sil
              deletePromises.push(
                supabase
                  .from('attendances')
                  .delete()
                  .eq('id', existing.id)
              )
            } else {
              // Durum seçiliyse, update
              updatePromises.push(
                supabase
                  .from('attendances')
                  .update({ status: item.status as 'Geldi' | 'Gelmedi' })
                  .eq('id', existing.id)
              )
            }
          } else {
            // Yeni öğrenci - sadece seçili durum varsa insert
            if (item.status !== '') {
              insertRecords.push({
                student_id: item.studentId,
                program_id: selectedProgram,
                date: today,
                status: item.status as 'Geldi' | 'Gelmedi'
              })
            }
          }
        })

        // Silme işlemleri
        for (const promise of deletePromises) {
          await promise
        }

        // Update işlemlerini yap
        for (const promise of updatePromises) {
          await promise
        }

        // Yeni öğrenciler için insert işlemi
        if (insertRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('attendances')
            .insert(insertRecords)
          
          if (insertError) throw insertError
        }

        setMessage('Yoklama başarıyla güncellendi!')
        // Mevcut yoklama listesini yenile, mesajı değiştirme
        await checkExistingAttendance(false)
      } else {
        // Yeni yoklama oluştur - sadece seçili olanları kaydet
        const attendanceRecords = attendanceData
          .filter(item => item.status !== '') // Boş durumları filtrele
          .map(item => ({
            student_id: item.studentId,
            program_id: selectedProgram,
            date: today,
            status: item.status as 'Geldi' | 'Gelmedi'
          }))

        if (attendanceRecords.length === 0) {
          setMessage('En az bir öğrenci için durum seçmelisiniz')
          setSaving(false)
          return
        }

        const { error } = await supabase
          .from('attendances')
          .insert(attendanceRecords)

        if (error) throw error

        setMessage('Yoklama başarıyla kaydedildi!')
        // Mevcut yoklama listesini güncelle
        const newAttendanceRecords = attendanceRecords.map((record, index) => ({
          id: `temp-${index}`,
          ...record,
          created_at: new Date().toISOString()
        }))
        setExistingAttendance(newAttendanceRecords as any)
      }
    } catch (error) {
      console.error('Yoklama kaydedilirken hata:', error)
      setMessage('Yoklama kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  // Filtrelenmiş öğrenci listesi
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.phone_number && student.phone_number.includes(searchTerm))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-bold">Yoklama Girişi</h2>
          </div>
          <p className="text-blue-100 text-sm">Bugünün yoklamasını alın veya güncelleyin</p>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Program Seçimi */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Program Seçin
              </label>
              <div className="relative">
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-base"
                  required
                >
                  <option value="">Program seçin...</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tarih */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-green-800">Yoklama Tarihi</p>
                  <p className="text-sm font-semibold text-green-900">
                    {new Date(today).toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Uyarı Mesajı */}
            {existingAttendance.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      Bu program için bugün yoklama alınmış
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Mevcut verileri güncelleyebilirsiniz
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Öğrenci Listesi */}
            {students.length > 0 && selectedProgram && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-700">
                    Öğrenci Yoklaması ({filteredStudents.length}/{students.length} öğrenci)
                  </label>
                </div>
                
                {/* Arama */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Öğrenci ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {filteredStudents.map(student => {
                    const attendance = attendanceData.find(a => a.studentId === student.id)
                    return (
                      <div key={student.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex flex-col space-y-3">
                          {/* Öğrenci Bilgisi */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
                              {student.phone_number && (
                                <p className="text-xs text-gray-500 truncate">{student.phone_number}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Durum Butonları */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'Geldi')}
                              className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                                attendance?.status === 'Geldi'
                                  ? 'bg-green-100 text-green-800 border-2 border-green-200'
                                  : attendance?.status === ''
                                  ? 'bg-gray-200 text-gray-500 border-2 border-gray-300'
                                  : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 border-2 border-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              Geldi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'Gelmedi')}
                              className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                                attendance?.status === 'Gelmedi'
                                  ? 'bg-red-100 text-red-800 border-2 border-red-200'
                                  : attendance?.status === ''
                                  ? 'bg-gray-200 text-gray-500 border-2 border-gray-300'
                                  : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700 border-2 border-transparent'
                              }`}
                            >
                              <X className="w-3 h-3" />
                              Gelmedi
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Program Seçilmedi Uyarısı */}
            {!selectedProgram && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium text-sm">Yoklama almak için önce bir program seçin</p>
              </div>
            )}

            {/* Mesaj */}
            {message && (
              <div className={`p-3 rounded-xl text-xs ${
                message.includes('başarıyla') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Kaydet Butonu */}
            {selectedProgram && (
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor...' : existingAttendance.length > 0 ? 'Yoklamayı Güncelle' : 'Yoklamayı Kaydet'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
} 