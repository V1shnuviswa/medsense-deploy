import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Maximize2, Minimize2, Grid3X3, Crosshair, Ruler, Circle, Square,
  MousePointer, Move, Eye, EyeOff, Settings, Info, Download,
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX
} from 'lucide-react';

interface DicomViewerProps {
  imageData?: string;
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

const DicomViewer: React.FC<DicomViewerProps> = ({
  imageData,
  patientInfo,
  seriesInfo,
  onSliceChange,
  showOverlays = true,
  className = ''
}) => {
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

  const viewerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Auto-play functionality for multi-slice series
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && seriesInfo && seriesInfo.sliceCount > 1) {
      interval = setInterval(() => {
        const nextSlice = (seriesInfo.currentSlice % seriesInfo.sliceCount) + 1;
        onSliceChange?.(nextSlice);
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, seriesInfo, onSliceChange]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 500));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 25));
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getImageTransform = () => {
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
      {/* Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between bg-black/80 backdrop-blur-sm rounded-lg p-2">
        <div className="flex items-center space-x-1">
          {/* Tool Selection */}
          <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'pointer' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Pointer"
            >
              <MousePointer className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'pan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Pan"
            >
              <Move className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('ruler')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'ruler' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Measure"
            >
              <Ruler className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('circle')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="ROI Circle"
            >
              <Circle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('square')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'square' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
              className={`p-2 rounded-lg transition-colors ${
                showGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCrosshair(!showCrosshair)}
              className={`p-2 rounded-lg transition-colors ${
                showCrosshair ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Crosshair"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowPatientInfo(!showPatientInfo)}
              className={`p-2 rounded-lg transition-colors ${
                showPatientInfo ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
          {/* Cine Controls for Multi-slice */}
          {seriesInfo && seriesInfo.sliceCount > 1 && (
            <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => onSliceChange?.(1)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="First Slice"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg transition-colors ${
                  isPlaying ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onSliceChange?.(seriesInfo.sliceCount)}
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
            <Settings className="h-4 w-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div 
        className="w-full h-full flex items-center justify-center relative cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Medical Image */}
        <div 
          ref={imageRef}
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: getImageTransform() }}
        >
          {imageData ? (
            <img 
              src={imageData} 
              alt="Medical Image"
              className="max-w-none medical-viewer"
              draggable={false}
              style={{
                filter: `brightness(${windowLevel}%) contrast(${windowWidth}%)`
              }}
            />
          ) : (
            <div className="w-96 h-96 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600">
              <div className="text-center text-slate-400">
                <div className="w-16 h-16 bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Eye className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium">No Image Loaded</p>
                <p className="text-sm">Upload DICOM files to view</p>
              </div>
            </div>
          )}

          {/* Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="dicom-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#64748b" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dicom-grid)" />
              </svg>
            </div>
          )}

          {/* Crosshair */}
          {showCrosshair && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-blue-400 opacity-60"></div>
              <div className="absolute w-px h-full bg-blue-400 opacity-60"></div>
            </div>
          )}

          {/* Measurement Overlays */}
          {showMeasurements && activeTool === 'ruler' && (
            <div className="absolute top-4 left-4 bg-black/70 text-blue-300 text-xs font-mono p-2 rounded pointer-events-none">
              Distance: 12.3 mm
            </div>
          )}

          {showMeasurements && activeTool === 'circle' && (
            <div className="absolute top-4 right-4 bg-black/70 text-blue-300 text-xs font-mono p-2 rounded pointer-events-none">
              Area: 45.7 mm²
            </div>
          )}
        </div>
      </div>

      {/* Patient Information Overlay */}
      {showPatientInfo && patientInfo && (
        <div className="absolute top-16 left-2 bg-black/80 backdrop-blur-sm text-white text-xs font-mono p-3 rounded-lg border border-slate-600/50">
          <div className="space-y-1">
            <div className="font-semibold text-blue-300">{patientInfo.name}</div>
            <div>ID: {patientInfo.id}</div>
            <div>{patientInfo.age}Y {patientInfo.gender}</div>
            <div>{patientInfo.studyDate}</div>
            <div className="text-blue-300">{patientInfo.modality}</div>
            {patientInfo.bodyPart && <div>{patientInfo.bodyPart}</div>}
            {patientInfo.studyDescription && <div className="text-slate-300">{patientInfo.studyDescription}</div>}
          </div>
        </div>
      )}

      {/* Series Information */}
      {seriesInfo && (
        <div className="absolute top-16 right-2 bg-black/80 backdrop-blur-sm text-white text-xs font-mono p-3 rounded-lg border border-slate-600/50">
          <div className="space-y-1">
            <div>Series: {seriesInfo.seriesNumber}</div>
            <div className="text-blue-300">{seriesInfo.seriesDescription}</div>
            <div>Slice: {seriesInfo.currentSlice}/{seriesInfo.sliceCount}</div>
            <div>Zoom: {zoomLevel}%</div>
            <div>W: {windowWidth} L: {windowLevel}</div>
          </div>
        </div>
      )}

      {/* Window/Level Controls */}
      <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg p-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
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
            <label className="block text-xs font-medium text-slate-300 mb-1">
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

        {/* Slice Navigation */}
        {seriesInfo && seriesInfo.sliceCount > 1 && (
          <div className="mt-3 flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
              Slice Navigation:
            </span>
            <input
              type="range"
              min="1"
              max={seriesInfo.sliceCount}
              value={seriesInfo.currentSlice}
              onChange={(e) => onSliceChange?.(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-slate-300 font-mono bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
              {seriesInfo.currentSlice}/{seriesInfo.sliceCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DicomViewer;