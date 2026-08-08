import React from 'react';

export default function FormInput({ 
  label, 
  name, 
  type = "text", 
  placeholder, 
  register, 
  error, 
  ...rest 
}) {
  return (
    <div className="w-full flex flex-col space-y-1 text-left">
      {label && (
        <label 
          htmlFor={name}
          className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input 
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={`rounded-xl border px-3.5 py-2.5 text-xs text-charcoal outline-none transition-all ${
          error 
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-100' 
            : 'border-gray-200 focus:border-[#F7941D]/50 focus:ring-1 focus:ring-orange-100'
        }`}
        {...rest}
      />
      {error && (
        <span className="text-[10px] font-bold text-red-500 mt-1 pl-1">
          {error.message}
        </span>
      )}
    </div>
  );
}
