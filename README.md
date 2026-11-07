# AyudaSys

Household census and QR-based assistance distribution, built on [mendylivium/go-mvc](https://github.com/mendylivium/go-mvc): Go 1.27, Fiber v3, GORM, Vue 3, Inertia, Tailwind/DaisyUI, and Vite. SQLite is the default database; the framework also supports MySQL and PostgreSQL.

## Run locally

The workspace already has dependencies, a frontend build, `.env`, and a migrated SQLite database with staff accounts. Run:

```powershell
.\bin\ayudasys.exe serve
```

Open **http://localhost:3000**.

You can also run `.\run.cmd` (or double-click `run.cmd`); it sets the working directory to the project root before starting the server. Do not launch the executable from inside `bin`: the relative SQLite path would point to `bin/storage/database.db` instead of the migrated `storage/database.db`. If you see `no such table: sessions`, stop that server and run from the project root. On a fresh database, first run `.\bin\ayudasys.exe migrate --seed` from the root.

Development accounts (local use only):

| Role | Email | Password |
| --- | --- | --- |
| Administrator | admin@example.com | password |
| Enumerator | enumerator@example.com | password |
| Distributor | distributor@example.com | password |

Change passwords through the profile screen before real use. The local application starts with no household or assistance records. Browser QA uses a separate ignored `storage/qa.db` database.

For a fresh checkout:

```powershell
Copy-Item .env.example .env
npm ci
go mod download
# Generate a JWT secret and put it in .env:
go run . key:generate
go run . migrate --seed
npm run build
go run . serve
```

For live frontend development, run `npm run dev` in another terminal while the Go server runs. In environments using a corporate certificate store, `NODE_USE_SYSTEM_CA=1` allows Node to use trusted system certificates without disabling TLS verification.

## Workflow

1. **Admin:** Create an assistance program with its date, venue, and package description. Add individual staff accounts through Team & access.
2. **Enumerator:** Register the head of family, address, purok/sitio, optional phone number, other household members and ages. Pin the home on the map, use device location, or enter coordinates.
3. **Enumerator:** Open the household, select an eligible program, and enroll it. Print the generated QR stub using the browser print dialog (also supports Save as PDF).
4. **Distributor:** Select the program, enable the camera, and scan the stub. A USB keyboard scanner or pasted 64-character stub code also works.
5. **Distributor:** Verify the displayed household and claimant identification, record the actual claimant's name, and confirm release. Scanning alone never records a release.
6. **Admin:** Review totals and the eight most recent releases on the dashboard. Close a program to stop enrollment and claiming.

## Access and data rules

| Action | Admin | Enumerator | Distributor |
| --- | --- | --- | --- |
| Dashboard and program list | Yes | Yes | Yes |
| Household census and map | Yes | Yes | No |
| Enroll households and print stubs | Yes | Yes | No |
| Scan, verify and release | Yes | No | Yes |
| Create/close programs and manage staff | Yes | No | No |

Permissions are enforced on the server. Public registration and the starter's posts/user API routes are disabled. Staff access is revoked by soft-deleting the account; recorded releases retain the officer's identity. Staff can update their own profile and password.

QR codes contain only a cryptographically random 256-bit enrollment token, not names or addresses. Lookup requires an authenticated distributor/admin and the matching program. Each household/program pair has one enrollment; a database unique constraint permits only one release per enrollment, including requests from different devices. A transaction checks program status before release. Claims record the claimant, releasing officer and timestamp. Eligibility is determined by staff before enrollment, not inferred from household characteristics.

## Interface

Uses the built-in DaisyUI light theme and standard buttons, inputs, selects, cards, badges, tables, and drawer navigation. Custom CSS is limited to page layout, Leaflet markers, and printing; no theme color or radius overrides.

## Map and camera

- Map tiles come from OpenStreetMap and require internet access. Coordinates can still be entered manually when tiles cannot load. Attribution is retained.
- The default map shows the Philippines until staff pin or locate a home; no barangay is assumed.
- Camera and device location require browser permission and HTTPS, except on localhost. A phone connecting to a plain HTTP LAN address generally cannot use the camera. Serve through an HTTPS reverse proxy for multi-device use.
- The scanner and QR generator are bundled locally. Real-device camera performance and printer output still need checking on the devices used at distribution.
- This version requires a connection to the Go server; it does not queue claims offline.

## Deployment

```powershell
npm ci
npm run build
go build -o bin/ayudasys.exe .
```

Deploy the binary, `dist/`, and an environment file to a Go-capable host. For Linux, build a Linux binary on that platform or with an appropriate cross-build. Set `APP_ENV=production`, a strong `JWT_SECRET`, and secure database settings; terminate HTTPS at a reverse proxy. Run migrations before serving. For initial production staff seeding, set `SEED_PASSWORD` to 12-72 characters; production seeding refuses the development default. Existing accounts are not overwritten by re-seeding. Back up the database using a database-safe backup process.

No site has been published and no changes have been pushed to the framework repository. Sites/Cloudflare Workers hosting does not run this Go server.

## Verification

```powershell
go test ./...
go vet ./...
npm run build
```

On Windows hosts where antivirus temporarily locks completed Go test executables, `go test -work ./...` retains the work directory and avoids the cleanup lock.

HTTP tests cover staff login, CSRF protection, role boundaries, census validation and persistence, enrollment uniqueness, wrong-program QR lookup, duplicate claim prevention, release attribution, closed programs, and staff creation. Browser QA covered login, program creation, census with a map and family member, QR generation, lookup, confirmed release, already-claimed state, and mobile overflow at 390px.

The camera was not exercised with a physical QR card. SQLite was exercised; MySQL/PostgreSQL are supported by the inherited ORM configuration but were not integration-tested here. `npm audit fix` updated compatible dependencies; four moderate findings remain in the inherited ESLint/minimatch development dependency chain. The audit's suggested forced downgrade was not applied.
