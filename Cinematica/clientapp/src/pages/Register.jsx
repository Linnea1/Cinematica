import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/register", {
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
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <label>
          Username
          <input name="username" required />
        </label>
        <label>
          Email
          <input name="email" type="email" />
        </label>
        <label>
          Display name
          <input name="displayName" />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <div style={{ marginTop: 12 }}>
          <button type="submit">Register</button>
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
