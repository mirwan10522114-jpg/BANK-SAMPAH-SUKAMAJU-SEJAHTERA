'use client'

import { useState, useEffect } from 'react'
import { getAuthToken, getAuthUser, setAuth, clearAuth, isAdmin, type AuthUser } from '@/lib/auth'
import { LandingPage, LoginPage } from '@/components/modules/public-pages'
import { RegisterPage } from '@/components/modules/register-page'
import { MerchandisePage } from '@/components/modules/merchandise-page'
import { EdukasiPage } from '@/components/modules/edukasi-page'
import { KegiatanPage } from '@/components/modules/kegiatan-page'
import { UserDashboard } from '@/components/modules/pengguna-dashboard'
import { AdminPanel } from '@/components/modules/admin-panel'
import { PaymentReturnView } from '@/components/modules/payment-return-view'

type View = 'landing' | 'login' | 'register' | 'pengguna' | 'admin' | 'merchandise' | 'merchandise-tracking' | 'edukasi' | 'kegiatan' | 'loading' | 'payment-return'

export default function Home() {
  const [view, setView] = useState<View>('loading')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [paymentReturnOrderNumber, setPaymentReturnOrderNumber] = useState<string>('')

  useEffect(() => {
    // ============================================================
    // Detect payment_return parameter dari URL
    // ------------------------------------------------------------
    // Midtrans redirect pengguna kembali ke URL ini setelah pembayaran.
    // Kita pakai query parameter ?payment_return=ORDER_NUMBER
    // (bukan route /payment/return terpisah) karena preview
    // environment hanya support route "/".
    // ============================================================
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const paymentReturn = url.searchParams.get('payment_return')
      if (paymentReturn) {
        setPaymentReturnOrderNumber(paymentReturn)
        setView('payment-return')
        // Bersihkan URL supaya refresh tidak trigger lagi
        window.history.replaceState({}, document.title, '/')
        return
      }
    }

    // Check existing auth on mount
    const token = getAuthToken()
    const pengguna = getAuthUser()
    Promise.resolve().then(() => {
      if (token && pengguna) {
        setAuthUser(pengguna)
        setView(isAdmin(pengguna) ? 'admin' : 'pengguna')
      } else {
        setView('landing')
      }
    })
  }, [])

  const handleLoginSuccess = (token: string, pengguna: AuthUser) => {
    setAuth(token, pengguna)
    setAuthUser(pengguna)
    setView(isAdmin(pengguna) ? 'admin' : 'pengguna')
  }

  const handleRegisterSuccess = (token: string, pengguna: AuthUser) => {
    setAuth(token, pengguna)
    setAuthUser(pengguna)
    setView(isAdmin(pengguna) ? 'admin' : 'pengguna')
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

  // Payment return — halaman status pembayaran setelah redirect dari Midtrans
  if (view === 'payment-return') {
    return (
      <PaymentReturnView
        orderNumber={paymentReturnOrderNumber}
        onBackToHome={() => setView('landing')}
      />
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

  // Pengguna dashboard (nasabah/anggota)
  if (view === 'pengguna' && authUser) {
    return <UserDashboard pengguna={authUser} onLogout={handleLogout} onSettings={() => {}} />
  }

  // Admin panel
  if (view === 'admin' && authUser) {
    return <AdminPanel pengguna={authUser} onLogout={handleLogout} />
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
