export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      full_name: string;
      role: string;
      role_id: number;
      /** The role's effective permission keys, as the server resolved them. */
      permissions?: string[] | null;
      /** The section this role lands on after signing in. */
      home?: string | null;
      organization?: {
        id: number;
        name: string;
      };
    };
    token: string;
  };
}

export interface ForgotPasswordResponse {
  status: string;
  message: string;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  role_id: number;
  /**
   * The role's effective permission keys, resolved server side — see
   * ATSS2_0/backend/app/Support/Permissions.php. Kept in authData so the stored
   * shape stays identical to the one the full mobile app writes.
   */
  permissions?: string[] | null;
  /** The section this role lands on after signing in. */
  home?: string | null;
  organization?: {
    id: number;
    name: string;
  };
}
