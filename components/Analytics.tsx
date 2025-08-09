'use client'

import { useState, useEffect } from 'react'
import { supabase, Program, Student, Attendance } from '@/lib/supabase'
import { BarChart3, TrendingUp, Users, Calendar, Star, Award, Target } from 'lucide-react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

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
  absentCount: number
  attendanceRate: number
  lastAttendanceDate?: string
}

// Helper functions for week ranges
function getWeekStart(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay() === 0 ? 7 : d.getDay() // Monday=1 ... Sunday=7
  const start = new Date(d)
  start.setDate(d.getDate() - (day - 1))
  return start.toISOString().split('T')[0]
}

function getWeekEndFromStart(startStr: string) {
  const d = new Date(startStr)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

function formatShort(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

function dayOfWeekStringToNumber(day?: string) {
  const map: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }
  if (!day) return undefined
  return map[day.toLowerCase()]
}

function formatSessionLabelForWeek(weekStartIso: string, programDayNum?: number) {
  if (!programDayNum) {
    return `${formatShort(weekStartIso)} - ${formatShort(getWeekEndFromStart(weekStartIso))}`
  }
  const d = new Date(weekStartIso)
  d.setDate(d.getDate() + (programDayNum - 1))
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    weekday: 'long',
  })
}

export default function Analytics() {
  const [attendances, setAttendances] = useState<AttendanceWithDetails[]>([])
  const [programStats, setProgramStats] = useState<ProgramStats[]>([])
  const [topStudents, setTopStudents] = useState<StudentStats[]>([])
  const [lowestStudents, setLowestStudents] = useState<StudentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>([])
  const [weeklyCounts, setWeeklyCounts] = useState<number[]>([])
  const [top3WeekLabels, setTop3WeekLabels] = useState<string[]>([])
  const [top3WeekCounts, setTop3WeekCounts] = useState<number[]>([])
  const [lowestVisible, setLowestVisible] = useState<number>(15)

  useEffect(() => {
    fetchPrograms()
  }, [])

  useEffect(() => {
    if (selectedProgram) {
      setLowestVisible(15)
      fetchData(selectedProgram)
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
      if (!selectedProgram && data && data.length > 0) {
        setSelectedProgram(data[0].id)
      }
    } catch (error) {
      console.error('Programlar yüklenirken hata:', error)
    }
  }

  const fetchData = async (programId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select(`
          *,
          program:programs(*),
          student:students(*)
        `)
        .eq('program_id', programId)
        .order('date', { ascending: false })
      
      if (error) throw error
      const rows = data || []
      setAttendances(rows)
      
      // İstatistikleri hesapla
      calculateStats(rows)

      // Seçili programın gün numarası
      const programObj = programs.find(p => p.id === programId)
      const programDayNum = dayOfWeekStringToNumber(programObj?.day_of_week)

      // Hafta bazlı katılım (Geldi) agregasyonu
      const weekMap = new Map<string, number>()
      rows.forEach(a => {
        if (a.status === 'Geldi') {
          const ws = getWeekStart(a.date)
          weekMap.set(ws, (weekMap.get(ws) || 0) + 1)
        }
      })
      const weekKeysAsc = Array.from(weekMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      const limitedKeys = weekKeysAsc.slice(-8)
      const weekLabels = limitedKeys.map(ws => formatSessionLabelForWeek(ws, programDayNum))
      const weekCounts = limitedKeys.map(ws => weekMap.get(ws) || 0)
      setWeeklyLabels(weekLabels)
      setWeeklyCounts(weekCounts)

      // En çok katılımcı olan 3 hafta
      const top3 = weekKeysAsc
        .map(ws => ({ ws, label: formatSessionLabelForWeek(ws, programDayNum), count: weekMap.get(ws) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
      setTop3WeekLabels(top3.map(x => x.label))
      setTop3WeekCounts(top3.map(x => x.count))
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
          absentCount: 0,
          attendanceRate: 0,
          lastAttendanceDate: undefined,
        })
      }
      
      const stats = studentMap.get(studentId)!
      stats.totalPrograms++
      if (attendance.status === 'Geldi') {
        stats.presentCount++
      } else {
        stats.absentCount++
      }
      // En son katılım tarihini güncelle (ISO tarih olduğu için string karşılaştırması da çalışır ama net olmak için Date kullanıyoruz)
      if (!stats.lastAttendanceDate || new Date(attendance.date) > new Date(stats.lastAttendanceDate)) {
        stats.lastAttendanceDate = attendance.date
      }
    })

    // Öğrenci katılım oranlarını hesapla
    studentMap.forEach(stats => {
      stats.attendanceRate = stats.totalPrograms > 0 
        ? (stats.presentCount / stats.totalPrograms) * 100 
        : 0
    })

    const allStudentStats = Array.from(studentMap.values())
    
    // En çok katılanlar: öncelik presentCount, sonra totalPrograms, sonra son katılım tarihi
    const sortedTopStudents = allStudentStats
      .sort((a, b) => {
        if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount
        if (b.totalPrograms !== a.totalPrograms) return b.totalPrograms - a.totalPrograms
        const aDate = a.lastAttendanceDate ? new Date(a.lastAttendanceDate).getTime() : 0
        const bDate = b.lastAttendanceDate ? new Date(b.lastAttendanceDate).getTime() : 0
        return bDate - aDate
      })
      .slice(0, 15)
    
    // En çok gelmeyenler: öncelik absentCount, sonra totalPrograms, sonra son katılım tarihi
    const sortedLowestStudents = allStudentStats
      .sort((a, b) => {
        if (b.absentCount !== a.absentCount) return b.absentCount - a.absentCount
        if (b.totalPrograms !== a.totalPrograms) return b.totalPrograms - a.totalPrograms
        const aDate = a.lastAttendanceDate ? new Date(a.lastAttendanceDate).getTime() : 0
        const bDate = b.lastAttendanceDate ? new Date(b.lastAttendanceDate).getTime() : 0
        return bDate - aDate
      })

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
        {/* Program Seçici */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Program Seçin</label>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-sm"
          >
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
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
            <h3 className="font-semibold text-green-900 text-sm">En Çok Katılan Öğrenciler (İlk 15)</h3>
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
                <div className="px-2 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700">
                  {student.presentCount} geldi
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
            <h3 className="font-semibold text-amber-900 text-sm">En Çok Gelmeyen Öğrenciler</h3>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {lowestStudents.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Henüz öğrenci verisi bulunmuyor</p>
            </div>
          ) : (
            <>
              {lowestStudents.slice(0, lowestVisible).map((student, index) => (
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
                  <div className="px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700">
                    {student.absentCount} gelmedi
                  </div>
                </div>
              ))}
              {lowestVisible < lowestStudents.length && (
                <button
                  onClick={() => setLowestVisible(v => v + 15)}
                  className="w-full mt-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm font-medium rounded-xl transition-all duration-200"
                >
                  Daha fazla gör (+15)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ek Analizler */}
      <div className="grid grid-cols-1 gap-4">
        {/* Pasta Grafik: Toplam Geldi / Gelmedi */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-purple-900 text-sm">Haftalara Göre Toplam Katılımcı (Geldi) Dağılımı</h3>
          </div>
          <div className="p-4 space-y-4">
            {weeklyLabels.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">Veri yok</div>
            ) : (
              <>
                <div className="h-48 md:h-56 w-full">
                  <Doughnut
                    data={{
                      labels: weeklyLabels,
                      datasets: [
                        {
                          data: weeklyCounts,
                          backgroundColor: weeklyCounts.map((_, i) => ['#34d399','#60a5fa','#fca5a5','#fbbf24','#a78bfa','#f472b6','#22c55e'][i % 7]),
                        }
                      ]
                    }}
                    options={{
                      plugins: { legend: { display: false } },
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </div>
                <div className="space-y-2">
                  {weeklyLabels.map((label, idx) => (
                    <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-semibold text-gray-900">{weeklyCounts[idx]} kişi</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* En Çok Katılımcı Olan 3 Hafta */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-blue-900 text-sm">En Çok Katılımcı Olan 3 Hafta</h3>
          </div>
          <div className="p-4">
            {top3WeekLabels.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">Veri yok</div>
            ) : (
              <div className="space-y-2">
                {top3WeekLabels.map((label, idx) => (
                  <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-800">{label}</span>
                    <span className="font-semibold text-gray-900">{top3WeekCounts[idx]} kişi</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 