import { useEffect, useRef, useState } from "react";
import { createFaceLandmarker, faceLandmarker } from "../utils/vision";

interface CameraManagerProps {
    onResult: (result: any) => void;
}

export function CameraManager({ onResult }: CameraManagerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastVideoTime = useRef(-1);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isRecording, setIsRecording] = useState(false);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function setupCamera() {
            if (!videoRef.current) return;

            console.log(`Setting up camera: ${facingMode}`);

            if (!faceLandmarker) {
                try {
                    await createFaceLandmarker();
                    console.log("FaceLandmarker created");
                } catch (e) {
                    console.error("Failed createFaceLandmarker", e);
                }
            }

            try {
                if (stream) {
                    stream.getTracks().forEach(t => t.stop());
                }

                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        // Let OS decide native resolution to avoid digital zoom
                        facingMode: facingMode
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.addEventListener("loadeddata", () => {
                        console.log("Video loadeddata, playing...");
                        videoRef.current?.play();
                    });
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

    useEffect(() => {
        let lastLog = 0;
        const loop = () => {
            if (
                videoRef.current &&
                faceLandmarker &&
                videoRef.current.currentTime !== lastVideoTime.current &&
                videoRef.current.videoWidth > 0 &&
                videoRef.current.videoHeight > 0
            ) {
                lastVideoTime.current = videoRef.current.currentTime;
                try {
                    const startTimeMs = performance.now();
                    const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

                    // Inject video dimensions for Aspect Ratio correction in Avatar
                    (results as any).videoWidth = videoRef.current.videoWidth;
                    (results as any).videoHeight = videoRef.current.videoHeight;
                    (results as any).facingMode = facingMode;

                    // Log every 100 frames (~3s) to avoid spam but confirm life
                    lastLog++;
                    if (lastLog % 100 === 0) {
                        console.log(`Detecting... Faces found: ${results.faceBlendshapes.length}`);
                    }

                    // Always send results, even if empty, so the Avatar knows to hide.
                    onResult(results);
                } catch (e) {
                    console.error("Detection error:", e);
                }
            }
            requestRef.current = requestAnimationFrame(loop);
        };
        loop();
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [onResult, facingMode]);

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
                    objectFit: "contain", // Show full sensor (un-zoomed)
                    opacity: 1,
                    pointerEvents: 'none',
                    zIndex: -1,
                    // Mirror if user facing
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
                playsInline
                muted
                autoPlay
            />

            {/* Camera UI Layer */}
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
                {/* GALLERY BUTTON (Left) */}
                <button
                    onClick={() => console.log('Open Gallery')}
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
                    {/* Placeholder Icon: Simple Image Stack */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </button>

                {/* RECORD BUTTON (Center) */}
                <button
                    onClick={() => setIsRecording(!isRecording)}
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
                        borderRadius: isRecording ? '8px' : '50%', // Square when recording
                        background: '#FF3B30',
                        transition: 'all 0.2s ease'
                    }} />
                </button>

                {/* SWITCH CAMERA BUTTON (Right) */}
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
