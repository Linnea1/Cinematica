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
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const text = await res.text();
      setMsg(text);
    } catch (err) {
      setMsg("Network error");
      console.error(err);
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
      {msg && (
        <div
          style={{ marginTop: 12 }}
          dangerouslySetInnerHTML={{ __html: msg }}
        />
      )}
    </div>
  );
}
