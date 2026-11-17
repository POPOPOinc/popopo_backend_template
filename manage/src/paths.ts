import { UserId } from "schema"

export class Paths {
  public static readonly top = {
    path: "/",
  }

  public static readonly users = {
    path: "/users",

    user: {
      path: "/users/:userId",
      getPath: (id: UserId) => `/users/${id}`,
    },
  }

  public static readonly posts = {
    path: "/posts",
  }

  public static readonly adminOperations = {
    path: "/admin-operations",
  }
}
