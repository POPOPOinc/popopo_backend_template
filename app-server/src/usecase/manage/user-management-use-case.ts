import { Auth } from "firebase-admin/auth"
import { logger } from "lib-server"
import { AdminOperationKind, AdminOperationTargetKind, UserId } from "schema"
import type { ManageUpdateUserRequest, UserAuthResponse } from "schema/api/manage/types"
import { FirestoreAccess } from "../../access/firestore-access"
import type { ManageRequestContext } from "../../interfaces/request-context"
import { ErrorResponse, OKResponseValue, Responses, SuccessOKResponse } from "../../interfaces/response"
import { UpdateUserProfileService } from "../../service/user/update-user-profile-service"

export class UserManagementUseCase {

  private readonly updateUserProfileService: UpdateUserProfileService

  constructor(
    private readonly firestoreAccess: FirestoreAccess,
    private readonly firebaseAuth: Auth,
  ) {
    this.updateUserProfileService = new UpdateUserProfileService(firestoreAccess)
  }

  async updateUser(args: ManageRequestContext, userId: UserId, request: ManageUpdateUserRequest, now: number = Date.now()): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    const result = await this.firestoreAccess.runTransaction(async tx => {
      const user = await this.firestoreAccess.user.getUserById(tx, userId)
      if (!user) {
        return Responses.errorNotFound("ユーザーが見つかりません。")
      }
      this.updateUserProfileService.updateDisplayName(tx, userId, request.display_name, now)
      this.firestoreAccess.user.updateStatus(tx, userId, request.status, now)
      this.firestoreAccess.adminOperation.createAdminOperation(tx, {
        kind: AdminOperationKind.updateUser,
        value: { user_id: userId, display_name: request.display_name, status: request.status },
        target: { kind: AdminOperationTargetKind.user, value: { id: user.id, display_name: user.display_name } },
        admin_user: { id: args.admin.id, email: args.admin.email },
        created_at: now,
      })
      return Responses.successOK(OKResponseValue)
    })
    if (result.status === 200) {
      logger.info("管理者がユーザー情報を更新しました", { adminId: args.admin.id, userId, status: request.status })
    }
    return result
  }

  async getUserAuth(userId: UserId): Promise<SuccessOKResponse<UserAuthResponse> | ErrorResponse> {
    try {
      const record = await this.firebaseAuth.getUser(userId)
      return Responses.successOK({
        uid: record.uid,
        email: record.email,
        disabled: record.disabled,
        provider_ids: record.providerData.map(x => x.providerId),
        created_at: record.metadata.creationTime,
        last_sign_in_at: record.metadata.lastSignInTime,
      })
    } catch (cause) {
      logger.info("Firebase Auth のユーザー取得に失敗しました", { userId, cause: String(cause) })
      return Responses.errorNotFound("Firebase Auth のアカウントが見つかりません。")
    }
  }

}
