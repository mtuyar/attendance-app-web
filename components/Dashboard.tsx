'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { LogOut, Calendar, History, Settings, BarChart3, Users } from 'lucide-react'
import AttendanceForm from './AttendanceForm'
import AttendanceHistory from './AttendanceHistory'
import Programs from './Programs'
import Analytics from './Analytics'
import Students from './Students'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('attendance')
  const { logout } = useAuthStore()

  const tabs = [
    {
      id: 'attendance',
      label: 'Yoklama',
      icon: Calendar,
      component: AttendanceForm
    },
    {
      id: 'history',
      label: 'Geçmiş',
      icon: History,
      component: AttendanceHistory
    },
    {
      id: 'students',
      label: 'Öğrenciler',
      icon: Users,
      component: Students
    },
    {
      id: 'programs',
      label: 'Programlar',
      icon: Settings,
      component: Programs
    },
    {
      id: 'analytics',
      label: 'Analiz',
      icon: BarChart3,
      component: Analytics
    }
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Yoklama Uygulaması</h1>
                <p className="text-xs text-gray-500">Mobil Yönetim Paneli</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 animate-fadeIn">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  )
} 