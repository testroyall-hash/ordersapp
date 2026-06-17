# Deploy to Render

Use **Web Service** for this project. It is an Express app with API routes and SQLite, so **Static Site** is not enough.

## Fast demo

1. Push this repository to GitHub.
2. In Render, choose **New > Web Service**.
3. Connect the repository.
4. Use:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Leave `DB_PATH` unset.

This uses the bundled `db.sqlite3` from the repo. It is fine for a client demo, but changes made on Render can be lost on redeploy/restart because Render service filesystems are ephemeral unless you attach a disk.

## Demo with persistent SQLite

1. Create the same **Web Service**.
2. Open **Advanced** during service creation, or later go to the service **Disks** page.
3. Add a persistent disk:
   - Mount path: `/var/data`
   - Size: the smallest available size is enough for this demo database.
4. Add environment variable:
   - `DB_PATH=/var/data/db.sqlite3`
5. Deploy.

On first start, the app copies the bundled `db.sqlite3` to `/var/data/db.sqlite3`. After that, SQLite changes are written to the persistent disk.

## Notes

- Render provides the `PORT` environment variable automatically. `server.js` already uses it.
- For real production use, migrate from SQLite to managed Postgres. SQLite on a persistent disk is acceptable for a simple demo, but not ideal for concurrent production usage.
