export interface JwtPayload {
  sub: string;
  email: string;
  sid: string;
  permissions: string[];
}
