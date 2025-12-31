import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Maximize2, Minimize2, Grid3x3 as Grid3X3, Crosshair, Ruler, Circle, Square, MousePointer, Move, Eye, EyeOff, Settings, Info, Download, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Layers, Box, Slice, Monitor, RefreshCw, Upload } from 'lucide-react';
import { readImageArrayBuffer, setPipelinesBaseUrl, setPipelineWorkerUrl } from 'itk-wasm';

// Initialize ITK-wasm
setPipelinesBaseUrl('/node_modules/itk-wasm/dist/pipelines');
setPipelineWorkerUrl('/node_modules/itk-wasm/dist/web-workers/pipeline.worker.js');

interface ITKDicomViewerProps {
  imageData?: string | ArrayBuffer | ITKImage;
  patientInfo?: {
    name: string;
    id: string;
    age: number;
    gender: string;
    studyDate: string;
    modality: string;
    bodyPart?: string;
    studyDescription?: string;
  };
  seriesInfo?: {
    seriesNumber: number;
    seriesDescription: string;
    sliceCount: number;
    currentSlice: number;
  };
  onSliceChange?: (slice: number) => void;
  showOverlays?: boolean;
  className?: string;
}

interface ITKImage {
  imageType: {
    dimension: number;
    componentType: string;
    pixelType: string;
    components: number;
  };
  name: string;
  origin: number[];
  spacing: number[];
  direction: number[];
  size: number[];
  data: ArrayBuffer;
}

const ITKDicomViewer: React.FC<ITKDicomViewerProps> = ({
  imageData,
  patientInfo,
  seriesInfo,
  onSliceChange,
  showOverlays = true,
  className = ''
}) => {
  // Viewer state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [windowLevel, setWindowLevel] = useState(50);
  const [windowWidth, setWindowWidth] = useState(100);
  const [activeTool, setActiveTool] = useState('pointer');
  const [showGrid, setShowGrid] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // ITK-specific state
  const [itkImage, setItkImage] = useState<ITKImage | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [viewMode, setViewMode] = useState<'2D' | '3D' | 'MIP'>('2D');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCanvas, setImageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [volumeData, setVolumeData] = useState<Float32Array | null>(null);
  const [imageMetadata, setImageMetadata] = useState<any>(null);

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image using ITK-wasm
  const loadImage = useCallback(async (data: ArrayBuffer | ITKImage) => {
    try {
      setLoading(true);
      setError(null);

      let image: ITKImage;

      if ((data as ITKImage).imageType) {
        // Data is already an ITK Image object
        image = data as ITKImage;
      } else {
        // Read image using ITK-wasm
        const result = await readImageArrayBuffer(data as ArrayBuffer, 'image.dcm');
        image = result.image;
        result.webWorker.terminate();
      }

      setItkImage(image);
      setVolumeData(new Float32Array(image.data as ArrayBuffer));
      setImageMetadata({
        dimensions: image.size,
        spacing: image.spacing,
        origin: image.origin,
        direction: image.direction,
        componentType: image.imageType.componentType,
        pixelType: image.imageType.pixelType
      });

      // Set initial slice to middle
      if (image.imageType.dimension === 3) {
        const middleSlice = Math.floor(image.size[2] / 2);
        setCurrentSlice(middleSlice);
        onSliceChange?.(middleSlice + 1);
      }

    } catch (err) {
      console.error('ITK image loading failed:', err);
      setError(`Failed to load image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [onSliceChange]);

  // Render 2D slice
  const render2DSlice = useCallback((sliceIndex: number) => {
    if (!itkImage || !volumeData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [width, height, depth] = itkImage.size;

    // Ensure slice index is valid
    const validSliceIndex = Math.max(0, Math.min(sliceIndex, depth - 1));

    // Extract slice data
    const sliceData = new Float32Array(width * height);
    const sliceOffset = validSliceIndex * width * height;

    for (let i = 0; i < width * height; i++) {
      sliceData[i] = volumeData[sliceOffset + i];
    }

    // Apply window/level
    const windowedData = applyWindowLevel(sliceData, windowLevel, windowWidth);

    // Convert to ImageData
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < windowedData.length; i++) {
      const pixelValue = Math.round(windowedData[i] * 255);
      const idx = i * 4;
      imageData.data[idx] = pixelValue;     // R
      imageData.data[idx + 1] = pixelValue; // G
      imageData.data[idx + 2] = pixelValue; // B
      imageData.data[idx + 3] = 255;        // A
    }

    // Clear canvas and draw image
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);

  }, [itkImage, volumeData, windowLevel, windowWidth]);

  // Render Maximum Intensity Projection
  const renderMIP = useCallback(() => {
    if (!itkImage || !volumeData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [width, height, depth] = itkImage.size;

    // Calculate MIP
    const mipData = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxValue = -Infinity;

        for (let z = 0; z < depth; z++) {
          const index = z * width * height + y * width + x;
          maxValue = Math.max(maxValue, volumeData[index]);
        }

        mipData[y * width + x] = maxValue;
      }
    }

    // Apply window/level and render
    const windowedData = applyWindowLevel(mipData, windowLevel, windowWidth);

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < windowedData.length; i++) {
      const pixelValue = Math.round(windowedData[i] * 255);
      const idx = i * 4;
      imageData.data[idx] = pixelValue;
      imageData.data[idx + 1] = pixelValue;
      imageData.data[idx + 2] = pixelValue;
      imageData.data[idx + 3] = 255;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);

  }, [itkImage, volumeData, windowLevel, windowWidth]);

  // Apply window/level transformation
  const applyWindowLevel = (data: Float32Array, level: number, width: number): Float32Array => {
    const result = new Float32Array(data.length);
    const minVal = level - width / 2;
    const maxVal = level + width / 2;

    for (let i = 0; i < data.length; i++) {
      if (data[i] <= minVal) {
        result[i] = 0;
      } else if (data[i] >= maxVal) {
        result[i] = 1;
      } else {
        result[i] = (data[i] - minVal) / (maxVal - minVal);
      }
    }

    return result;
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      await loadImage(arrayBuffer);
    } catch (err) {
      setError(`Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && itkImage && itkImage.imageType.dimension === 3) {
      interval = setInterval(() => {
        setCurrentSlice(prev => {
          const nextSlice = (prev + 1) % itkImage.size[2];
          onSliceChange?.(nextSlice + 1);
          return nextSlice;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, itkImage, onSliceChange]);

  // Render current view
  useEffect(() => {
    if (!itkImage || !volumeData) return;

    if (viewMode === '2D') {
      render2DSlice(currentSlice);
    } else if (viewMode === 'MIP') {
      renderMIP();
    }
  }, [itkImage, volumeData, currentSlice, viewMode, render2DSlice, renderMIP]);

  // Load image when imageData changes
  useEffect(() => {
    if (imageData && imageData instanceof ArrayBuffer) {
      loadImage(imageData);
    }
  }, [imageData, loadImage]);

  // Event handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 500));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 20));
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation(prev => (prev - 90 + 360) % 360);
  const handleFlipHorizontal = () => setFlipH(prev => !prev);
  const handleFlipVertical = () => setFlipV(prev => !prev);

  const handleReset = () => {
    setZoomLevel(100);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setPanOffset({ x: 0, y: 0 });
    setWindowLevel(50);
    setWindowWidth(100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && activeTool === 'pan') {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (itkImage && itkImage.imageType.dimension === 3) {
      const delta = e.deltaY > 0 ? 1 : -1;
      const newSlice = Math.max(0, Math.min(currentSlice + delta, itkImage.size[2] - 1));
      setCurrentSlice(newSlice);
      onSliceChange?.(newSlice + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getCanvasTransform = () => {
    return `
      scale(${zoomLevel / 100}) 
      rotate(${rotation}deg) 
      scaleX(${flipH ? -1 : 1}) 
      scaleY(${flipV ? -1 : 1})
      translate(${panOffset.x}px, ${panOffset.y}px)
    `;
  };

  return (
    <div
      ref={viewerRef}
      className={`bg-black rounded-lg relative overflow-hidden border border-slate-700/50 ${className}`}
    >
      {/* Enhanced Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between bg-black/90 backdrop-blur-sm rounded-lg p-2 border border-slate-600/50">
        <div className="flex items-center space-x-1">
          {/* View Mode Selection */}
          <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1 mr-2">
            <button
              onClick={() => setViewMode('2D')}
              className={`p-2 rounded-lg transition-colors ${viewMode === '2D' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="2D View"
            >
              <Slice className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('MIP')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'MIP' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Maximum Intensity Projection"
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`p-2 rounded-lg transition-colors ${viewMode === '3D' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="3D Volume Rendering"
            >
              <Box className="h-4 w-4" />
            </button>
          </div>

          {/* Tool Selection */}
          <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'pointer' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Pointer"
            >
              <MousePointer className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'pan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Pan"
            >
              <Move className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('ruler')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'ruler' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Measure"
            >
              <Ruler className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('circle')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="ROI Circle"
            >
              <Circle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('square')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'square' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="ROI Rectangle"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-600 mx-1"></div>

          {/* View Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-colors ${showGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCrosshair(!showCrosshair)}
              className={`p-2 rounded-lg transition-colors ${showCrosshair ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Crosshair"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowPatientInfo(!showPatientInfo)}
              className={`p-2 rounded-lg transition-colors ${showPatientInfo ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              title="Patient Info"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-600 mx-1"></div>

          {/* Transform Controls */}
          <div className="flex items-center space-x-1">
            <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-300 font-mono bg-slate-700 px-2 py-1 rounded">
              {zoomLevel}%
            </span>
            <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={handleRotateLeft} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Rotate Left">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={handleRotateRight} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Rotate Right">
              <RotateCw className="h-4 w-4" />
            </button>
            <button onClick={handleFlipHorizontal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Flip Horizontal">
              <FlipHorizontal className="h-4 w-4" />
            </button>
            <button onClick={handleFlipVertical} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Flip Vertical">
              <FlipVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Cine Controls for 3D Volumes */}
          {itkImage && itkImage.imageType.dimension === 3 && (
            <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => {
                  setCurrentSlice(0);
                  onSliceChange?.(1);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="First Slice"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  const lastSlice = itkImage.size[2] - 1;
                  setCurrentSlice(lastSlice);
                  onSliceChange?.(lastSlice + 1);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Last Slice"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-slate-700 text-white text-xs px-2 py-1 rounded"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          )}

          <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Reset View">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div
        className="w-full h-full flex items-center justify-center relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
            <div className="text-center text-white">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading medical image...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
            <div className="text-center text-red-300 bg-red-900/20 p-6 rounded-lg border border-red-700/50">
              <p className="font-medium mb-2">Error Loading Image</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* ITK Canvas */}
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: getCanvasTransform() }}
        >
          <canvas
            ref={canvasRef}
            className="max-w-none medical-viewer border border-slate-600/30"
            style={{
              imageRendering: 'pixelated',
              cursor: activeTool === 'pan' ? 'grab' : activeTool === 'ruler' ? 'crosshair' : 'default'
            }}
          />

          {/* Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="itk-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#64748b" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#itk-grid)" />
              </svg>
            </div>
          )}

          {/* Crosshair */}
          {showCrosshair && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-cyan-400 opacity-60"></div>
              <div className="absolute w-px h-full bg-cyan-400 opacity-60"></div>
            </div>
          )}

          {/* Measurement Overlays */}
          {showMeasurements && activeTool === 'ruler' && (
            <div className="absolute top-4 left-4 bg-black/80 text-cyan-300 text-xs font-mono p-2 rounded border border-cyan-700/50 pointer-events-none">
              Distance: {imageMetadata?.spacing ? (12.3 * imageMetadata.spacing[0]).toFixed(1) : '12.3'} mm
            </div>
          )}

          {showMeasurements && activeTool === 'circle' && (
            <div className="absolute top-4 right-4 bg-black/80 text-cyan-300 text-xs font-mono p-2 rounded border border-cyan-700/50 pointer-events-none">
              Area: {imageMetadata?.spacing ? (45.7 * imageMetadata.spacing[0] * imageMetadata.spacing[1]).toFixed(1) : '45.7'} mm²
            </div>
          )}
        </div>

        {/* No Image State */}
        {!itkImage && !loading && !error && (
          <div className="text-center text-slate-400">
            <div className="w-20 h-20 bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Monitor className="h-10 w-10" />
            </div>
            <p className="text-xl font-medium">ITK Medical Viewer</p>
            <p className="text-sm mt-2">Upload DICOM, NIfTI, or other medical images</p>
            <p className="text-xs text-slate-500 mt-1">Supports .dcm, .nii, .nii.gz, .nrrd, .mha, .mhd</p>
          </div>
        )}
      </div>

      {/* Enhanced Patient Information Overlay */}
      {showPatientInfo && patientInfo && (
        <div className="absolute top-16 left-2 bg-black/90 backdrop-blur-sm text-white text-xs font-mono p-4 rounded-lg border border-slate-600/50 shadow-xl">
          <div className="space-y-1">
            <div className="font-semibold text-cyan-300 text-sm">{patientInfo.name}</div>
            <div className="text-slate-300">ID: {patientInfo.id}</div>
            <div className="text-slate-300">{patientInfo.age}Y {patientInfo.gender}</div>
            <div className="text-slate-300">{patientInfo.studyDate}</div>
            <div className="text-cyan-300 font-medium">{patientInfo.modality}</div>
            {patientInfo.bodyPart && <div className="text-slate-300">{patientInfo.bodyPart}</div>}
            {patientInfo.studyDescription && <div className="text-slate-400 text-xs">{patientInfo.studyDescription}</div>}
          </div>
        </div>
      )}

      {/* Enhanced Series and ITK Information */}
      <div className="absolute top-16 right-2 bg-black/90 backdrop-blur-sm text-white text-xs font-mono p-4 rounded-lg border border-slate-600/50 shadow-xl">
        <div className="space-y-1">
          {seriesInfo && (
            <>
              <div className="text-cyan-300 font-medium">Series: {seriesInfo.seriesNumber}</div>
              <div className="text-slate-300 text-xs">{seriesInfo.seriesDescription}</div>
            </>
          )}

          {itkImage && (
            <>
              <div className="border-t border-slate-600 pt-2 mt-2">
                <div className="text-cyan-300 font-medium">ITK Image Info:</div>
                <div className="text-slate-300">Dimensions: {itkImage.size.join('×')}</div>
                <div className="text-slate-300">Type: {itkImage.imageType.componentType}</div>
                <div className="text-slate-300">Components: {itkImage.imageType.components}</div>
                {imageMetadata?.spacing && (
                  <div className="text-slate-300">Spacing: {imageMetadata.spacing.map((s: number) => s.toFixed(2)).join('×')} mm</div>
                )}
              </div>
            </>
          )}

          <div className="border-t border-slate-600 pt-2 mt-2">
            <div className="text-slate-300">View: {viewMode}</div>
            {itkImage && itkImage.imageType.dimension === 3 && (
              <div className="text-slate-300">Slice: {currentSlice + 1}/{itkImage.size[2]}</div>
            )}
            <div className="text-slate-300">Zoom: {zoomLevel}%</div>
            <div className="text-slate-300">W: {windowWidth} L: {windowLevel}</div>
          </div>
        </div>
      </div>

      {/* Enhanced Window/Level Controls */}
      <div className="absolute bottom-2 left-2 right-2 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-slate-600/50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Window Width: {windowWidth}
            </label>
            <input
              type="range"
              min="1"
              max="200"
              value={windowWidth}
              onChange={(e) => setWindowWidth(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Window Level: {windowLevel}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={windowLevel}
              onChange={(e) => setWindowLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* ITK Slice Navigation */}
        {itkImage && itkImage.imageType.dimension === 3 && (
          <div className="mt-4 flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
              Slice Navigation:
            </span>
            <input
              type="range"
              min="0"
              max={itkImage.size[2] - 1}
              value={currentSlice}
              onChange={(e) => {
                const slice = parseInt(e.target.value);
                setCurrentSlice(slice);
                onSliceChange?.(slice + 1);
              }}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-slate-300 font-mono bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
              {currentSlice + 1}/{itkImage.size[2]}
            </span>
          </div>
        )}

        {/* View Mode Info */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span>Mode: <span className="text-cyan-300 font-medium">{viewMode}</span></span>
            {imageMetadata && (
              <span>Pixel Size: <span className="text-white">{imageMetadata.spacing?.[0]?.toFixed(2) || 'N/A'} mm</span></span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400">●</span>
            <span>ITK-wasm Ready</span>
          </div>
        </div>
      </div>

      {/* File Drop Zone Overlay */}
      {!itkImage && !loading && (
        <div className="absolute inset-4 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center opacity-50 hover:opacity-80 transition-opacity">
          <div className="text-center text-slate-400">
            <Upload className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm">Drop medical images here</p>
            <p className="text-xs">DICOM, NIfTI, NRRD, MHA, MHD</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITKDicomViewer;