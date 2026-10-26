import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zel.signals",
  appName: "Zel Signals",
  webDir: "apk-web/dist",
  android: {
    backgroundColor: "#05070d",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  server: {
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
