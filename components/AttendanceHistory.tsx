'use client'

import { useState, useEffect } from 'react'
import { supabase, Program, Student, Attendance } from '@/lib/supabase'
import { Calendar, Filter, Search, Users, Clock, TrendingUp } from 'lucide-react'

interface AttendanceWithDetails extends Attendance {
  program: Program
  student: Student
}

export default function AttendanceHistory() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [attendances, setAttendances] = useState<AttendanceWithDetails[]>([])
  const [filteredAttendances, setFilteredAttendances] = useState<AttendanceWithDetails[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPrograms()
    fetchAttendances()
  }, [])

  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0].id)
    }
  }, [programs])

  useEffect(() => {
    filterAttendances()
  }, [attendances, selectedProgram, selectedDate, searchTerm])

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

  const fetchAttendances = async () => {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select(`
          *,
          program:programs(*),
          student:students(*)
        `)
        .order('date', { ascending: false })
      
      if (error) throw error
      setAttendances(data || [])
    } catch (error) {
      console.error('Yoklamalar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAttendances = () => {
    let filtered = attendances

    // Program filtresi
    if (selectedProgram) {
      filtered = filtered.filter(a => a.program_id === selectedProgram)
    }

    // Tarih filtresi
    if (selectedDate) {
      filtered = filtered.filter(a => a.date === selectedDate)
    }

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.program.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAttendances(filtered)
  }

  const getStatusColor = (status: string) => {
    return status === 'Geldi' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
  }

  const getStatusIcon = (status: string) => {
    return status === 'Geldi' ? '✓' : '✗'
  }

  const clearFilters = () => {
    setSelectedDate('')
    setSearchTerm('')
  }

  const getUniqueDates = () => {
    const dates = attendances
      .filter(a => !selectedProgram || a.program_id === selectedProgram)
      .map(a => a.date)
    return Array.from(new Set(dates)).sort().reverse()
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
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-bold">Geçmiş Yoklamalar</h2>
          </div>
          <p className="text-purple-100 text-sm">Tüm yoklama kayıtlarını görüntüleyin ve filtreleyin</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Filtreler */}
          <div className="space-y-3">
            {/* Program Filtresi */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Program Filtresi
              </label>
              <div className="relative">
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-sm"
                >
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Tarih Filtresi */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tarih Filtresi
              </label>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-sm"
                >
                  <option value="">Tüm tarihler</option>
                  {getUniqueDates().map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('tr-TR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Arama */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Arama
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Öğrenci veya program ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Filtreleri Temizle */}
            {(selectedDate || searchTerm) && (
              <button
                onClick={clearFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-all duration-200 text-xs"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>

          {/* İstatistikler */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-purple-800">Sonuçlar</span>
              </div>
              <span className="text-purple-700">
                {filteredAttendances.length} kayıt bulundu
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Yoklama Listesi */}
      <div className="space-y-2">
        {filteredAttendances.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium text-sm">Yoklama kaydı bulunamadı</p>
            <p className="text-gray-500 text-xs mt-1">Filtreleri değiştirmeyi deneyin</p>
          </div>
        ) : (
          filteredAttendances.map(attendance => (
            <div key={attendance.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 space-y-3">
                {/* Üst Bilgi */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {attendance.student.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {attendance.student.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {attendance.program.name}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(attendance.status)}`}>
                    {getStatusIcon(attendance.status)} {attendance.status}
                  </div>
                </div>

                {/* Alt Bilgi */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(attendance.date).toLocaleDateString('tr-TR', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>ID: {attendance.student_id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 