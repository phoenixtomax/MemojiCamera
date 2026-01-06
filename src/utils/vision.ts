import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export let faceLandmarker: any = null;

export async function createFaceLandmarker() {
    // Use CDN for the WASM loader to avoid local protocol issues
    const wasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";
    const modelPath = window.location.origin + "/models/face_landmarker.task";

    console.log(`Initializing MediaPipe. WASM (CDN): ${wasmUrl}, Model (Local): ${modelPath}`);

    // Verify local model exists
    try {
        const checkModel = await fetch(modelPath);
        if (!checkModel.ok) throw new Error(`Model 404: ${checkModel.statusText}`);
        console.log("Model verified locally.");
    } catch (e) {
        console.error("Model check failed:", e);
        throw e;
    }

    const filesetResolver = await FilesetResolver.forVisionTasks(wasmUrl);
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: modelPath,
            delegate: "CPU" // Fallback to CPU to avoid GPU crashes on some iOS devices/sims
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1
    });
    console.log("FaceLandmarker initialized successfully (CPU)");
    return faceLandmarker;
}
