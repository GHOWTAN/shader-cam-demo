export enum ShaderType {
  Normal = 'Normal',
  Ink = 'Ink',
  Sketch = 'Sketch',
  Comic = 'Comic',
  Pop = 'Pop',
  Cyber = 'Cyber',
  Neon = 'Neon',
  Dream = 'Dream',
  Pixelate = 'Pixelate',
  Glitch = 'Glitch',
  CRT = 'CRT',
  Film = 'Film',
  Thermal = 'Thermal',
  RetroPC = 'RetroPC',
  Rainbow = 'Rainbow',
}

export interface UniformConfig {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface ShaderDefinition {
  type: ShaderType;
  name: string;
  fragmentSource: string;
  uniforms: UniformConfig[];
}