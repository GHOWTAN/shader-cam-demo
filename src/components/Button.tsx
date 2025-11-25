import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ active, variant = 'primary', className = '', children, ...props }) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm";
  
  const variants = {
    primary: active 
      ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400" 
      : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white hover:border-zinc-600",
    secondary: "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
