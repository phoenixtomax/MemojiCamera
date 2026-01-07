import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Verified Working Sample (MediaPipe Raccoon Head - Head Only, 52 Blendshapes)
// This is the official sample model for testing MediaPipe blendshapes.
const AVATAR_URL = "https://storage.googleapis.com/mediapipe-tasks/face_landmarker/raccoon_head.glb";

export function Avatar({ faceDataRef }: { faceDataRef: any }) {
    const { scene } = useGLTF(AVATAR_URL);
    const headGroupRef = useRef<THREE.Group>(null);
    const { viewport } = useThree();

    // Cache the meshes that have morph targets for performance
    const morphMeshes = useRef<THREE.Mesh[]>([]);

    // Cache the initial width of the model (unscaled) to avoid feedback loops
    const initialModelWidth = useRef<number>(0);

    useEffect(() => {
        if (scene) {
            // Traverse to find meshes with morph targets
            const meshes: THREE.Mesh[] = [];
            scene.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (mesh.isMesh && mesh.morphTargetDictionary) {
                    meshes.push(mesh);
                }
            });
            morphMeshes.current = meshes;

            // Measure Initial Width ONCE (when scale is default 1,1,1)
            const box = new THREE.Box3().setFromObject(scene);
            const width = box.max.x - box.min.x;
            if (width > 0) {
                initialModelWidth.current = width;
            }
        }
    }, [scene]);

    useFrame(() => {
        const data = faceDataRef.current;
        const hasFace = data && data.faceBlendshapes && data.faceBlendshapes.length > 0;

        if (headGroupRef.current) {
            headGroupRef.current.visible = !!hasFace;
        }

        if (!hasFace) return;

        // -------------------------------------------------------------
        // 1. POSITION, ROTATION & SCALE
        // -------------------------------------------------------------
        if (data.faceLandmarks && data.faceLandmarks.length > 0) {
            const landmarks = data.faceLandmarks[0];
            const nose = landmarks[1];
            const leftCheek = landmarks[454];
            const rightCheek = landmarks[234];

            // Video Dimensions
            const vW = data.videoWidth || 640;
            const vH = data.videoHeight || 480;
            const videoAspect = vW / vH;
            const screenAspect = viewport.width / viewport.height;

            // "Contain" Logic
            let renderW, renderH;
            if (screenAspect > videoAspect) {
                renderH = viewport.height;
                renderW = renderH * videoAspect;
            } else {
                renderW = viewport.width;
                renderH = renderW / videoAspect;
            }

            const isMirrored = data.facingMode === 'user';

            // Position Logic
            const xOffset = -(nose.x - 0.5) * renderW;
            const xPos = isMirrored ? xOffset : -xOffset;
            const yPos = -(nose.y - 0.5) * renderH;

            if (headGroupRef.current) {
                // Smooth Position
                const currentPos = headGroupRef.current.position;
                headGroupRef.current.position.set(
                    THREE.MathUtils.lerp(currentPos.x, xPos, 0.5),
                    THREE.MathUtils.lerp(currentPos.y, yPos, 0.5),
                    0
                );

                // Scale Logic
                const faceWidthNorm = Math.abs(leftCheek.x - rightCheek.x);
                const faceWidthUnits = faceWidthNorm * renderW;

                // We want: ModelVisualWidth = FaceRealWidth
                // ModelVisualWidth = ModelWidth * Scale
                // So: Scale = FaceRealWidth / ModelWidth
                // We add a 15% padding (1.15) so it acts as a mask covering the edges.
                // Use Cached Initial Width
                if (initialModelWidth.current > 0) {
                    const targetScale = (faceWidthUnits / initialModelWidth.current) * 1.15;

                    // Smooth Scale to prevent jitter
                    const currentScale = headGroupRef.current.scale.x;
                    const smoothScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.3);

                    headGroupRef.current.scale.set(smoothScale, smoothScale, smoothScale);
                }
            }
        }

        // Rotation (Matrix)
        if (data.facialTransformationMatrixes && data.facialTransformationMatrixes.length > 0) {
            const matrixFn = data.facialTransformationMatrixes[0].data;
            const mat4 = new THREE.Matrix4().fromArray(matrixFn);
            const rotation = new THREE.Euler().setFromRotationMatrix(mat4, 'ZYX');

            if (headGroupRef.current) {
                // AR Fix: Negative Z for mirror tilt correction.
                headGroupRef.current.rotation.set(rotation.x, -rotation.y, -rotation.z);
            }
        }

        // -------------------------------------------------------------
        // 2. BLENDSHAPES (52 Coefficients)
        // -------------------------------------------------------------
        if (data.faceBlendshapes && data.faceBlendshapes.length > 0) {
            const blendshapes = data.faceBlendshapes[0].categories;

            morphMeshes.current.forEach(mesh => {
                if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

                blendshapes.forEach((metric: any) => {
                    // Map standard ARKit names
                    const index = mesh.morphTargetDictionary![metric.categoryName];
                    if (index !== undefined) {
                        mesh.morphTargetInfluences![index] = metric.score;
                    }
                });
            });
        }
    });

    return (
        <group ref={headGroupRef}>
            <primitive
                object={scene}
                position={[0, 0, 0]}
            />
        </group>
    )
}

// Preload to avoid pop-in
useGLTF.preload(AVATAR_URL);
