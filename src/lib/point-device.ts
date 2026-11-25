import { z } from "zod";
import { deviceSecretSchema } from "./locker-enrollment";

export const POINT_DEVICE_KEY = "pasallave.point.device";
export const POINT_ENROLLMENT_KEY = "pasallave.point.enrollment";
export const pointEnrollmentSchema = z.object({
  deviceSecret: deviceSecretSchema,
  enrollmentId: z.string().uuid(),
  claimCode: z.string().regex(/^PT-[A-Z]{3}-[0-9]{3}$/),
  expiresAt: z.string().datetime(),
});
export type PointEnrollment = z.infer<typeof pointEnrollmentSchema>;
export type PointInfo = {
  id: string;
  name: string;
  address: string | null;
  is24h: boolean;
  schedule: unknown;
  positions: number;
};

export function isRevokedDevice(error: unknown) {
  return error instanceof Error && /API key inválida o revocada|Falta la API key/.test(error.message);
}