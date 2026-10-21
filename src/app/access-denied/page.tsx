import { requireAuthenticatedUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export default async function AccessDeniedPage() {
  const auth = await requireAuthenticatedUser();
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        background: "#f6f8fb",
        color: "#172b3a",
      }}
    >
      <section
        style={{
          maxWidth: 480,
          padding: 36,
          borderRadius: 16,
          background: "white",
          textAlign: "center",
          border: "1px solid #e8edf2",
        }}
      >
        <h1>Access not configured</h1>
        <p>
          Hello {auth.user.firstName}, your ViLek account is authenticated but does not have an
          active application role assigned. Please contact your administrator.
        </p>
        <form action="/api/auth/logout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
