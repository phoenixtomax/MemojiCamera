# Memoji Camera Walkthrough

The application is now running. Follow these steps to verify functionality.

## 1. Launch & Permissions
- Open the local URL (e.g., [http://localhost:5176/](http://localhost:5176/)).
- **Allow Camera Access**: The browser will ask for webcam permission. Click "Allow".

## 2. Face Tracking Verification
- You should see a **Video Feed** in the top-left corner (semi-transparent for debugging).
- You should see a **3D Avatar** (Yellow Box Head) in the center.
- **Initialization**: It may take a few seconds for the AI model to load. Watch the console (F12) for "FaceLandmarker created" or errors if nothing happens.

## 3. Interaction Test
Test the following movements to see if the Avatar mimics you:
- **Head Rotation**: Turn your head left/right, up/down. The avatar should rotate.
- **Blinking**: Blink your eyes. The avatar's eyes (white/teal spheres) should squash vertically.
- **Mouth**: Open your mouth. The avatar's mouth (red capsule) should stretch/open.
- **Smile**: Smile. The mouth should widen.


## 4. AR Face Mask Mode
The app now operates in **AR Mode**:
- **Mirroring**: The camera feed mimics a mirror (Selfie mode).
- **Masking**: The 3D Avatar overlays your face directly.
- **Auto-Size**: The Avatar automatically resizes to match your face distance.
- **Hide on Loss**: If you cover your face or look away, the Avatar disappears alongside the detection.

## Troubleshooting
- **No Avatar Motion**: Ensure your face is well-lit and clearly visible in the video feed.
- **Error in Console**: If you see WASM or GPU errors, the device might not support the requested WebGL/WASM features.
