export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  id?: string;
  redirectTo?: string;
  nonce?: number;
};

export const initialState: ActionState = { ok: false };
