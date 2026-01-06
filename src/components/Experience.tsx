import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { Avatar } from "./Avatar";
import { CameraManager } from "./CameraManager";

export function Experience() {
    const faceDataRef = useRef<any>({});

    const handleFaceResult = (result: any) => {
        // MediaPipe callbacks happen frequently (e.g. 30-60fps)
        faceDataRef.current = result;
    };

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#111" }}>
            {/* 
        CameraManager is invisible (opacity 0) or small. 
        It handles the logic of pumping video frames to MediaPipe.
      */}
            <CameraManager onResult={handleFaceResult} />

            <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
                <color attach="background" args={['#111']} />
                {/* Lighting */}
                <ambientLight intensity={1.5} />
                <directionalLight position={[10, 10, 5]} intensity={2} />
                <directionalLight position={[-10, 10, 5]} intensity={1} />

                {/* 3D Scene */}
                <Avatar faceDataRef={faceDataRef} />
            </Canvas>
        </div>
    );
}
