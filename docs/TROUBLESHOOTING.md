# Mission Control Office - Troubleshooting Guide

Soluciones a problemas comunes durante instalación, setup, y uso de MCO.

---

## 🔍 PostgreSQL Issues

### Problem: "PostgreSQL not running"

**Symptom**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: is the server running on host "localhost" (127.0.0.1) and accepting TCP/IP connections?
```

**Solutions**:

**macOS (Homebrew)**:
```bash
# Check status
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql

# If installed but not started:
pg_ctl -D /usr/local/var/postgres start

# Verify running
psql --version
psql -U postgres -c "SELECT 1"
```

**Windows**:
```bash
# Check in Services (Win+R → services.msc)
# Look for "postgresql-x64-15" or similar

# OR restart from command line:
net start PostgreSQL
```

**Linux**:
```bash
# Check status
sudo systemctl status postgresql

# Start if stopped
sudo systemctl start postgresql

# Enable on boot
sudo systemctl enable postgresql
```

---

### Problem: "FATAL: Ident authentication failed for user 'postgres'"

**Symptom**:
```
FATAL: Ident authentication failed for user "postgres"
```

**Solution**: PostgreSQL authentication method issue.

Edit `/etc/postgresql/13/main/pg_hba.conf` (or locate on your system):

Change this line:
```
local   all             postgres                                peer
```

To this:
```
local   all             postgres                                md5
```

Then restart:
```bash
sudo systemctl restart postgresql
```

Or on macOS/Windows, just use password authentication in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mission_control"
```

Make sure you created the user with a password:
```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

---

### Problem: "Database 'mission_control' does not exist"

**Symptom**:
```
Error: database "mission_control" does not exist
```

**Solution**: The database wasn't created. Run setup script:

```bash
npm run setup
```

Or manually create it:
```bash
psql -U postgres -c "CREATE DATABASE mission_control;"
psql -U postgres -d mission_control -c "CREATE SCHEMA IF NOT EXISTS public;"
```

---

## 🚀 Setup Script Issues

### Problem: "npm run setup fails"

**Symptom**:
```
✅ Checking environment...
✅ Generating Prisma types...
❌ Setting up database schema... (exit code: 1)
```

**Solutions**:

1. **Check DATABASE_URL is correct**:
   ```bash
   cat .env | grep DATABASE_URL
   ```

2. **Verify Prisma client is generated**:
   ```bash
   npm run db:generate
   ```

3. **Try manual push**:
   ```bash
   npx prisma db push --skip-generate
   ```

4. **Check PostgreSQL connection directly**:
   ```bash
   psql "postgresql://postgres:postgres@localhost:5432/mission_control" -c "SELECT 1"
   ```

If it still fails, check if `node_modules` is corrupted:
```bash
rm -rf node_modules package-lock.json
npm install
npm run setup
```

---

## 🖥️ Development Server Issues

### Problem: "Port 3001 is already in use"

**Symptom**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions**:

**macOS/Linux**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3002
```

**Windows**:
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3002
```

---

### Problem: "Cannot find module '@prisma/client'"

**Symptom**:
```
Error: Cannot find module '@prisma/client'
```

**Solution**:
```bash
npm install
npm run db:generate
```

---

## 🌐 Frontend Issues

### Problem: "Dashboard shows 'No agents' but I know data exists"

**Symptom**:
- Frontend loads but all panels are empty
- Console shows no errors

**Causes & Solutions**:

1. **API not running**:
   - Check: `curl http://localhost:3001/api/agents`
   - Should return JSON array

2. **DATABASE_URL points to wrong DB**:
   - Check `.env` DATABASE_URL
   - Verify it's the same database where seed ran

3. **Seed didn't run properly**:
   ```bash
   npm run db:seed
   # Then refresh browser
   ```

4. **Environment variable not picked up**:
   ```bash
   # Stop dev server
   # Ctrl+C
   
   # Restart
   npm run dev
   ```

---

### Problem: "Cannot read property 'map' in activity feed"

**Symptom**:
```
TypeError: Cannot read property 'map' of undefined
```

**Solution**: Activity schema mismatch. Try:

```bash
npm run db:generate
npm run db:seed
```

Restart dev server:
```bash
npm run dev
```

---

## 🔌 API Issues

### Problem: "/api/events keeps disconnecting"

**Symptom**:
- SSE connection closes after 30 seconds
- Real-time updates not working

**Causes**:

1. **Nginx/reverse proxy timeout**:
   - Add to nginx config: `proxy_read_timeout 300s;`

2. **Cloudflare or WAF**:
   - May buffer SSE, disable if testing locally

3. **Connection pooling issue in Prisma**:
   ```bash
   # Restart dev server
   npm run dev
   ```

---

### Problem: "CORS error" or "No 'Access-Control-Allow-Origin' header"

**Symptom** (if frontend on different origin):
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**: Update API to add CORS headers. Check `app/api/route.ts` or add:

```typescript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

Or use middleware in `middleware.ts`.

---

## 💾 Database Issues

### Problem: "Prisma migration conflicts"

**Symptom**:
```
Error: Unable to resolve the database provider
```

**Solution**: Reset database (WARNING: loses data):

```bash
npx prisma migrate reset
```

Answer `y` to confirm. This will:
- Drop DB
- Recreate schema
- Reseed data

---

### Problem: "Schema mismatch after code changes"

**Symptom**:
- You modified `prisma/schema.prisma`
- Seeding fails or types are out of sync

**Solution**:
```bash
npm run db:generate    # Regen types
npx prisma db push    # Apply schema changes
npm run db:seed       # Reseed
```

---

## 🏗️ Build Issues

### Problem: "Build fails with TypeScript errors"

**Symptom**:
```
error TS2307: Cannot find module '@prisma/client'
```

**Solution**:
```bash
npm run db:generate
npm run build
```

---

### Problem: "npm install fails"

**Symptom**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution**:
```bash
npm install --legacy-peer-deps
```

Or clear cache:
```bash
npm cache clean --force
npm install
```

---

## 🐛 Performance Issues

### Problem: "Dashboard is slow / lots of requests"

**Symptom**:
- Dashboard takes 5+ seconds to load
- Network tab shows many requests

**Causes & Solutions**:

1. **Database slow**:
   ```bash
   # Check query performance
   # Add indexes as needed in schema.prisma
   ```

2. **React Query polling too aggressive**:
   - Edit polling intervals in `app/office/page.tsx`:
   ```typescript
   refetchInterval: 12_000  // Increase from 12s if needed
   ```

3. **Large dataset**:
   - Implement pagination: `?limit=20&cursor=...`

---

## 📞 Getting Help

If none of these work:

1. Check logs:
   ```bash
   # Console output from `npm run dev`
   ```

2. Check `.env` is configured:
   ```bash
   cat .env
   ```

3. Verify PostgreSQL:
   ```bash
   psql postgres -c "\\l"
   ```

4. Check Node version:
   ```bash
   node --version  # Should be 18+
   ```

5. Try clean install:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run setup
   ```

---

## ✅ Quick Verification Checklist

Before reporting issues, verify:

- [ ] Node 18+ installed: `node --version`
- [ ] PostgreSQL running: `psql postgres -c "SELECT 1"`
- [ ] `.env` file exists with DATABASE_URL
- [ ] `npm install` completed without errors
- [ ] `npm run setup` succeeded
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:3001 loads in browser
- [ ] `curl http://localhost:3001/api/agents` returns JSON

If all pass, MCO is working correctly.

---

**Need more help?** Check [ARCHITECTURE.md](./ARCHITECTURE.md) or [INSTALLATION.md](./INSTALLATION.md).
