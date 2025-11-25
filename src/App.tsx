import React, { useState, useEffect } from 'react';
import { SHADERS } from './constants';
import { ShaderDefinition, ShaderType } from './types';
import WebcamFilter from './components/WebcamFilter';
import RangeSlider from './components/RangeSlider';
import Button from './components/Button';
import { 
  Camera, 
  Settings2, 
  Palette, 
  Sparkles,
  RefreshCcw,
  Zap
} from 'lucide-react';

const App: React.FC = () => {
  const [activeShader, setActiveShader] = useState<ShaderDefinition>(SHADERS[0]);
  const [uniformValues, setUniformValues] = useState<Record<string, number>>({});
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [helperMode, setHelperMode] = useState<'none' | 'edge' | 'color'>('none');

  // Initialize uniforms when shader changes
  useEffect(() => {
    const defaults: Record<string, number> = {};
    activeShader.uniforms.forEach(u => {
      defaults[u.name] = u.defaultValue;
    });
    setUniformValues(defaults);
    
    // Auto-select helper chunk
    if (activeShader.type === ShaderType.Sketch || activeShader.type === ShaderType.Neon || activeShader.type === ShaderType.Ink) {
      setHelperMode('edge');
    } else if (activeShader.type === ShaderType.Cyber || activeShader.type === ShaderType.Pop) {
      setHelperMode('color');
    } else {
      setHelperMode('none');
    }
  }, [activeShader]);

  const handleUniformChange = (name: string, value: number) => {
    setUniformValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectShader = (shader: ShaderDefinition) => {
    setActiveShader(shader);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* LEFT PANEL: 25% - Controls & Helpers */}
      <div className="w-full lg:w-1/4 h-full border-r border-zinc-900 bg-zinc-950 flex flex-col z-20 shadow-lg">
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-zinc-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Parameters</h2>
          </div>
          <div className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-1 rounded">V1.2</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
              {activeShader.name}
            </h3>
            <p className="text-xs text-zinc-500 mb-6 border-l-2 border-zinc-800 pl-3">
              Real-time GLSL rendering
            </p>

            {activeShader.uniforms.length > 0 ? (
              activeShader.uniforms.map(uniform => (
                <RangeSlider
                  key={uniform.name}
                  label={uniform.label}
                  min={uniform.min}
                  max={uniform.max}
                  step={uniform.step}
                  value={uniformValues[uniform.name] ?? uniform.defaultValue}
                  onChange={(val) => handleUniformChange(uniform.name, val)}
                />
              ))
            ) : (
               <div className="p-4 bg-zinc-900/50 rounded-lg text-xs text-zinc-500 text-center border border-zinc-800 border-dashed">
                 No adjustable parameters
               </div>
            )}
          </div>

          {/* Dynamic Helper Chunk */}
          {helperMode === 'edge' && (
            <div className="mb-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-yellow-500" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase">Edge Sensitivity</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" className="text-xs" onClick={() => handleUniformChange(activeShader.uniforms[0].name, activeShader.uniforms[0].min)}>Soft</Button>
                <Button variant="secondary" className="text-xs" onClick={() => handleUniformChange(activeShader.uniforms[0].name, activeShader.uniforms[0].defaultValue)}>Medium</Button>
                <Button variant="secondary" className="text-xs" onClick={() => handleUniformChange(activeShader.uniforms[0].name, activeShader.uniforms[0].max)}>Hard</Button>
              </div>
            </div>
          )}

          {helperMode === 'color' && (
            <div className="mb-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
               <div className="flex items-center gap-2 mb-3">
                <Palette size={14} className="text-purple-500" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase">Color Preset</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <Button variant="secondary" className="text-xs" onClick={() => setUniformValues(prev => {
                      const reset: Record<string, number> = {};
                      activeShader.uniforms.forEach(u => reset[u.name] = u.defaultValue);
                      return reset;
                   })}>Default</Button>
                   <Button variant="secondary" className="text-xs" onClick={() => handleUniformChange(activeShader.uniforms[0].name, activeShader.uniforms[0].max)}>Max Intensity</Button>
              </div>
            </div>
          )}

        </div>
        
        {/* Reset */}
        <div className="p-4 border-t border-zinc-900">
            <Button variant="ghost" className="w-full text-zinc-600 hover:text-zinc-300" onClick={() => {
                   setUniformValues(prev => {
                      const reset: Record<string, number> = {};
                      activeShader.uniforms.forEach(u => reset[u.name] = u.defaultValue);
                      return reset;
                   });
                 }}>
                <RefreshCcw size={14} />
                Reset Defaults
            </Button>
        </div>
      </div>

      {/* CENTER PANEL: 50% - WebGL Camera View */}
      <div className="w-full lg:w-2/4 h-full relative flex flex-col bg-black overflow-hidden">
        {/* Header Title */}
        <div className="absolute top-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
           <div className="bg-black/40 backdrop-blur-sm px-6 py-2 rounded-full border border-white/5">
              <h1 className="text-lg font-bold text-white tracking-widest opacity-90">
                SHADER<span className="text-cyan-500">LENS</span>
              </h1>
           </div>
        </div>

        {/* Viewport - Using flex to center the camera perfectly regardless of aspect ratio */}
        <div className="flex-1 relative flex items-center justify-center bg-zinc-950 p-4 lg:p-8">
            <WebcamFilter 
              activeShader={activeShader}
              uniformValues={uniformValues}
              isCameraActive={isCameraActive}
            />
        </div>

        {/* Simple Footer Control */}
        <div className="h-20 bg-zinc-950 border-t border-zinc-900 flex items-center justify-center z-30">
           <button 
             onClick={() => setIsCameraActive(!isCameraActive)}
             className={`
                flex items-center gap-3 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300
                ${isCameraActive 
                  ? 'bg-zinc-800 text-red-400 hover:bg-zinc-700 hover:text-red-300 border border-zinc-700' 
                  : 'bg-zinc-100 text-black hover:bg-white hover:scale-105 border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                }
             `}
           >
             <Camera size={18} />
             {isCameraActive ? 'STOP CAMERA' : 'START CAMERA'}
           </button>
        </div>
      </div>

      {/* RIGHT PANEL: 25% - Shader Presets */}
      <div className="w-full lg:w-1/4 h-full border-l border-zinc-900 bg-zinc-950 flex flex-col z-20 shadow-lg">
        <div className="p-5 border-b border-zinc-900 flex items-center gap-2">
          <Sparkles size={18} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Filters</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3 pb-8">
            {SHADERS.map((shader) => (
              <button
                key={shader.name}
                onClick={() => handleSelectShader(shader)}
                className={`
                  relative flex flex-col justify-end h-24 p-3 rounded-xl transition-all duration-200 border text-left group
                  ${activeShader.name === shader.name 
                    ? 'bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80'
                  }
                `}
              >
                {/* Simple visual preview hint */}
                <div className={`
                    absolute top-3 right-3 w-2 h-2 rounded-full
                    ${activeShader.name === shader.name ? 'bg-cyan-500 shadow-[0_0_8px_cyan]' : 'bg-zinc-700'}
                `}/>
                
                <span className={`text-xs font-bold uppercase tracking-wide ${activeShader.name === shader.name ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {shader.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default App;