'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

interface WhatsAppBubbleProps {
  phoneNumber?: string
  adminName?: string
  defaultMessage?: string
}

export function WhatsAppBubble({
  phoneNumber = '6281234567890',
  adminName = 'Admin Bank Sampah',
  defaultMessage = 'Halo Admin Bank Sampah Sukamaju Sejahtera, saya ingin bertanya informasi seputar layanan bank sampah & koperasi.',
}: WhatsAppBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userCustomMessage, setUserCustomMessage] = useState('')
  const [hasPrompted, setHasPrompted] = useState(false)

  // Clean phone number (remove +, -, spaces, 08 -> 628)
  let cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1)
  }

  // Show small hint bubble automatically after 3 seconds on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPrompted(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleOpenWhatsApp = (customText?: string) => {
    const textToSend = encodeURIComponent(customText || userCustomMessage || defaultMessage)
    const waUrl = `https://wa.me/${cleanPhone}?text=${textToSend}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* ===== Pop-up Chat Card ===== */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-emerald-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#128C7E] to-[#25D366] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg border-2 border-white/40">
                  BS
                </div>
                <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-300 border-2 border-[#128C7E]" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">{adminName}</h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-200 animate-pulse" />
                  Online | Siap Membantu
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tutup Chat"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-[#ECE5DD]/30 min-h-[140px] flex flex-col justify-end space-y-3">
            <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-black/5 max-w-[85%] text-xs text-gray-800 leading-relaxed">
              <p className="font-semibold text-emerald-800 mb-1">Bank Sampah Sukamaju</p>
              Halo! 👋 Ada yang bisa kami bantu seputar tabungan sampah, katalog merchandise, atau koperasi?
              <span className="block text-[10px] text-gray-400 text-right mt-1.5">Baru saja</span>
            </div>
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ketik pesan Anda..."
              value={userCustomMessage}
              onChange={(e) => setUserCustomMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOpenWhatsApp()
              }}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2.5 outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => handleOpenWhatsApp()}
              className="p-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full transition-transform active:scale-95 shadow-md flex items-center justify-center shrink-0"
              title="Kirim ke WhatsApp"
            >
              <Send className="size-4" />
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="px-3 pb-3 bg-white">
            <button
              type="button"
              onClick={() => handleOpenWhatsApp()}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-emerald-200"
            >
              <MessageCircle className="size-4 text-[#25D366]" />
              Buka Langsung di WhatsApp Web / App
            </button>
          </div>
        </div>
      )}

      {/* ===== Floating Bubble Button with Badge ===== */}
      <div className="flex items-center gap-3">
        {/* Floating Hint Tag (jika belum dibuka) */}
        {!isOpen && hasPrompted && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-white text-gray-800 px-3.5 py-2 rounded-full shadow-lg border border-emerald-100 text-xs font-medium cursor-pointer hover:bg-emerald-50 transition-all animate-in fade-in slide-in-from-right-4 group"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Tanya Admin via WhatsApp</span>
            <span className="text-gray-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        )}

        {/* The WhatsApp Circle Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative size-14 sm:size-15 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group hover:scale-105 active:scale-95 ring-4 ring-emerald-400/20"
          aria-label="Chat WhatsApp Admin"
        >
          {/* Subtle Pulse Waves */}
          <span className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-pulse -z-10" />

          {/* WhatsApp SVG Official Icon */}
          <svg
            className="size-7 sm:size-8 fill-current drop-shadow-sm transition-transform group-hover:scale-110"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>

          {/* Unread Online Notification Dot */}
          <span className="absolute top-1 right-1 size-3.5 bg-red-500 border-2 border-white rounded-full" />
        </button>
      </div>
    </div>
  )
}
