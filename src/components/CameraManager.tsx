import { useEffect, useRef, useState } from "react";
import { createFaceLandmarker, faceLandmarker } from "../utils/vision";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Camera } from "@capacitor/camera";
import { Share } from "@capacitor/share";

interface CameraManagerProps {
    onResult: (result: any) => void;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function CameraManager({ onResult, canvasRef }: CameraManagerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastVideoTime = useRef(-1);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isRecording, setIsRecording] = useState(false);
    const requestRef = useRef<number>(0);

    // Recording Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunks = useRef<Blob[]>([]);
    const compositorCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function setupCamera() {
            if (!videoRef.current) return;
            console.log(`Setting up camera: ${facingMode}`);

            if (!faceLandmarker) {
                try {
                    await createFaceLandmarker();
                } catch (e) {
                    console.error("Failed createFaceLandmarker", e);
                }
            }

            try {
                if (stream) {
                    stream.getTracks().forEach(t => t.stop());
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facingMode }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadeddata = () => {
                        videoRef.current?.play();
                    };
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
            }
        }
        setupCamera();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [facingMode]);

    // Main Loop: Detection + Compositing
    useEffect(() => {

        // Initialize Compositor Canvas
        if (!compositorCanvasRef.current) {
            compositorCanvasRef.current = document.createElement('canvas');
        }

        const loop = () => {
            if (
                videoRef.current &&
                faceLandmarker &&
                videoRef.current.currentTime !== lastVideoTime.current &&
                videoRef.current.videoWidth > 0 &&
                videoRef.current.videoHeight > 0
            ) {
                lastVideoTime.current = videoRef.current.currentTime;

                // 1. Face Detection
                try {
                    const startTimeMs = performance.now();
                    const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);
                    (results as any).videoWidth = videoRef.current.videoWidth;
                    (results as any).videoHeight = videoRef.current.videoHeight;
                    (results as any).facingMode = facingMode;
                    onResult(results);
                } catch (e) {
                    console.error("Detection error:", e);
                }

                // 2. Recording Compositor (Video + WebGL Canvas)
                if (isRecording && compositorCanvasRef.current && canvasRef.current) {
                    const ctx = compositorCanvasRef.current.getContext('2d');
                    const vW = videoRef.current.videoWidth;
                    const vH = videoRef.current.videoHeight;

                    // Match compositor size to video
                    if (compositorCanvasRef.current.width !== vW || compositorCanvasRef.current.height !== vH) {
                        compositorCanvasRef.current.width = vW;
                        compositorCanvasRef.current.height = vH;
                    }

                    if (ctx) {
                        // Draw Video (Background)
                        ctx.save();
                        if (facingMode === 'user') {
                            ctx.translate(vW, 0);
                            ctx.scale(-1, 1);
                        }
                        ctx.drawImage(videoRef.current, 0, 0, vW, vH);
                        ctx.restore();

                        // Draw WebGL Canvas (Foreground)
                        // Note: WebGL canvas might effectively be screen size, we need to draw it scaled to fit video
                        // or draw it "contained".
                        // Avatar.tsx logic handles "Contain" for *rendering*.
                        // But the DOM element size is viewport pixels.
                        // We simply draw the full WebGL canvas on top.
                        // Ideally we draw it stretching to match, assuming Viewport == Video Aspect visually.
                        ctx.drawImage(canvasRef.current, 0, 0, vW, vH);

                        // Capture happens via stream connected to this canvas (setup in handleStartRecording)
                        // Actually, we usually requestFrame on the stream, but MediaRecorder handles it if we get stream.
                    }
                }
            }
            requestRef.current = requestAnimationFrame(loop);
        };
        loop();
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [onResult, facingMode, isRecording, canvasRef]); // Add isRecording dependency to trigger updates? No, refs handle state. But we need isRecording for the `if`.

    // Recording Handlers
    const handleToggleRecord = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        if (!compositorCanvasRef.current) return;

        // Ensure composition happens at least once before starting
        const stream = compositorCanvasRef.current.captureStream(30); // 30 FPS

        // iOS Safari prefers 'video/mp4' (H.264)
        // We avoid specifying codecs explicitly to let browser pick best supported one.
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

        try {
            const recorder = new MediaRecorder(stream, options);
            recordedChunks.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                // Use the recorder's actual mime type to create the blob
                const type = recorder.mimeType || 'video/mp4'; // Fallback
                const blob = new Blob(recordedChunks.current, { type: type });
                console.log(`Recorder stopped. Blob size: ${blob.size}, Type: ${type}`);

                if (blob.size > 0) {
                    saveVideo(blob, type);
                } else {
                    alert("Recording failed: Video is empty.");
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            console.log(`Recording started. MimeType: ${recorder.mimeType}`);
        } catch (e) {
            console.error("Failed to start MediaRecorder", e);
            alert("Failed to start recording: " + (e as any).message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            console.log("Recording stopped...");
        }
    };

    const saveVideo = async (blob: Blob, mimeType: string) => {
        // Determine extension
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
        const fileName = `memoji-${Date.now()}.${ext}`;

        if (!Capacitor.isNativePlatform()) {
            // Web fallback: download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            return;
        }

        try {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const result = reader.result as string;
                // data:video/mp4;base64,.....
                const base64Data = result.split(',')[1];

                // Write to cache
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache
                });

                console.log("File saved to cache:", savedFile.uri);

                // Save to Gallery
                console.log("File saved to cache:", savedFile.uri);

                try {
                    // Try direct save
                    // Revert hack: iOS usually prefers valid URIs, retry with full URI first or maybe it was the stripping that broke it?
                    // Actually, let's keep it simple: try standard save, if fails, use Share.
                    await Media.saveVideo({ path: savedFile.uri });
                    alert("Video saved to Gallery!");
                } catch (mediaError) {
                    console.warn("Direct save failed, attempting Share fallback...", mediaError);
                    // Fallback to Share Sheet
                    await Share.share({
                        title: 'Memoji Video',
                        url: savedFile.uri,
                    });
                }
            };
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save/share video: " + (e as any).message);
        }
    };

    const openGallery = async () => {
        try {
            await Camera.pickImages({
                quality: 90,
                limit: 1
            });
        } catch (e) {
            console.log("Gallery closed or error", e);
        }
    };

    return (
        <>
            <video
                ref={videoRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    opacity: 1,
                    pointerEvents: 'none',
                    zIndex: -1,
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
                playsInline
                muted
                autoPlay
            />

            {/* Camera UI */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 40px',
                zIndex: 2000
            }}>
                <button
                    onClick={openGallery}
                    style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '2px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </button>

                <button
                    onClick={handleToggleRecord}
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        border: '4px solid white',
                        background: 'transparent',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: isRecording ? '8px' : '50%',
                        background: '#FF3B30',
                        transition: 'all 0.2s ease'
                    }} />
                </button>

                <button
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </button>
            </div>
        </>
    );
}
