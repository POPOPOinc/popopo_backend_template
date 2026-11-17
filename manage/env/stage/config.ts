export const config = {
  env: "stage",
  apiUrl: "https://api.stage.example.com",
  firebase: {
    apiKey: "YOUR_FIREBASE_WEB_API_KEY",
    authDomain: "your-project-stage.firebaseapp.com",
    projectId: "your-project-stage",
    storageBucket: "your-project-stage.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "YOUR_FIREBASE_APP_ID",
  },
  tenantId: "YOUR_OPS_TENANT_ID" as string | undefined,
}
