import { ButtonHTMLAttributes, ReactNode } from 'react'
<<<<<<< HEAD

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  isLoading?: boolean
}

export default function Button({ 
  children, 
  variant = 'primary', 
  isLoading = false,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white'
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
=======
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  isLoading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  const variants: Record<string, string> = {
    primary: 'bg-brand-orange hover:bg-brand-orange/90 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    outline: 'border border-input bg-transparent hover:bg-muted/50 text-foreground',
    ghost: 'bg-transparent hover:bg-muted/50 text-foreground',
    destructive: 'bg-destructive hover:bg-destructive/90 text-white',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
>>>>>>> 26aa57d35c2d66a171cbe4ec3ed0eea03b7495af
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
<<<<<<< HEAD
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
=======
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
>>>>>>> 26aa57d35c2d66a171cbe4ec3ed0eea03b7495af
        </div>
      ) : (
        children
      )}
    </button>
  )
}
<<<<<<< HEAD
=======

export default Button;
>>>>>>> 26aa57d35c2d66a171cbe4ec3ed0eea03b7495af
