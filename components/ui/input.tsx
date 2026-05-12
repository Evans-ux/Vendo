import { InputHTMLAttributes, forwardRef } from 'react'
<<<<<<< HEAD

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
=======
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
>>>>>>> 26aa57d35c2d66a171cbe4ec3ed0eea03b7495af
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
<<<<<<< HEAD
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
        <input
          ref={ref}
          className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400">{error}</p>
=======
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
>>>>>>> 26aa57d35c2d66a171cbe4ec3ed0eea03b7495af
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

<<<<<<< HEAD
=======
export { Input }
>>>>>>> 26aa57d35c2d66a171cbe4ec3ed0eea03b7495af
export default Input
