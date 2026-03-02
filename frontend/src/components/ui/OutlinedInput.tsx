'use client'

import { forwardRef } from 'react'
import React from 'react'

export type OutlinedInputProps = {
  id: string
  label: string
  type: string
  placeholder?: string
  error?: string
  suffix?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>

/**
 * Google Material 3 outlined input with floating label.
 *
 * Must be a forwardRef component so react-hook-form's `register` ref reaches
 * the underlying <input> DOM node. Without this, RHF cannot read field values,
 * causing "required" errors on every submit.
 *
 * Features:
 * - Chromium autofill onAnimationStart handler (dispatches synthetic events
 *   so RHF reads the autofilled value)
 * - Error state with Material 3 error colors
 * - Optional suffix slot for password toggle or other actions
 */
export const OutlinedInput = forwardRef<HTMLInputElement, OutlinedInputProps>(
  function OutlinedInput({ id, label, type, placeholder, error, suffix, ...rest }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="text-[14px] font-medium text-[#444746] dark:text-[#bdc1c6]"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={type}
            placeholder={placeholder ?? ''}
            className={[
              'w-full h-14 px-4 rounded-[4px] text-[16px] outline-none',
              'bg-transparent',
              'text-[#202124] dark:text-[#e8eaed]',
              'placeholder:text-[#9aa0a6]',
              'border transition-colors duration-150',
              suffix ? 'pr-12' : '',
              error
                ? 'border-[#b3261e] dark:border-[#f2b8b5] focus:border-[#b3261e] dark:focus:border-[#f2b8b5] focus:ring-1 focus:ring-[#b3261e]'
                : 'border-[#747775] dark:border-[#8e918f] focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#1a73e8] dark:focus:ring-[#8ab4f8]',
            ].join(' ')}
            {...rest}
            onAnimationStart={(e) => {
              // Chromium fires 'onAutoFillStart' CSS animation when autofilling.
              // Dispatch synthetic events so react-hook-form reads the value.
              const animName = (e.animationName ?? '') as string
              if (animName.toLowerCase().includes('autofill')) {
                const target = e.currentTarget
                target.dispatchEvent(new Event('input',  { bubbles: true }))
                target.dispatchEvent(new Event('change', { bubbles: true }))
              }
              rest.onAnimationStart?.(e)
            }}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] dark:text-[#9aa0a6]">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[12px] text-[#b3261e] dark:text-[#f2b8b5] flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  },
)
