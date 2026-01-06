# Running the iOS App

The iOS project has been generated in the `ios/` folder.

## Prerequisites
- macOS with Xcode installed.

## Steps to Run
1. **Open the Project**:
   ```bash
   open ios/App/App.xcodeproj
   ```
2. **Xcode Configuration**:
   - Select your generic iOS Device or a Simulator (e.g., iPhone 16 Pro).
   - Sign in with your Apple ID if deploying to a real device.

3. **Run**:
   - Press the Play button (Run) in Xcode.
   - Accept the **Camera Permission** prompt.

## Features
- **Real-time Face Tracking**: The avatar mimics your facial expressions (blink, mouth open, head rotation).
- **Switch Camera**: Tap the button in the top-right to toggle Front/Back cameras.
- **Offline Capable**: The app loads tracking models locally (after initial cache).

## Updating the Web App
If you make changes to the React code:
1. `npm run build`
2. `npx cap sync`
3. Re-run in Xcode.
