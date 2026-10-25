import { handleStart } from "../_shared/social-auth.js";

Deno.serve((request: Request) => handleStart(request, "vk"));
