# iOS Project Generation Plan

## Goal Description
Generate a native iOS project from the existing React web application so the user can run it on an iPhone/Simulator.

## Proposed Changes

### Tech Stack
- **Tooling**: Capacitor (standard for modern web-to-native wrapping)

### Steps
1. **Install Dependencies**:
   - `@capacitor/core`
   - `@capacitor/cli`
   - `@capacitor/ios`
2. **Configuration**:
   - Initialize Capacitor (`npx cap init`).
   - update `capacitor.config.ts` if needed (webDir: 'dist').
3. **Build**:
   - Run `npm run build` to generate the static site.
4. **Platform**:
   - Run `npx cap add ios`.
   - Run `npx cap sync`.
5. **Output**:
   - A generic `ios/` directory will be created containing the Xcode project.

- **Compilation**: User needs to open Xcode to build/run, but I can verifying the `npx cap sync` success.

# AR Face Overlay Implementation

## Goal
Overlay the 3D Avatar on the user's face in the camera feed, acting as a mask while retaining expression tracking.

## Implemented Changes
### `src/components/CameraManager.tsx`
- **Video Style**: Full-screen, `object-fit: contain` (to avoid zoom/crop issues), `z-index: -1`.
- **Mirroring**: Added CSS transform `scaleX(-1)` for user-facing camera to simulate a mirror.
- **UI Layout**: Implemented Bottom Bar Layout:
    - **Bottom-Left**: Gallery Button (Opens System Image Picker).
    - **Bottom-Center**: Record/Shutter Button (Visual State Toggle).
    - **Bottom-Right**: Switch Camera Button (Toggles Facing Mode).
- **Recorded Video**:
    - **Composite**: Draws `<video>` frame + WebGL Canvas to a hidden `compositorCanvas`.
    - **Capture**: Uses `MediaRecorder` on composite stream (30fps).
    - **Saving**:
        - Writes Blob to Capacitor Filesystem.
        - Tries `Media.saveVideo`.
        - **Fallback**: If direct save fails, opens system **Share Sheet** (`@capacitor/share`).
- **Permissions**:
    - Added `NSPhotoLibraryAddUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSMicrophoneUsageDescription`.
- **Assets**:
    - Localized `raccoon_head.glb` to `public/models/` for offline support.

### `src/components/Avatar.tsx`
- **Positioning**: moved from Matrix-based to **Landmark-based** (using Nose Tip index 1).
    - Maps 2D landmarks to 3D Viewport coordinates with Aspect Ratio correction.
    - Handles "Contain" letterboxing/pillarboxing.
- **Model**: Switched to **MediaPipe Raccoon Head** (official sample, head-only, 52 blendshapes).
- **Scaling**: **Dynamic Auto-Calibration**:
    - Calculates Unscaled Model Width once on load.
    - Updates per-frame: `TargetScale = (FaceWidthInPixels / ModelUnitWidth) * 1.15`.
    - Includes **Lerp Smoothing** (0.3 factor) to prevent flickering/jitter.
- **Rotation**: Uses MediaPipe Matrix, but with **ZYX Euler Order** and inverted logic (flipped Z) to match the mirrored self-view.
- **Visibility**: Avatar hides (`visible = false`) when no faces are detected.

## Verification
- **Visual**: Avatar acts as a perfect mask over the face.
- **Tracking**:
    - **Tilt**: Tilting head Left tilts Avatar Left (Mirror behavior).
    - **Pan**: Moving Head Left moves Avatar Left (Mirror behavior).
    - **Scale**: Moving closer/further scales the Avatar smoothly.
