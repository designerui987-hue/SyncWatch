import { z } from "zod";

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")).optional(),
  provider: z.enum(["youtube", "html5"]).optional(),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
