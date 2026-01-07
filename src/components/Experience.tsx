import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { Avatar } from "./Avatar";
import { CameraManager } from "./CameraManager";

export function Experience() {
    const faceDataRef = useRef<any>({});
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFaceResult = (result: any) => {
        faceDataRef.current = result;
    };

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
            {/* 
                CameraManager handles video, face detection, AND recording.
                We pass the canvasRef so it can composite AR + Video.
            */}
            <CameraManager onResult={handleFaceResult} canvasRef={canvasRef} />

            <Canvas
                camera={{ position: [0, 0, 8], fov: 40 }}
                gl={{ preserveDrawingBuffer: true, alpha: true }} // Crucial for snapshot/recording
                onCreated={({ gl }) => {
                    canvasRef.current = gl.domElement;
                }}
            >
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
