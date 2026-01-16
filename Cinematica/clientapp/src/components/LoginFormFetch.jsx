import React from "react";

export default function LoginFormFetch() {
  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

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
    document.getElementById("msg").innerHTML = text;
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Username
        <input name="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit">Sign in</button>
      <div id="msg" aria-live="polite" />
    </form>
  );
}
