import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/login", {
        method: "POST",
        body: form,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const contentType = res.headers.get("content-type") || "";

      // JSON response from backend (SPA flow)
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (res.ok && json.success) {
          // navigate client-side without full reload
          navigate(json.redirect || "/");
          return;
        }

        setMsg(json.message || json.error || "Login failed");
        return;
      }

      // Fallback: server returned HTML (should not happen now)
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const text = await res.text();
      setMsg(text);
    } catch (err) {
      console.error(err);
      setMsg("Network error");
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Sign in</h2>
      <form onSubmit={onSubmit}>
        <label>
          Username
          <input name="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <div style={{ marginTop: 12 }}>
          <button type="submit">Sign in</button>
        </div>
      </form>
      {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
