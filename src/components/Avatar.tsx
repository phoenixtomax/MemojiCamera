import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Avatar({ faceDataRef }: { faceDataRef: any }) {
    const headRef = useRef<THREE.Group>(null);
    const leftEyeRef = useRef<THREE.Group>(null);
    const rightEyeRef = useRef<THREE.Group>(null);
    const mouthRef = useRef<THREE.Group>(null);

    useFrame(() => {
        const data = faceDataRef.current;
        if (!data || !data.faceBlendshapes || data.faceBlendshapes.length === 0) return;

        // 1. Rotation
        // MediaPipe facialTransformationMatrixes: [matrix4x4]
        // Note: The matrix maps the canonical face mesh to the camera frame.
        // We can extract rotation.
        if (data.facialTransformationMatrixes && data.facialTransformationMatrixes.length > 0) {
            const matrixFn = data.facialTransformationMatrixes[0].data;
            const mat4 = new THREE.Matrix4().fromArray(matrixFn);

            // MediaPipe coordinates are different. 
            // We usually just need rotation.
            const rotation = new THREE.Euler().setFromRotationMatrix(mat4);

            // Apply rotation to head.
            // Note: Sensitivity/Axes might need adjustment.
            // Usually: 
            // MP X is Right, Y is Down, Z is Forward (camera).
            // ThreeJS X is Right, Y is Up, Z is Backward (towards camera).
            // So Y and Z might be inverted.

            if (headRef.current) {
                // Empirical adjustment
                // Pitch (X), Yaw (Y), Roll (Z)
                // We might need to clamp or scale.
                // Let's try direct application first, but likely needs inverting X and Y logic.
                // Actually, let's just use Scale to mirror if needed.

                // Let's try a damping approach or just direct set
                headRef.current.rotation.set(rotation.x, -rotation.y, -rotation.z);
            }
        }

        // 2. Blendshapes
        const blendshapes = data.faceBlendshapes[0].categories;
        const getScore = (name: string) => blendshapes.find((b: any) => b.categoryName === name)?.score || 0;

        const blinkLeft = getScore('eyeBlinkLeft');
        const blinkRight = getScore('eyeBlinkRight');
        const jawOpen = getScore('jawOpen');
        const smileLeft = getScore('mouthSmileLeft');
        const smileRight = getScore('mouthSmileRight');

        // Apply
        if (leftEyeRef.current) {
            // Init scaleY is 1. We scale down to 0.1 for blink.
            // Also can inverse if camera is mirrored. MediaPipe usually detects Left as Current Person's Left (Stage Right).
            leftEyeRef.current.scale.y = THREE.MathUtils.lerp(1, 0.1, blinkLeft);
        }
        if (rightEyeRef.current) {
            rightEyeRef.current.scale.y = THREE.MathUtils.lerp(1, 0.1, blinkRight);
        }

        if (mouthRef.current) {
            // Jaw open -> scale Y or position Y
            mouthRef.current.scale.y = THREE.MathUtils.lerp(1, 3, jawOpen); // make mouth taller

            // Smile -> scale X
            const smile = (smileLeft + smileRight) / 2;
            mouthRef.current.scale.x = THREE.MathUtils.lerp(1, 1.5, smile);
        }
    });

    return (
        <group ref={headRef}>
            {/* Head Shape */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[2.2, 2.8, 2]} />
                <meshStandardMaterial color="#FFD166" roughness={0.2} />
            </mesh>

            {/* Eyes Container */}
            <group position={[0, 0.3, 1.05]}>
                {/* Left Eye */}
                <group ref={leftEyeRef} position={[-0.6, 0, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.25, 32, 32]} />
                        <meshStandardMaterial color="white" />
                    </mesh>
                    <mesh position={[0, 0, 0.2]}>
                        <sphereGeometry args={[0.12, 32, 32]} />
                        <meshStandardMaterial color="#06D6A0" />
                    </mesh>
                    <mesh position={[0, 0, 0.28]}>
                        <sphereGeometry args={[0.06, 32, 32]} />
                        <meshStandardMaterial color="black" />
                    </mesh>
                </group>

                {/* Right Eye */}
                <group ref={rightEyeRef} position={[0.6, 0, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.25, 32, 32]} />
                        <meshStandardMaterial color="white" />
                    </mesh>
                    <mesh position={[0, 0, 0.2]}>
                        <sphereGeometry args={[0.12, 32, 32]} />
                        <meshStandardMaterial color="#06D6A0" />
                    </mesh>
                    <mesh position={[0, 0, 0.28]}>
                        <sphereGeometry args={[0.06, 32, 32]} />
                        <meshStandardMaterial color="black" />
                    </mesh>
                </group>
            </group>

            {/* Mouth */}
            <group ref={mouthRef} position={[0, -0.8, 1.05]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
                    <meshStandardMaterial color="#EF476F" />
                </mesh>
            </group>

            {/* Nose (static) */}
            <mesh position={[0, -0.2, 1.05]}>
                <sphereGeometry args={[0.15, 32, 32]} />
                <meshStandardMaterial color="#F78C6B" />
            </mesh>

        </group>
    )
}
