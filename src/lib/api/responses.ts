/**
 * Standardized API responses (DL-26). Consistent typed JSON error envelopes and
 * status codes across every Route Handler.
 */
import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";

export function apiError(status: number, message: string): NextResponse<ApiError> {
  return NextResponse.json({ status, message }, { status });
}

export function unauthorized(): NextResponse<ApiError> {
  return apiError(401, "Authentication required.");
}

export function badRequest(message: string): NextResponse<ApiError> {
  return apiError(400, message);
}
