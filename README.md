TeamBoard: Collaborative Task Management System
TeamBoard is a real-time, multi-user task management application designed for team collaboration. Built with React and Firebase, it allows users to create shared boards, manage members, and coordinate tasks with role-specific permissions.

🚀 Live Demo
https://to-do-list-cd485.web.app

✨ Features
📋 Board Management
Create Boards: Any user can initialize a new project board.

Member Control: Owners can invite members by email to join a board.

Real-time Sync: Powered by Firestore, all changes (adds, deletes, edits) reflect instantly across all devices.

🔐 Permission System (RBAC)
Owner Role: * Full administrative control.

Can edit/delete any task on the board.

Can add or remove members.

Can delete the entire board.

Member Role:

Can view the board and all tasks.

Can add new tasks to the board.

Can edit or delete only the tasks they created.

🛠 Technical Highlights
Authentication: Secure Google Sign-In via Firebase Auth.

NoSQL Database: Data structured into boards and tasks collections.

State Management: React hooks for handling complex UI states and permission checks.

🏗️ Tech Stack
Frontend: React.js, Vite

Styling: CSS3 (Responsive Design)

Backend-as-a-Service: Firebase

Firestore: Real-time NoSQL Database

Authentication: OAuth (Google)

Hosting: Firebase Hosting