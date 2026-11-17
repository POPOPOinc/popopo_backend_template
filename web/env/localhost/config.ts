/** ローカル（エミュレータ）用の設定。環境ごとに env/{mode}/config.ts を用意し、vite の --mode で切り替える */
export const config = {
  env: "local",
  apiUrl: "http://localhost:3000",
  firebase: {
    apiKey: "fake-api-key",
    authDomain: "demo-template.firebaseapp.com",
    projectId: "demo-template",
    storageBucket: "demo-template.appspot.com",
  },
}
