import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Camera, RotateCcw, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface VideoConsultationProps {
    patientName?: string;
    onVideoSent?: (videoId: string) => void;
}

const VideoConsultation: React.FC<VideoConsultationProps> = ({
    patientName = "Patient",
    onVideoSent
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [hasRecorded, setHasRecorded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [description, setDescription] = useState('');

    const liveVideoRef = useRef<HTMLVideoElement>(null);
    const playbackVideoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [localStream]);

    // Recording timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            setError(null);
            setSuccess(null);

            // Request camera and microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            console.log('Got media stream:', stream);
            setLocalStream(stream);

            // Set up MediaRecorder first
            let mimeType = 'video/webm;codecs=vp8,opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/mp4';
            }

            console.log('Using MIME type:', mimeType);

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    console.log('Data chunk received:', event.data.size, 'bytes');
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log('Recording stopped. Total chunks:', chunksRef.current.length);
                const blob = new Blob(chunksRef.current, { type: mimeType });
                console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
                setRecordedBlob(blob);
                setHasRecorded(true);

                // Display playback - wait a bit to ensure state updates
                setTimeout(() => {
                    if (playbackVideoRef.current) {
                        const url = URL.createObjectURL(blob);
                        console.log('Setting playback URL:', url);
                        playbackVideoRef.current.src = url;
                        playbackVideoRef.current.load();
                    }
                }, 100);

                // Stop the stream
                stream.getTracks().forEach(track => {
                    console.log('Stopping track:', track.kind);
                    track.stop();
                });
                setLocalStream(null);
            };

            // Now display live preview and start recording
            setIsRecording(true);
            setRecordingDuration(0);

            // Use setTimeout to ensure state has updated before setting video
            setTimeout(async () => {
                if (liveVideoRef.current) {
                    liveVideoRef.current.srcObject = stream;
                    try {
                        await liveVideoRef.current.play();
                        console.log('Live video playing');
                    } catch (playErr) {
                        console.error('Error playing live video:', playErr);
                    }
                }

                // Start recording
                mediaRecorder.start(1000); // Collect data every second
                console.log('MediaRecorder started');
            }, 100);

        } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            console.log('Stopping recording...');
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const reRecord = () => {
        setHasRecorded(false);
        setRecordedBlob(null);
        setIsPlaying(false);
        setRecordingDuration(0);
        setDescription('');
        setError(null);
        setSuccess(null);

        if (playbackVideoRef.current) {
            playbackVideoRef.current.src = '';
        }
    };



    const uploadVideo = async () => {
        if (!recordedBlob) {
            setError('No video recorded');
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', recordedBlob, `recording-${Date.now()}.webm`);
            formData.append('description', description);
            formData.append('patient_name', patientName);

            const token = localStorage.getItem('token');

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    const response = JSON.parse(xhr.responseText);
                    setSuccess('Video sent successfully!');
                    setIsUploading(false);

                    if (onVideoSent && response.video_id) {
                        onVideoSent(response.video_id);
                    }

                    // Clear after 3 seconds
                    setTimeout(() => {
                        reRecord();
                        setSuccess(null);
                    }, 3000);
                } else {
                    throw new Error('Upload failed');
                }
            });

            xhr.addEventListener('error', () => {
                throw new Error('Network error during upload');
            });

            xhr.open('POST', 'http://localhost:5001/api/video-consultation/upload');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);

        } catch (err) {
            console.error('Error uploading video:', err);
            setError('Failed to upload video. Please try again.');
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Video className="h-6 w-6 text-blue-400" />
                        Video Message to Doctor
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        {isRecording ? 'Recording in progress...' : hasRecorded ? 'Review your video before sending' : 'Record a video message for your doctor'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {success}
                </div>
            )}

            {/* Video Display */}
            <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 mb-6">
                {/* Live Recording View */}
                {isRecording && (
                    <>
                        <video
                            ref={liveVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                            style={{ display: 'block' }}
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-red-600 rounded-lg">
                            <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
                            <p className="text-sm text-white font-medium">REC {formatTime(recordingDuration)}</p>
                        </div>
                    </>
                )}

                {/* Playback View */}
                {hasRecorded && !isRecording && (
                    <>
                        <video
                            ref={playbackVideoRef}
                            playsInline
                            controls
                            className="w-full h-full object-cover"
                            style={{ display: 'block', backgroundColor: '#1e293b' }}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onError={(e) => {
                                console.error('Video playback error:', e);
                                setError('Error playing video. Please try recording again.');
                            }}
                        />
                        <div className="absolute bottom-3 left-3 px-3 py-1 bg-slate-900/80 rounded-lg">
                            <p className="text-sm text-white font-medium">Duration: {formatTime(recordingDuration)}</p>
                        </div>
                    </>
                )}

                {/* Idle State */}
                {!isRecording && !hasRecorded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
                        <div className="p-4 bg-slate-700 rounded-full mb-3">
                            <Camera className="h-12 w-12 text-slate-400" />
                        </div>
                        <p className="text-slate-400 font-medium">Ready to Record</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Start Recording" to begin</p>
                    </div>
                )}
            </div>

            {/* Description Input (when recorded) */}
            {hasRecorded && !isRecording && !success && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Add a note (optional)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your symptoms or reason for consultation..."
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                    />
                </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Uploading video...</span>
                        <span className="text-sm text-blue-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                {!isRecording && !hasRecorded && (
                    <button
                        onClick={startRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                    >
                        <Video className="h-5 w-5" />
                        Start Recording
                    </button>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                        <VideoOff className="h-5 w-5" />
                        Stop Recording
                    </button>
                )}

                {hasRecorded && !isRecording && !success && (
                    <>
                        <button
                            onClick={reRecord}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            disabled={isUploading}
                        >
                            <RotateCcw className="h-5 w-5" />
                            Re-record
                        </button>

                        <button
                            onClick={uploadVideo}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    Send to Doctor
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Recording Info */}
            {!hasRecorded && !isRecording && (
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300">
                        <strong>Tips:</strong> Find a quiet place with good lighting.
                        Explain your symptoms clearly and show any relevant areas if needed.
                        You can review and re-record before sending.
                    </p>
                </div>
            )}
        </div>
    );
};

export default VideoConsultation;
