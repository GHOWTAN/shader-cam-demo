import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShaderDefinition } from '../types';
import { VERTEX_SHADER } from '../constants';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';

interface WebcamFilterProps {
  activeShader: ShaderDefinition;
  uniformValues: Record<string, number>;
  isCameraActive: boolean;
  onCameraError?: (error: string) => void;
}

const WebcamFilter: React.FC<WebcamFilterProps> = ({ 
  activeShader, 
  uniformValues, 
  isCameraActive,
  onCameraError 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number>();
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [resolution, setResolution] = useState<{ width: number, height: number }>({ width: 1280, height: 720 });

  // Initialize Video
  useEffect(() => {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;

    const startCamera = async () => {
      if (!isCameraActive) {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        
        video.srcObject = stream;
        
        // Wait for metadata to get true size
        video.onloadedmetadata = () => {
          setResolution({ width: video.videoWidth, height: video.videoHeight });
          video.play();
          setHasPermission(true);
        };
        
      } catch (err) {
        console.error("Camera access denied:", err);
        setHasPermission(false);
        if (onCameraError) onCameraError("Camera access denied.");
      }
    };

    startCamera();

    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive, onCameraError]);

  // Compile Shader Helper
  const compileShader = (gl: WebGLRenderingContext, source: string, type: number) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  // Setup WebGL Program
  const setupProgram = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;

    const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, activeShader.fragmentSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    if (programRef.current) gl.deleteProgram(programRef.current);
    programRef.current = program;
    gl.useProgram(program);

    // Setup Geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }, [activeShader]);

  // Initialize WebGL Context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We set internal resolution to match camera, but CSS handles display size
    canvas.width = resolution.width;
    canvas.height = resolution.height;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;
    glRef.current = gl;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    setupProgram();
    gl.viewport(0, 0, canvas.width, canvas.height);
    
  }, [setupProgram, resolution]);

  // Update Program when shader changes
  useEffect(() => {
    setupProgram();
  }, [setupProgram]);

  // Render Loop
  const render = useCallback(() => {
    const gl = glRef.current;
    const video = videoRef.current;
    const program = programRef.current;
    const texture = textureRef.current;

    if (gl && program && video && video.readyState === video.HAVE_ENOUGH_DATA && isCameraActive) {
      gl.useProgram(program);
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

      const timeLoc = gl.getUniformLocation(program, 'uTime');
      const resLoc = gl.getUniformLocation(program, 'uResolution');
      
      gl.uniform1f(timeLoc, performance.now() / 1000);
      gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);

      activeShader.uniforms.forEach(u => {
        const loc = gl.getUniformLocation(program, u.name);
        if (loc) {
          gl.uniform1f(loc, uniformValues[u.name] ?? u.defaultValue);
        }
      });

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (gl && !isCameraActive) {
      gl.clearColor(0.09, 0.09, 0.11, 1); // Zinc-900 equivalent
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [activeShader, uniformValues, isCameraActive]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [render]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black">
      {!isCameraActive && hasPermission !== false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-4 z-10 bg-zinc-900/50">
            <Camera size={48} className="opacity-50" />
            <p className="text-sm font-medium tracking-wider uppercase">Camera Offline</p>
        </div>
      )}
      
      {isCameraActive && !hasPermission && hasPermission !== false && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-4 z-10 bg-black">
             <Loader2 size={32} className="animate-spin text-cyan-500" />
             <p className="text-sm font-medium">Initializing Stream...</p>
         </div>
      )}

      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-4 bg-zinc-900 z-10">
            <AlertCircle size={48} />
            <p className="text-sm font-medium">Camera Access Denied</p>
        </div>
      )}

      {/* 
        The canvas uses 'scale-x-[-1]' to mirror the image naturally for user-facing cameras.
        object-contain ensures the aspect ratio is preserved within the center panel.
      */}
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full object-contain scale-x-[-1] shadow-2xl" 
      />
    </div>
  );
};

export default WebcamFilter;