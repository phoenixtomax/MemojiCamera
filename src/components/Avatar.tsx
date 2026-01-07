import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function Avatar({ faceDataRef }: { faceDataRef: any }) {
    const headRef = useRef<THREE.Group>(null);
    const leftEyeRef = useRef<THREE.Group>(null);
    const rightEyeRef = useRef<THREE.Group>(null);
    const mouthRef = useRef<THREE.Group>(null);

    const { viewport } = useThree();

    useFrame(() => {
        const data = faceDataRef.current;
        // Hide if no face data
        const hasFace = data && data.faceBlendshapes && data.faceBlendshapes.length > 0;

        if (headRef.current) {
            headRef.current.visible = !!hasFace;
        }

        if (!hasFace) return;

        if (data.faceLandmarks && data.faceLandmarks.length > 0) {
            const landmarks = data.faceLandmarks[0];
            const nose = landmarks[1];
            // Cheek to Cheek for width scaling (Idx 454: Left, 234: Right)
            const leftCheek = landmarks[454];
            const rightCheek = landmarks[234];

            // Video Dimensions from CameraManager
            const vW = data.videoWidth || 640;
            const vH = data.videoHeight || 480;
            const videoAspect = vW / vH;
            const screenAspect = viewport.width / viewport.height;

            // "Contain" Logic:
            // The video fits inside the viewport, preserving aspect ratio.
            // There will remain empty space (black bars) either vertically or horizontally.
            let renderW, renderH;
            if (screenAspect > videoAspect) {
                // Screen is wider than video (Pillarbox: Black bars left/right)
                renderH = viewport.height;
                renderW = renderH * videoAspect;
            } else {
                // Screen is tall/narrower than video (Letterbox: Black bars top/bottom)
                renderW = viewport.width;
                renderH = renderW / videoAspect;
            }

            // Mirror logic
            const isMirrored = data.facingMode === 'user';

            // 1. Position
            // Normalized (0..1) -> Rendered Viewport Units
            // For X: 0 is left of VIDEO, 1 is right of VIDEO.
            // But Video is centered in Viewport.
            // Offset from viewport center:
            // logic: If nose is at 0.2 (Sensor Left), xOffset becomes -(0.2-0.5) = +0.3 (Right).
            // This 'xOffset' effectively corrects the optical inversion of the lens.
            const xOffset = -(nose.x - 0.5) * renderW;

            // Mirroring:
            // xOffset logic maps Raw Coordinates to Screen Space.
            // Raw Left (0.2) -> xOffset (+0.3 Right).
            // Raw Right (0.8) -> xOffset (-0.3 Left).
            // Since Camera acts as a Mirror:
            // User moves Left -> Raw sees Right -> xOffset is Left.
            // Screen shows Mirror (Left).
            // So xOffset matches the Screen.
            const xPos = isMirrored ? xOffset : -xOffset;
            const yPos = -(nose.y - 0.5) * renderH;

            if (headRef.current) {
                headRef.current.position.set(xPos, yPos, 0);

                // 2. Scale
                // Measure face width in Normalized units
                // Distance between cheekbones is a good proxy for head width
                const faceWidthNorm = Math.abs(leftCheek.x - rightCheek.x);

                // Convert to Viewport Units
                const faceWidthUnits = faceWidthNorm * renderW;

                // Head Mesh Width is approx 2.2 units (Box args)
                // Scale = Desired / Actual
                // We add a slight multiplier (1.05) to ensure it covers the edges
                const targetScale = (faceWidthUnits / 2.2) * 1.25;

                headRef.current.scale.set(targetScale, targetScale, targetScale);
            }
        }

        // Use Matrix for Rotation & Scale
        if (data.facialTransformationMatrixes && data.facialTransformationMatrixes.length > 0) {
            const matrixFn = data.facialTransformationMatrixes[0].data;
            const mat4 = new THREE.Matrix4().fromArray(matrixFn);

            // Decompose matrix
            // Use ZYX order to decouple Roll (Z) from Yaw/Pitch to avoid Gimbal lock issues affecting tilt direction.
            const rotation = new THREE.Euler().setFromRotationMatrix(mat4, 'ZYX');
            // const position = new THREE.Vector3().setFromMatrixPosition(mat4); // Position now handled by landmarks
            // const scale = new THREE.Vector3().setFromMatrixScale(mat4);

            if (headRef.current) {

                // Position Fix:
                // If it's not following tightly, we might need a larger scale factor to cover the screen distance.
                // Or we need to center it better.
                // Let's increase scaleFactor slightly to make it move MORE with the head.
                // const positionScale = 0.12; // Position now handled by landmarks
                // headRef.current.position.set(
                //     -position.x * positionScale,
                //     -position.y * positionScale,
                //     -position.z * positionScale
                // );

                // Rotation Fix:
                // User reported Left Tilt resulted in Right Tilt (with -z).
                // Wait, user just said "Face tilts one way, avatar tilts OTHER".
                // In line 123 of current file (Step 708), it shows: rotation.z (positive)
                // This means Step 634/640 (which set it to positive) was indeed wrong for the user's specific case?
                // Wait, Step 634 output says: "We need to NEGATE Z" -> but the code snippet showed `-rotation.z`.
                // Let's look closely at Step 708 line 123:
                // "headRef.current.rotation.set(rotation.x, -rotation.y, rotation.z);"
                // It is POSITIVE. The comment above (lines 101+) discusses ZYX order.
                // So currently it is POSITIVE Z.
                // User says: "Face tilts one way, Avatar tilts OTHER". This implies INVERSION.
                // So I need to NEGATE it to `-rotation.z` to fix it.
                headRef.current.rotation.set(rotation.x, -rotation.y, -rotation.z);

                // Scale -> Handled by landmarks above
                // headRef.current.scale.set(scale.x * 0.6, scale.y * 0.6, scale.z * 0.6);
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
