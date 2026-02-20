import React, { useState } from "react";
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { db } from "../firebase";

export default function Board({ user, boardId }) {
  if (!user) {
    return (
      <div>
        <h2 style={{ marginBottom: 12 }}>Shared Board</h2>
        <div className="login-prompt">
          <p>Please sign in to view and manage tasks.</p>
        </div>
      </div>
    );
  }
  if (!boardId) {
    return (
      <div>
        <h2 style={{ marginBottom: 12 }}>Shared Board</h2>
        <div className="no-tasks">No board selected.</div>
      </div>
    );
  }
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");

  // load board doc to check membership/owner
  const boardRef = doc(db, "boards", boardId);
  const [boardSnap, boardLoading, boardError] = useDocument(boardRef);
  const board = boardSnap?.data();

  // tasks for this board only (no server ordering to avoid composite index requirement)
  const q = query(collection(db, "tasks"), where("boardId", "==", boardId));
  const [snapshot, loading, error] = useCollection(q);
  let tasks = snapshot?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
  // client-side sort newest-first by createdAt if present
  tasks.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? a.createdAt : 0);
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? b.createdAt : 0);
    return tb - ta;
  });

  const addTask = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!board) {
      alert("Board data not loaded yet.");
      return;
    }
    if (!board.members || !board.members.includes(user.uid)) {
      alert("You are not a member of this board.");
      return;
    }
    try {
      await addDoc(collection(db, "tasks"), {
        text: text.trim(),
        createdAt: serverTimestamp(),
        uid: user.uid,
        completed: false,
        boardId: boardId
      });
      setText("");
    } catch (err) {
      console.error("Add task error:", err);
      alert("Unable to add task: " + (err.message || err));
    }
  };

  const startEdit = (t) => { setEditing(t.id); setEditText(t.text); };
  const cancelEdit = () => { setEditing(null); setEditText(""); };

  const saveEdit = async (id) => {
    try {
      // only board members can edit; deleting/edit permissions still validated server-side
      if (!board || !board.members?.includes(user.uid)) {
        alert("You are not a member of this board.");
        return;
      }
      const ref = doc(db, "tasks", id);
      await updateDoc(ref, { text: editText });
      cancelEdit();
    } catch (err) {
      console.error("Edit error:", err);
      alert("Unable to save changes: " + (err.message || err));
    }
  };

  const toggleComplete = async (t) => {
    try {
      if (!board || !board.members?.includes(user.uid)) {
        alert("You are not a member of this board.");
        return;
      }
      const ref = doc(db, "tasks", t.id);
      await updateDoc(ref, { completed: !t.completed });
    } catch (err) {
      console.error("Toggle complete error:", err);
      alert("Unable to update task: " + (err.message || err));
    }
  };

  const remove = async (id) => {
    try {
      // only allow delete if member; server rules should enforce owner-only if desired
      if (!board || !board.members?.includes(user.uid)) {
        alert("You are not a member of this board.");
        return;
      }
      const ref = doc(db, "tasks", id);
      await deleteDoc(ref);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Unable to delete task: " + (err.message || err));
    }
  };

  // owner-only: add a member UID to the board
  const [inviteUid, setInviteUid] = useState("");
  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteUid.trim()) return;
    if (!board) return;
    if (user.uid !== board.ownerUid) {
      alert("Only the board owner can invite members.");
      return;
    }
    try {
      await updateDoc(doc(db, "boards", boardId), { members: arrayUnion(inviteUid.trim()) });
      setInviteUid("");
      alert("Member added (UID): " + inviteUid.trim());
    } catch (err) {
      console.error("Invite error:", err);
      alert("Unable to add member: " + (err.message || err));
    }
  };

  // owner-only: remove a member UID from the board
  const removeMember = async (memberUid) => {
    if (!board) return;
    if (user.uid !== board.ownerUid) return alert("Only the board owner can remove members.");
    if (memberUid === board.ownerUid) return alert("Cannot remove the owner.");
    try {
      await updateDoc(doc(db, "boards", boardId), { members: arrayRemove(memberUid) });
      alert("Member removed: " + memberUid);
    } catch (err) {
      console.error("Remove member error:", err);
      alert("Unable to remove member: " + (err.message || err));
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Shared Board</h2>
      {/* Owner invite UI */}
      {board && board.ownerUid === user.uid && (
        <div style={{ marginBottom: 12 }}>
          <form onSubmit={inviteMember} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input placeholder="Invite by UID" value={inviteUid} onChange={(e) => setInviteUid(e.target.value)} style={{ padding: 8 }} />
            <button className="add-btn" type="submit">Add Member</button>
          </form>
          <div style={{ marginBottom: 8 }}>
            <strong>Members:</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {(Array.isArray(board.members) ? board.members : []).map(m => (
                <div key={m} style={{ background: '#f1f1f1', padding: '6px 8px', borderRadius: 6 }}>
                  <span style={{ fontSize: '0.9em' }}>{m}{m === board.ownerUid ? ' (owner)' : ''}</span>
                  {m !== board.ownerUid && (
                    <button onClick={() => removeMember(m)} style={{ marginLeft: 8 }} className="delete-btn">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={addTask} className="task-form">
        <input className="task-input" placeholder="Add task..." value={text} onChange={(e) => setText(e.target.value)} />
        <button className="add-btn" type="submit">Add</button>
      </form>

      {(boardLoading || loading) && <p>Loading...</p>}
      {boardError && <p style={{ color: "red" }}>Error loading board: {boardError.message || String(boardError)}</p>}
      {error && <p style={{ color: "red" }}>Error loading tasks: {error.message || String(error)}</p>}
      {!loading && !error && board && (
        <p style={{ color: "#666", marginBottom: 8, fontSize: "0.95em" }}>
          Board: <strong>{board.name || boardId}</strong> — members: {Array.isArray(board.members) ? board.members.length : 0}
        </p>
      )}

      <div className="tasks-container">
        <ul className="tasks-list">
          {tasks.length === 0 && <div className="no-tasks">No tasks yet</div>}
          {tasks.map(t => (
            <li key={t.id} className="task-item">
              {editing === t.id ? (
                <div className="edit-form">
                  <input className="edit-input" value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="edit-buttons">
                    <button className="save-btn" onClick={() => saveEdit(t.id)}>Save</button>
                    <button className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="task-content">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="checkbox" checked={!!t.completed} onChange={() => toggleComplete(t)} />
                    <span className="task-text" style={{ textDecoration: t.completed ? "line-through" : "none" }}>{t.text}</span>
                  </div>
                  <div className="task-buttons">
                    {(board && (board.ownerUid === user.uid || t.uid === user.uid)) && (
                      <>
                        <button className="edit-btn" onClick={() => startEdit(t)}>Edit</button>
                        <button className="delete-btn" onClick={() => remove(t.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
