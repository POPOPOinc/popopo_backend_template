import { AlgoliaAccessLike } from "lib-server/algolia-access"
import { TaskKind, UserDocument, UserId, UserStatus } from "schema"
import type { RegisterUserRequest, UpdateUserRequest } from "schema/api/app/types"
import { FirestoreAccess } from "../access/firestore-access"
import { ErrorResponse, OKResponseValue, Responses, SuccessOKResponse } from "../interfaces/response"
import { UpdateUserProfileService } from "../service/user/update-user-profile-service"

export class UserUseCase {

  private readonly updateUserProfileService: UpdateUserProfileService

  constructor(
    private readonly firestoreAccess: FirestoreAccess,
    private readonly algoliaAccess: AlgoliaAccessLike,
  ) {
    this.updateUserProfileService = new UpdateUserProfileService(firestoreAccess)
  }

  async getUser(userId: UserId): Promise<UserDocument | null> {
    return this.firestoreAccess.user.getUserById(null, userId)
  }

  async registerUser(userId: UserId, request: RegisterUserRequest, now: number = Date.now()): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    return await this.firestoreAccess.runTransaction(async tx => {
      const current = await this.firestoreAccess.user.getUserById(tx, userId)
      if (current) {
        return Responses.errorConflict("既に登録されています。")
      }
      this.firestoreAccess.user.createUser(tx, { id: userId, display_name: request.display_name, status: "active", created_at: now, updated_at: now })
      this.firestoreAccess.task.createTask(tx, { kind: TaskKind.syncUserToAlgolia, value: userId }, new Date(now))
      return Responses.successOK(OKResponseValue)
    })
  }

  async updateUser(user: UserDocument, request: UpdateUserRequest, now: number = Date.now()): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    await this.firestoreAccess.runTransaction(async tx => {
      this.updateUserProfileService.updateDisplayName(tx, user.id, request.display_name, now)
    })
    return Responses.successOK(OKResponseValue)
  }

  async updateStatusForDebug(user: UserDocument, status: UserStatus, now: number = Date.now()): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    await this.firestoreAccess.runTransaction(async tx => {
      this.firestoreAccess.user.updateStatus(tx, user.id, status, now)
    })
    return Responses.successOK(OKResponseValue)
  }

  /** daemon（consume-sync-user-to-algolia-task）から呼ばれ、Firestore の最新状態を Algolia に反映する */
  async syncUserToAlgolia(userId: UserId): Promise<void> {
    const user = await this.firestoreAccess.user.getUserById(null, userId)
    if (user) {
      await this.algoliaAccess.saveUsers([user])
    } else {
      await this.algoliaAccess.deleteUsers([userId])
    }
  }

}
