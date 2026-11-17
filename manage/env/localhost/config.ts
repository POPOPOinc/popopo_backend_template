export const config = {
  env: "local",
  apiUrl: "http://localhost:3000",
  firebase: {
    apiKey: "fake-api-key",
    authDomain: "demo-template.firebaseapp.com",
    projectId: "demo-template",
    storageBucket: "demo-template.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
  },
  tenantId: "ops-local" as string | undefined,
}
