import type { AdminId, AdminOperationId, PostId, TaskId, UserId } from "./id"

/**
 * Firestore のコレクションとドキュメントのパスを一元管理する。
 * コレクション名は kebab-case（schema/firestore-kebab-case）、
 * getDocPath を持つパスは document/src/documents.ts への登録が必須（document/check-firestore-paths-coverage）。
 */
export const FirestorePaths = {
  Users: {
    path: "users",
    getDocPath: (userId: UserId): string => `${FirestorePaths.Users.path}/${userId}`,
    Preferences: {
      path: "settings",
      getDocPath: (userId: UserId): string => `${FirestorePaths.Users.getDocPath(userId)}/${FirestorePaths.Users.Preferences.path}/preferences`,
    },
  },
  Posts: {
    path: "posts",
    getDocPath: (postId: PostId): string => `${FirestorePaths.Posts.path}/${postId}`,
  },
  AppConfigs: {
    path: "app-configs",
    getDocPath: (configId: string): string => `${FirestorePaths.AppConfigs.path}/${configId}`,
  },
  Migrations: {
    path: "migrations",
    getDocPath: (name: string): string => `${FirestorePaths.Migrations.path}/${name}`,
  },
  Admins: {
    path: "admins",
    getDocPath: (adminId: AdminId): string => `${FirestorePaths.Admins.path}/${adminId}`,
  },
  AdminOperations: {
    path: "admin-operations",
    getDocPath: (operationId: AdminOperationId): string => `${FirestorePaths.AdminOperations.path}/${operationId}`,
  },
  Tasks: {
    path: "tasks",
    getDocPath: (taskId: TaskId): string => `${FirestorePaths.Tasks.path}/${taskId}`,
  },
} as const
