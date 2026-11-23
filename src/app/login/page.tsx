"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/journals");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
      <div className="card">
        <h2>Sign in</h2>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Seeded demo accounts (change the passwords before real use):
          <br />
          admin@example.com / maker@example.com / checker@example.com — all ChangeMe123!
        </p>
      </div>
    </div>
  );
}
