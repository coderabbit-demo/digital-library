import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { isUniqueViolation } from "@/db/errors";
import { findPreferences, updateUserProfile, upsertPreferences } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateProfileUpdate } from "@/lib/api/validation";
import { emptyPreferences } from "@/lib/preferences";
import type { ApiError, ProfileResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse<ProfileResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const preferences = (await findPreferences(getDb(), user.id)) ?? emptyPreferences();
  return NextResponse.json({ user, preferences });
}

export async function PUT(request: Request): Promise<NextResponse<ProfileResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateProfileUpdate(body);
  if (!input) return badRequest("Name and email are required.");

  try {
    // Persist the profile and preferences atomically.
    const result = await getDb().transaction(async (tx) => {
      const updated = await updateUserProfile(tx, user.id, {
        name: input.name,
        email: input.email,
        bio: input.bio,
      });
      if (!updated) return null;
      const preferences = await upsertPreferences(tx, user.id, input.preferences);
      return { user: updated, preferences };
    });
    if (!result) return apiError(404, "User not found.");
    return NextResponse.json(result);
  } catch (error) {
    if (isUniqueViolation(error)) return apiError(409, "That email is already registered.");
    return serverError();
  }
}
