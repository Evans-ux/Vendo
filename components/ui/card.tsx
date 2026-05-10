import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700 ${className}`}>
      {children}
    </div>
  )
}

export default Card;
