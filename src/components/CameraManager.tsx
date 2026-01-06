import { useEffect, useRef, useState } from "react";
import { createFaceLandmarker, faceLandmarker } from "../utils/vision";

interface CameraManagerProps {
    onResult: (result: any) => void;
}

export function CameraManager({ onResult }: CameraManagerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastVideoTime = useRef(-1);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
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
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
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

                    // Log every 100 frames (~3s) to avoid spam but confirm life
                    lastLog++;
                    if (lastLog % 100 === 0) {
                        console.log(`Detecting... Faces found: ${results.faceBlendshapes.length}`);
                    }

                    if (results.faceBlendshapes.length > 0) {
                        onResult(results);
                    }
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
    }, [onResult]);

    return (
        <>
            <video
                ref={videoRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "1px", // Keep it in DOM but tiny/invisible
                    height: "1px",
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -1
                }}
                playsInline
                muted
                autoPlay
            />
            <button
                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 2000,
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'black'
                }}
            >
                Switch Camera ({facingMode})
            </button>
        </>
    );
}
