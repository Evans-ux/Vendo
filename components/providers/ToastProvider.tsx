'use client'

import { Toaster } from "sonner"

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1F2937',
          color: '#fff',
          border: '1px solid #374151',
          borderRadius: '0.75rem',
        },
      }}
    />
  )
}
