import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { z } from "zod"
import { apiClient } from "../api-client"
import { APIError } from "../errors"
import type { UserProfileResponse } from "../generated/types.gen"
import {
  apiResponseUserProfileResponseSchema,
  userProfileResponseSchema,
} from "../generated/zod.gen"

export type { UserProfileResponse }
export type RiskTolerance = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE"

export const PROFILE_QUERY_KEY = ["profile"] as const

// The generator emits .optional() for the nullable riskTolerance enum, which
// rejects the `null` Jackson serialises for an unset value. Extend it to accept
// null too. (Nullable string fields are already generated as .nullish().)
const profileResponseSchema = apiResponseUserProfileResponseSchema.extend({
  data: userProfileResponseSchema
    .extend({
      riskTolerance: z
        .enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"])
        .nullish(),
    })
    .optional(),
})

export function useProfile() {
  return useSuspenseQuery<UserProfileResponse>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const { data: raw } = await apiClient.GET("/api/v1/profile", { signal })
      const envelope = profileResponseSchema.parse(raw)
      if (!envelope.data)
        throw new APIError({
          code: "parse",
          message: "profile: missing data in response",
        })
      return envelope.data as UserProfileResponse
    },
  })
}

export function useUpdateRiskTolerance() {
  const queryClient = useQueryClient()
  return useMutation<UserProfileResponse, APIError, RiskTolerance>({
    mutationFn: async (riskTolerance) => {
      const { data: raw } = await apiClient.PUT("/api/v1/profile", {
        body: { riskTolerance },
      })
      const envelope = profileResponseSchema.parse(raw)
      if (!envelope.data)
        throw new APIError({
          code: "parse",
          message: "profile update: missing data in response",
        })
      return envelope.data as UserProfileResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
    },
  })
}
