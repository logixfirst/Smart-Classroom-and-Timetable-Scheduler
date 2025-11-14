'use client';

import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date';
  placeholder?: string;
  error?: FieldError;
  register: UseFormRegister<any>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helpText?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  register,
  required = false,
  disabled = false,
  className = '',
  helpText,
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name, { valueAsNumber: type === 'number' })}
        className={`
          w-full px-4 py-3 rounded-lg text-sm border 
          ${error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
          }
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        `}
      />
      
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  error?: FieldError;
  register: UseFormRegister<any>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  helpText?: string;
}

export function SelectField({
  label,
  name,
  options,
  error,
  register,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'Select an option',
  helpText,
}: SelectFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        id={name}
        disabled={disabled}
        {...register(name)}
        className={`
          w-full px-4 py-3 rounded-lg text-sm border 
          ${error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
          }
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message}
        </p>
      )}
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  error?: FieldError;
  register: UseFormRegister<any>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: number;
  helpText?: string;
}

export function TextAreaField({
  label,
  name,
  placeholder,
  error,
  register,
  required = false,
  disabled = false,
  className = '',
  rows = 4,
  helpText,
}: TextAreaFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <textarea
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        {...register(name)}
        className={`
          w-full px-4 py-3 rounded-lg text-sm border 
          ${error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
          }
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          resize-vertical
        `}
      />
      
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message}
        </p>
      )}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  name: string;
  error?: FieldError;
  register: UseFormRegister<any>;
  disabled?: boolean;
  className?: string;
  helpText?: string;
}

export function CheckboxField({
  label,
  name,
  error,
  register,
  disabled = false,
  className = '',
  helpText,
}: CheckboxFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-3">
        <input
          id={name}
          type="checkbox"
          disabled={disabled}
          {...register(name)}
          className={`
            w-4 h-4 rounded border-gray-300 dark:border-gray-600
            text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
        />
        <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      </div>
      
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{helpText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 ml-7">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message}
        </p>
      )}
    </div>
  );
}
