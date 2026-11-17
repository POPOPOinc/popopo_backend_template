export const config = {
  env: "dev",
  apiUrl: "https://api.dev.example.com",
  firebase: {
    apiKey: "YOUR_FIREBASE_WEB_API_KEY",
    authDomain: "your-project-dev.firebaseapp.com",
    projectId: "your-project-dev",
    storageBucket: "your-project-dev.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "YOUR_FIREBASE_APP_ID",
  },
  tenantId: "YOUR_OPS_TENANT_ID" as string | undefined,
}
