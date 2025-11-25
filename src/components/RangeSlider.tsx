import React from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ label, value, min, max, step, onChange }) => {
  return (
    <div className="flex flex-col space-y-2 mb-4 w-full">
      <div className="flex justify-between items-center text-xs text-zinc-400 font-medium tracking-wide uppercase">
        <span>{label}</span>
        <span className="font-mono text-cyan-400">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </div>
  );
};

export default RangeSlider;
