import React, { useEffect, useRef } from 'react';

const HeroWave = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- WebGL Setup (GPU accelerated for smooth, lag-free rendering) ---
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
    } catch (e) {
      console.warn("WebGL not supported, falling back to 2D Canvas Context");
    }

    let animationFrameId: number;
    let resizeListener: () => void;

    if (gl) {
      const vsSource = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      const fsSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;

        void main() {
          // Normalize coordinates equivalent to Canvas 2D math
          vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;

          float a = 0.0;
          float d = 0.0;
          for (int i = 0; i < 4; i++) {
            float fi = float(i);
            a += cos(fi - d + u_time * 0.5 - a * uv.x);
            d += sin(fi * uv.y + a);
          }

          float wave = (sin(a) + cos(d)) * 0.5;
          float intensity = 0.3 + 0.4 * wave;
          float baseVal = 0.1 + 0.15 * cos(uv.x + uv.y + u_time * 0.3);
          float blueAccent = 0.2 * sin(a * 1.5 + u_time * 0.2);
          float purpleAccent = 0.15 * cos(d * 2.0 + u_time * 0.1);

          float r = clamp(baseVal + purpleAccent * 0.8, 0.0, 1.0) * intensity;
          float g = clamp(baseVal + blueAccent * 0.6, 0.0, 1.0) * intensity;
          float b = clamp(baseVal + blueAccent * 1.2 + purpleAccent * 0.4, 0.0, 1.0) * intensity;

          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `;

      const createShader = (glContext: WebGLRenderingContext, type: number, source: string) => {
        const shader = glContext.createShader(type);
        if (!shader) return null;
        glContext.shaderSource(shader, source);
        glContext.compileShader(shader);
        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
          console.error(glContext.getShaderInfoLog(shader));
          glContext.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

      if (vs && fs) {
        const program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);

          if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const positionAttributeLocation = gl.getAttribLocation(program, "position");
            const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
            const timeUniformLocation = gl.getUniformLocation(program, "u_time");

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = [
              -1, -1,
               1, -1,
              -1,  1,
              -1,  1,
               1, -1,
               1,  1,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            const resizeCanvas = () => {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
              if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
            };

            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            resizeListener = resizeCanvas;

            const startTime = Date.now();

            const render = () => {
              if (!gl) return;
              const time = (Date.now() - startTime) * 0.001;

              gl.clearColor(0, 0, 0, 1);
              gl.clear(gl.COLOR_BUFFER_BIT);

              gl.useProgram(program);
              gl.enableVertexAttribArray(positionAttributeLocation);
              gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
              gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

              gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
              gl.uniform1f(timeUniformLocation, time);

              gl.drawArrays(gl.TRIANGLES, 0, 6);

              animationFrameId = requestAnimationFrame(render);
            };

            render();
            return () => {
              if (resizeListener) window.removeEventListener('resize', resizeListener);
              cancelAnimationFrame(animationFrameId);
            };
          }
        }
      }
    }

    // --- 2D Canvas Fallback (optimized with table lookups & configurable scale) ---
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number, imageData: ImageData, data: Uint8ClampedArray;
    // We increase SCALE slightly on the CPU fallback to keep frame rates high
    const SCALE = 4; 

    const resizeCanvas2D = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      width = Math.floor(canvas.width / SCALE);
      height = Math.floor(canvas.height / SCALE);
      imageData = ctx.createImageData(width, height);
      data = imageData.data;
    };

    window.addEventListener('resize', resizeCanvas2D);
    resizeCanvas2D();
    resizeListener = resizeCanvas2D;

    const startTime = Date.now();

    // Fast trigonometry lookup tables
    const SIN_TABLE = new Float32Array(1024);
    const COS_TABLE = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const angle = (i / 1024) * Math.PI * 2;
      SIN_TABLE[i] = Math.sin(angle);
      COS_TABLE[i] = Math.cos(angle);
    }

    const fastSin = (x: number) => {
      const index = Math.floor(((x % (Math.PI * 2)) / (Math.PI * 2)) * 1024) & 1023;
      return SIN_TABLE[index];
    };

    const fastCos = (x: number) => {
      const index = Math.floor(((x % (Math.PI * 2)) / (Math.PI * 2)) * 1024) & 1023;
      return COS_TABLE[index];
    };

    const render2D = () => {
      const time = (Date.now() - startTime) * 0.001;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u_x = (2 * x - width) / height;
          const u_y = (2 * y - height) / height;

          let a = 0;
          let d = 0;

          for (let i = 0; i < 4; i++) {
            a += fastCos(i - d + time * 0.5 - a * u_x);
            d += fastSin(i * u_y + a);
          }

          const wave = (fastSin(a) + fastCos(d)) * 0.5;
          const intensity = 0.3 + 0.4 * wave;
          const baseVal = 0.1 + 0.15 * fastCos(u_x + u_y + time * 0.3);
          const blueAccent = 0.2 * fastSin(a * 1.5 + time * 0.2);
          const purpleAccent = 0.15 * fastCos(d * 2 + time * 0.1);

          const r = Math.max(0, Math.min(1, baseVal + purpleAccent * 0.8)) * intensity;
          const g = Math.max(0, Math.min(1, baseVal + blueAccent * 0.6)) * intensity;
          const b = Math.max(0, Math.min(1, baseVal + blueAccent * 1.2 + purpleAccent * 0.4)) * intensity;

          const index = (y * width + x) * 4;
          data[index] = r * 255;
          data[index + 1] = g * 255;
          data[index + 2] = b * 255;
          data[index + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      if (SCALE > 1) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(canvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
      }

      animationFrameId = requestAnimationFrame(render2D);
    };

    render2D();

    return () => {
      if (resizeListener) window.removeEventListener('resize', resizeListener);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

export default HeroWave;
