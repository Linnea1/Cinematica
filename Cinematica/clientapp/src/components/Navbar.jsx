import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    fetch("/me", { credentials: "include" })
      .then(async (res) => {
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (mounted) setUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/");
  };

  return (
    <nav>
      <div className="container">
        <div>
          <h1>Cinematica</h1>
          <Link to="/">Home</Link>
          {user && user.isAuthenticated ? (
            <>
              <Link to="/game">Play</Link>
            </>
          ) : (
            <></>
          )}
        </div>

        {user && user.isAuthenticated ? (
          <>
            <div>
              <span>Hello {user.displayName ?? user.userName}</span>
              <button onClick={logout}>Logout</button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
