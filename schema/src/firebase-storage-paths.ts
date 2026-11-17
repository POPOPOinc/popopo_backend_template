// Storage へのアップロードは 2 段階で行う。
// 1. クライアントは `tmp/users/{firebaseUid}/...-uploaded` にアップロードする（rules で本人のみ書き込み可）
// 2. サーバーが内容を検証してから正式なパスへ移動する（正式なパスはクライアントから書き込めない）
export const FirebaseStoragePaths = {
  User: {
    getIconPathUploaded: (firebaseUid: string): string =>
      `tmp/users/${firebaseUid}/icon-uploaded`,
    getIconPathValid: (userId: string): string =>
      `users/${userId}/icon`,
  },

  Post: {
    getImagePathUploaded: (firebaseUid: string): string =>
      `tmp/users/${firebaseUid}/posts/image-uploaded`,
    getImagePathValid: (postId: string): string =>
      `posts/${postId}/image`,
    getPostPrefix: (postId: string): string =>
      `posts/${postId}/`,
  },
}
