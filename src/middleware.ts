export { default } from "next-auth/middleware";

// Any route matched here requires a valid session; next-auth/middleware
// redirects to /login automatically otherwise. This protects the pages,
// while the API routes independently re-check the session themselves too
// (defense in depth -- never rely on middleware alone).
export const config = {
  matcher: ["/journals/:path*"],
};
