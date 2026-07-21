'use client'

import { useState, useEffect } from 'react'
import { getAuthToken, getAuthUser, setAuth, clearAuth, isAdmin, type AuthUser } from '@/lib/auth'
import { LandingPage, LoginPage, RegisterPage } from '@/components/modules/public-pages'
import { MerchandisePage } from '@/components/modules/merchandise-page'
import { EdukasiPage } from '@/components/modules/edukasi-page'
import { KegiatanPage } from '@/components/modules/kegiatan-page'
import { UserDashboard } from '@/components/modules/user-dashboard'
import { AdminPanel } from '@/components/modules/admin-panel'

type View = 'landing' | 'login' | 'register' | 'user' | 'admin' | 'merchandise' | 'merchandise-tracking' | 'edukasi' | 'kegiatan' | 'loading'

export default function Home() {
  const [view, setView] = useState<View>('loading')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    // Check existing auth on mount
    const token = getAuthToken()
    const user = getAuthUser()
    Promise.resolve().then(() => {
      if (token && user) {
        setAuthUser(user)
        setView(isAdmin(user) ? 'admin' : 'user')
      } else {
        setView('landing')
      }
    })
  }, [])

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    setAuth(token, user)
    setAuthUser(user)
    setView(isAdmin(user) ? 'admin' : 'user')
  }

  const handleRegisterSuccess = (token: string, user: AuthUser) => {
    setAuth(token, user)
    setAuthUser(user)
    setView(isAdmin(user) ? 'admin' : 'user')
  }

  const handleLogout = () => {
    clearAuth()
    setAuthUser(null)
    setView('landing')
  }

  // Loading state
  if (view === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5dc]/40">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  // Landing page (public)
  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={() => setView('login')}
        onRegister={() => setView('register')}
        onMerchandise={() => setView('merchandise')}
        onLacakPesanan={() => setView('merchandise-tracking')}
        onEdukasi={() => setView('edukasi')}
        onKegiatan={() => setView('kegiatan')}
      />
    )
  }

  // Edukasi page (public)
  if (view === 'edukasi') {
    return <EdukasiPage onBack={() => setView('landing')} />
  }

  // Kegiatan page (public)
  if (view === 'kegiatan') {
    return <KegiatanPage onBack={() => setView('landing')} />
  }

  // Merchandise page (public)
  if (view === 'merchandise' || view === 'merchandise-tracking') {
    return <MerchandisePage onBack={() => setView('landing')} initialView={view === 'merchandise-tracking' ? 'tracking' : 'catalog'} />
  }

  // Login page
  if (view === 'login') {
    return (
      <LoginPage
        onBack={() => setView('landing')}
        onLoginSuccess={handleLoginSuccess}
        onRegister={() => setView('register')}
      />
    )
  }

  // Register page
  if (view === 'register') {
    return (
      <RegisterPage
        onBack={() => setView('landing')}
        onRegisterSuccess={handleRegisterSuccess}
        onLogin={() => setView('login')}
      />
    )
  }

  // User dashboard (nasabah/anggota)
  if (view === 'user' && authUser) {
    return <UserDashboard user={authUser} onLogout={handleLogout} onSettings={() => {}} />
  }

  // Admin panel
  if (view === 'admin' && authUser) {
    return <AdminPanel user={authUser} onLogout={handleLogout} />
  }

  // Fallback
  return (
    <LandingPage
      onLogin={() => setView('login')}
      onRegister={() => setView('register')}
      onMerchandise={() => setView('merchandise')}
      onLacakPesanan={() => setView('merchandise-tracking')}
      onEdukasi={() => setView('edukasi')}
      onKegiatan={() => setView('kegiatan')}
    />
  )
}
