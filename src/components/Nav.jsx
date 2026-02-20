import React from "react";

export default function Nav({ page, setPage, user, logout }) {
  return (
    <nav style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
      <button onClick={() => setPage("home")} className="login-btn">Home</button>
      <button onClick={() => setPage("board")} className="login-btn">Board</button>
      <button onClick={() => setPage("about")} className="login-btn">About</button>
      {user ? (
        <button onClick={logout} className="logout-btn">Sign Out</button>
      ) : null}
    </nav>
  );
}
