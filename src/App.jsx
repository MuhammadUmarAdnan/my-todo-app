import React, { useState } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Board from "./pages/Board";
import About from "./pages/About";
import "./App.css";

function App() {
  const [user] = useAuthState(auth);
  const [page, setPage] = useState("home");
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [newBoardName, setNewBoardName] = useState("");

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setSelectedBoardId(null);
    setPage("home");
  };

  // Boards query: list boards where user is a member (no server ordering to avoid composite-index requirements)
  const boardsQuery = user ? query(collection(db, "boards"), where("members", "array-contains", user.uid)) : null;
  const [boardsSnapshot, boardsLoading, boardsError] = useCollection(boardsQuery);
  let boards = boardsSnapshot?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
  // client-side sort newest-first by createdAt if present
  boards.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? a.createdAt : 0);
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? b.createdAt : 0);
    return tb - ta;
  });

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    // prevent duplicate board names for same owner (case-insensitive)
    const exists = boards.find(b => (b.ownerUid === user.uid) && (b.name || "").toLowerCase() === newBoardName.trim().toLowerCase());
    if (exists) {
      alert("You already have a board with that name. Choose a different name.");
      return;
    }
    try {
      const ref = await addDoc(collection(db, "boards"), {
        name: newBoardName.trim(),
        ownerUid: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp()
      });
      setNewBoardName("");
      setSelectedBoardId(ref.id);
      setPage("board");
    } catch (err) {
      console.error("Create board error:", err);
      alert("Unable to create board: " + (err.message || err));
    }
  };

  const deleteBoard = async () => {
    if (!selectedBoardId) return;
    const selected = boards.find(b => b.id === selectedBoardId);
    if (!selected) return alert("Selected board not found.");
    if (selected.ownerUid !== user.uid) return alert("Only the board owner can delete the board.");
    if (!confirm(`Delete board "${selected.name || selected.id}" and all its tasks? This cannot be undone.`)) return;

    try {
      // delete tasks belonging to the board
      const tasksQ = query(collection(db, "tasks"), where("boardId", "==", selectedBoardId));
      const snap = await getDocs(tasksQ);
      const deletions = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletions);
      // delete the board doc
      await deleteDoc(doc(db, "boards", selectedBoardId));
      setSelectedBoardId(null);
      alert("Board and its tasks deleted.");
    } catch (err) {
      console.error("Delete board error:", err);
      alert("Unable to delete board: " + (err.message || err));
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>📝 Shared Task Board</h1>

        <div style={{ marginTop: 12 }}>
          {user ? (
            <div className="user-section">
              <p>Welcome, <span className="user-name">{user.displayName}</span> <small style={{ color: '#888', marginLeft: 8 }}>({user.uid})</small></p>
            </div>
          ) : (
            <button onClick={login} className="login-btn">Sign in with Google</button>
          )}
        </div>
      </div>

      <div className="app-content">
        <Nav page={page} setPage={setPage} user={user} logout={logout} />

        {page === "home" && <Home />}

        {page === "board" && (
          <div>
            <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={selectedBoardId || ""} onChange={(e) => setSelectedBoardId(e.target.value)} style={{ padding: 8 }}>
                <option value="">-- Select a board --</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id}>{b.name || b.id}</option>
                ))}
              </select>
              {boardsLoading && <span style={{ color: '#666' }}>Loading boards...</span>}
              {boardsError && <span style={{ color: 'red' }}>Error loading boards: {boardsError.message || String(boardsError)}</span>}
              {selectedBoardId && (() => {
                const sel = boards.find(b => b.id === selectedBoardId);
                return sel && sel.ownerUid === user.uid ? (
                  <button onClick={deleteBoard} className="delete-btn" style={{ marginLeft: 8 }}>Delete Board</button>
                ) : null;
              })()}

              <form onSubmit={createBoard} style={{ display: "flex", gap: 8 }}>
                <input placeholder="New board name" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} style={{ padding: 8 }} />
                <button className="add-btn" type="submit">Create</button>
              </form>
            </div>

            {!selectedBoardId ? (
              <div className="no-tasks">Please select or create a board to manage tasks.</div>
            ) : (
              <Board user={user} boardId={selectedBoardId} />
            )}
          </div>
        )}

        {page === "about" && <About />}
      </div>
    </div>
  );
}

export default App;