**Database & App Overview**

- **Purpose:** Shared task boards where small groups (friends, family) can create a private board, invite members (by UID), add tasks, edit, delete, and mark tasks completed.

**Main Collections (Firestore)**

1. `boards` (collection)
   - Document id: auto-generated `boardId`
   - Fields:
     - `name` (string) — friendly board name
     - `ownerUid` (string) — UID of the board owner (creator)
     - `members` (array of strings) — list of UIDs allowed to read/manage board tasks
     - `createdAt` (timestamp)
   - Example document:
     {
       "name": "Family Tasks",
       "ownerUid": "UID_abc123",
       "members": ["UID_abc123", "UID_xyz789"],
       "createdAt": Timestamp(...)
     }

2. `tasks` (collection)
   - Document id: auto-generated `taskId`
   - Fields:
     - `text` (string) — task content
     - `uid` (string) — creator UID
     - `boardId` (string) — id of the board this task belongs to
     - `completed` (boolean)
     - `createdAt` (timestamp)
   - Example document:
     {
       "text": "Buy groceries",
       "uid": "UID_xyz789",
       "boardId": "board_01",
       "completed": false,
       "createdAt": Timestamp(...)
     }

**Auth**
- Users sign in with Firebase Auth (Google provider). The app uses the authenticated `uid` (and `displayName`) for permission checks and creator attribution.

**Security Rules (summary)**
- Boards: only members (UIDs in `boards/{boardId}.members`) can read the board document.
- Boards: only the `ownerUid` may update/delete the board (manage membership and delete the board).
- Tasks:
  - Read: only board members may read tasks for that board.
  - Create: requestor must be authenticated, `request.resource.data.uid` must equal `request.auth.uid`, and the UID must be a board member.
  - Update: full edits allowed to the task creator or the board owner. Board members are allowed to toggle `completed` only; other fields must remain unchanged when a member toggles completion.
  - Delete: allowed to the task creator or the board owner.

(Full rules are in `src/firebase_rules.txt`.)

**Client-side behaviour / flows**

- Create board (owner): client writes a `boards` document: { name, ownerUid, members: [ownerUid], createdAt }.
- Select board: client queries `boards` where `members array-contains currentUid` and lists boards. (Client sorts by `createdAt`.)
- Invite member: owner updates `boards/{boardId}` with `arrayUnion(memberUid)` to add a UID to `members`.
- Remove member: owner updates `boards/{boardId}` with `arrayRemove(memberUid)`.
- Add task: client writes a `tasks` doc including `boardId` and `uid` (creator). Rules verify the user is a member.
- Edit/delete task: allowed only to creator or board owner (server enforced by rules). Board members may toggle `completed` (rules enforce that only `completed` changes).
- Delete board: owner UI triggers deletion of all `tasks` with that `boardId`, then deletes the `boards/{boardId}` doc.

**Indexes**
- For server-side ordering and pagination, create a composite index on `tasks`: (`boardId`: Ascending, `createdAt`: Descending). The app currently sorts client-side to avoid needing the index during testing; adding the index lets you use server `orderBy` and improves large-board performance.

**Notes & Best Practices**
- Always publish the security rules from the `src/firebase_rules.txt` content to the Firebase Console.
- Invitations are currently UID-based (owner pastes the invited user's UID). If you prefer email-based invites, implement an email→UID lookup or create an invite token document to handle join-by-code flows.
- Backups: before destructive operations (board delete), consider exporting the `tasks` and `boards` documents via the Firebase console or a small admin script.

**Where to look in code**
- App layout & board selection: `src/App.jsx`
- Board page and task CRUD: `src/pages/Board.jsx`
- Firestore config: `src/firebase.js`
- Firestore rules (publish these): `src/firebase_rules.txt`

**Quick dev run**
```bash
npm install
npm run dev
```

If you want, I can also add a short admin script to export boards/tasks JSON to `./backups/` before deleting a board.
