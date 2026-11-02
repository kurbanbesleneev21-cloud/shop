import { route, ok } from "@/lib/api";

export const GET = route({}, async (_req, { user }) => ok({ user }));
