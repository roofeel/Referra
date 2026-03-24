import { usersController } from "../controllers/index.js";

export const usersRoutes = {
  "/api/users": {
    GET: usersController.list,
    POST: usersController.create,
  },
  "/api/users/login": {
    POST: usersController.login,
  },
  "/api/users/google-login": {
    POST: usersController.googleLogin,
  },
  "/api/users/:id": {
    GET: usersController.getById,
  }
};
