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

## Verification
- **Existence**: Check if `ios/App/App.xcodeproj` exists.
- **Compilation**: User needs to open Xcode to build/run, but I can verifying the `npx cap sync` success.
