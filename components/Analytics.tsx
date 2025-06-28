'use client'

import { useState, useEffect } from 'react'
import { supabase, Program, Student, Attendance } from '@/lib/supabase'
import { BarChart3, TrendingUp, Users, Calendar, Star, Award, Target } from 'lucide-react'

interface AttendanceWithDetails extends Attendance {
  program: Program
  student: Student
}

interface ProgramStats {
  program: Program
  totalAttendance: number
  presentCount: number
  absentCount: number
  attendanceRate: number
  totalSessions: number
  averageParticipants: number
}

interface StudentStats {
  student: Student
  totalPrograms: number
  presentCount: number
  attendanceRate: number
}

export default function Analytics() {
  const [attendances, setAttendances] = useState<AttendanceWithDetails[]>([])
  const [programStats, setProgramStats] = useState<ProgramStats[]>([])
  const [topStudents, setTopStudents] = useState<StudentStats[]>([])
  const [lowestStudents, setLowestStudents] = useState<StudentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
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
      
      // İstatistikleri hesapla
      calculateStats(data || [])
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: AttendanceWithDetails[]) => {
    // Program istatistikleri
    const programMap = new Map<string, ProgramStats>()
    
    data.forEach(attendance => {
      const programId = attendance.program_id
      if (!programMap.has(programId)) {
        programMap.set(programId, {
          program: attendance.program,
          totalAttendance: 0,
          presentCount: 0,
          absentCount: 0,
          attendanceRate: 0,
          totalSessions: 0,
          averageParticipants: 0
        })
      }
      
      const stats = programMap.get(programId)!
      stats.totalAttendance++
      if (attendance.status === 'Geldi') {
        stats.presentCount++
      } else {
        stats.absentCount++
      }
    })

    // Program bazlı oturum sayısı ve ortalama katılımcı hesaplama
    const programSessions = new Map<string, Set<string>>()
    const programParticipants = new Map<string, Set<string>>()
    
    data.forEach(attendance => {
      const programId = attendance.program_id
      const sessionKey = `${attendance.program_id}-${attendance.date}`
      
      // Oturum sayısı
      if (!programSessions.has(programId)) {
        programSessions.set(programId, new Set())
      }
      programSessions.get(programId)!.add(sessionKey)
      
      // Katılımcı sayısı (her oturumda)
      if (!programParticipants.has(sessionKey)) {
        programParticipants.set(sessionKey, new Set())
      }
      programParticipants.get(sessionKey)!.add(attendance.student_id)
    })

    // Katılım oranlarını ve ortalama katılımcı sayısını hesapla
    programMap.forEach((stats, programId) => {
      stats.attendanceRate = stats.totalAttendance > 0 
        ? (stats.presentCount / stats.totalAttendance) * 100 
        : 0
      
      // Toplam oturum sayısı
      const sessions = programSessions.get(programId) || new Set()
      stats.totalSessions = sessions.size
      
      // Ortalama katılımcı sayısı
      let totalParticipants = 0
      sessions.forEach(sessionKey => {
        const participants = programParticipants.get(sessionKey) || new Set()
        totalParticipants += participants.size
      })
      stats.averageParticipants = sessions.size > 0 ? Math.round(totalParticipants / sessions.size) : 0
    })

    const sortedProgramStats = Array.from(programMap.values())
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 5)

    setProgramStats(sortedProgramStats)

    // Öğrenci istatistikleri
    const studentMap = new Map<string, StudentStats>()
    
    data.forEach(attendance => {
      const studentId = attendance.student_id
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: attendance.student,
          totalPrograms: 0,
          presentCount: 0,
          attendanceRate: 0
        })
      }
      
      const stats = studentMap.get(studentId)!
      stats.totalPrograms++
      if (attendance.status === 'Geldi') {
        stats.presentCount++
      }
    })

    // Öğrenci katılım oranlarını hesapla
    studentMap.forEach(stats => {
      stats.attendanceRate = stats.totalPrograms > 0 
        ? (stats.presentCount / stats.totalPrograms) * 100 
        : 0
    })

    const allStudentStats = Array.from(studentMap.values())
    const sortedTopStudents = allStudentStats
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 15)
    
    const sortedLowestStudents = allStudentStats
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 15)

    setTopStudents(sortedTopStudents)
    setLowestStudents(sortedLowestStudents)
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-lg font-bold">Analiz & İstatistikler</h2>
          </div>
          <p className="text-emerald-100 text-sm">Program ve öğrenci performans analizleri</p>
        </div>
      </div>

      {/* En Çok Katılım Olan Programlar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">En Çok Katılım Olan Programlar</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {programStats.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Henüz program verisi bulunmuyor</p>
            </div>
          ) : (
            programStats.map((stat, index) => (
              <div key={stat.program.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{stat.program.name}</p>
                    <p className="text-xs text-gray-500">
                      {stat.totalSessions} oturum • Ortalama {stat.averageParticipants} katılımcı
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getAttendanceColor(stat.attendanceRate)}`}>
                  %{stat.attendanceRate.toFixed(1)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* En Yüksek Katılım Oranına Sahip Öğrenciler */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-green-900 text-sm">En Yüksek Katılım Oranına Sahip Öğrenciler (İlk 15)</h3>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {topStudents.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Henüz öğrenci verisi bulunmuyor</p>
            </div>
          ) : (
            topStudents.map((student, index) => (
              <div key={student.student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{student.student.name}</p>
                    <p className="text-xs text-gray-500">
                      {student.presentCount} geldi / {student.totalPrograms} program
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getAttendanceColor(student.attendanceRate)}`}>
                  %{student.attendanceRate.toFixed(1)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* En Düşük Katılım Oranına Sahip Öğrenciler */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-amber-900 text-sm">En Düşük Katılım Oranına Sahip Öğrenciler (İlk 15)</h3>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {lowestStudents.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Henüz öğrenci verisi bulunmuyor</p>
            </div>
          ) : (
            lowestStudents.map((student, index) => (
              <div key={student.student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{student.student.name}</p>
                    <p className="text-xs text-gray-500">
                      {student.presentCount} geldi / {student.totalPrograms} program
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getAttendanceColor(student.attendanceRate)}`}>
                  %{student.attendanceRate.toFixed(1)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 