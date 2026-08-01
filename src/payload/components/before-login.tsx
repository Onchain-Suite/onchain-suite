/**
 * Rendered above the /admin login form.
 *
 * The CMS has no credentials of its own — Payload's local strategy is disabled
 * (see src/payload/collections/users.ts), so the form below it cannot accept a
 * password. Without this, an admin who is not signed in lands on a login screen
 * that can never succeed and has no way to tell why.
 *
 * A link rather than an automatic redirect on purpose: a signed-in user whose
 * role is not ADMIN or SUPER_ADMIN also reaches this screen, and redirecting
 * them back to a sign-in they have already completed would loop.
 */
export function BeforeLogin() {
  return (
    <div
      style={{
        borderRadius: "4px",
        border: "1px solid var(--theme-elevation-150)",
        marginBottom: "1.5rem",
        padding: "1rem 1.25rem",
      }}
    >
      <h4 style={{ margin: "0 0 0.5rem" }}>
        Sign in with your OnchainSuite account
      </h4>
      <p style={{ margin: "0 0 0.75rem", color: "var(--theme-elevation-600)" }}>
        The blog CMS uses your existing OnchainSuite login — there is no
        separate password. Only administrators can manage blog content.
      </p>
      <a href="/auth/signin?redirectTo=/admin">Go to OnchainSuite sign in →</a>
      <p
        style={{
          margin: "0.75rem 0 0",
          fontSize: "0.85rem",
          color: "var(--theme-elevation-500)",
        }}
      >
        Already signed in and still seeing this? Your account does not have
        administrator access.
      </p>
    </div>
  );
}
