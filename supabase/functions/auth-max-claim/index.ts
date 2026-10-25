import { handleMaxClaim } from "../_shared/social-auth.js";

Deno.serve((request: Request) => handleMaxClaim(request));
