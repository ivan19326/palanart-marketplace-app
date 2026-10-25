import { handleCallback } from "../_shared/social-auth.js";

Deno.serve((request: Request) => handleCallback(request, "vk"));
