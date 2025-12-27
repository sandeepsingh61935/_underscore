# Technical Q&A - Architecture Clarifications

## Question 1: What is `aggregate_type` and Use Cases?

### Concept Explanation

In Event Sourcing, an **aggregate** is a cluster of domain objects that can be treated as a single unit. The `aggregate_type` field identifies WHAT kind of thing the events are about.

### Use Cases

```yaml
Scenario 1: Highlight Events
  aggregate_id: "h-123-456-789"
  aggregate_type: "highlight"  # ← This is a HIGHLIGHT
  
  Events for this aggregate:
    - HighlightCreated
    - HighlightColorChanged  
    - HighlightTagsUpdated
    - HighlightDeleted

Scenario 2: Collection Events  
  aggregate_id: "c-abc-def-ghi"
  aggregate_type: "collection"  # ← This is a COLLECTION
  
  Events for this aggregate:
    - CollectionCreated
    - CollectionRenamed
    - HighlightAddedToCollection
    - CollectionDeleted

Scenario 3: User Settings Events
  aggregate_id: "u-user-123"
  aggregate_type: "user_settings"  # ← This is USER SETTINGS
  
  Events for this aggregate:
    - DefaultModeChanged
    - ColorPreferenceUpdated
    - ShortcutCustomized
```

### Why We Need It

**Without `aggregate_type`:**
```sql
-- BAD: All events mixed together
SELECT * FROM events WHERE aggregate_id = 'h-123';
-- Returns: Could be highlight events, collection events, who knows?
```

**With `aggregate_type`:**
```sql
-- GOOD: Clear intent
SELECT * FROM events 
WHERE aggregate_id = 'h-123' 
  AND aggregate_type = 'highlight';
-- Returns: Only highlight-related events
```

### Real-World Example

```typescript
// User creates a highlight
await db.events.insert({
  aggregate_id: 'h-123',
  aggregate_type: 'highlight',  // This is a highlight entity
  event_type: 'HighlightCreated',
  event_data: { text: '...', color: '#ffeb3b' }
});

// User adds highlight to collection
await db.events.insert({
  aggregate_id: 'c-456',
  aggregate_type: 'collection',  // This is a collection entity
  event_type: 'HighlightAddedToCollection',
  event_data: { highlight_id: 'h-123' }
});

// Rebuild state: Need to know which aggregate to rebuild
function rebuildAggregate(aggregateId: string, aggregateType: string) {
  const events = db.events.find({ 
    aggregate_id: aggregateId,
    aggregate_type: aggregateType  // Filter by type
  });
  
  if (aggregateType === 'highlight') {
    return rebuildHighlight(events);
  } else if (aggregateType === 'collection') {
    return rebuildCollection(events);
  }
}
```

---

## Question 2: What are Tags For? Use Cases

### Concept

Tags are user-defined labels to categorize and organize highlights by topic, project, or context.

### Use Cases

#### Use Case 1: Research Organization
```yaml
User: PhD student researching AI safety

Highlights tagged:
  - Tag: "ai-alignment" (15 highlights from different papers)
  - Tag: "mesa-optimization" (8 highlights)
  - Tag: "interpretability" (22 highlights)

Action:
  - Search: "Show me all highlights tagged 'ai-alignment'"
  - Filter: "Export only highlights with tag 'mesa-optimization' to PDF"
  - Smart collections: Auto-create collection from tag
```

#### Use Case 2: Work Projects
```yaml
User: Product manager juggling multiple projects

Highlights tagged:
  - Tag: "project-alpha" (articles about market research)
  - Tag: "project-beta" (competitor analysis)
  - Tag: "user-research" (customer interview notes)

Workflow:
  - Weekly review: Filter highlights by "project-alpha"
  - Meeting prep: Export highlights tagged "user-research"
  - Cross-project insights: Search across all tags
```

#### Use Case 3: Learning Topics
```yaml
User: Self-taught developer

Highlights tagged:
  - Tag: "rust" (tutorials, best practices)
  - Tag: "async-programming" (articles about async/await)
  - Tag: "performance" (optimization techniques)
  - Multi-tag: "rust" + "async-programming" (Rust async articles)

Study session:
  - Review all "rust" highlights
  - Create quiz from "async-programming" highlights (Gen Mode)
  - Connect concepts across "performance" highlights
```

#### Use Case 4: Content Creation
```yaml
User: Technical writer preparing blog post

Highlights tagged:
  - Tag: "blog-web-performance" (sources for upcoming article)
  - Tag: "quote-candidates" (potential quotes to use)
  - Tag: "statistics" (data to cite)

Writing process:
  1. Collect highlights → Tag "blog-web-performance"
  2. Mark good quotes → Also tag "quote-candidates"  
  3. Export to Notion → Filtered by tag
  4. Write article using organized highlights
```

### Technical Implementation

```sql
-- Fast tag lookup (denormalized table)
CREATE TABLE highlight_tags (
  highlight_id UUID,
  tag VARCHAR(100),
  user_id UUID,
  PRIMARY KEY (highlight_id, tag)
);

CREATE INDEX idx_tags_user_tag ON highlight_tags(user_id, tag);

-- Query: Find all highlights with tag "ai-alignment"
SELECT h.* 
FROM highlights h
JOIN highlight_tags ht ON h.id = ht.highlight_id
WHERE ht.user_id = 'user-123' 
  AND ht.tag = 'ai-alignment';

-- Query: Multi-tag search (AND operation)
SELECT h.*
FROM highlights h
WHERE h.id IN (
  SELECT highlight_id 
  FROM highlight_tags 
  WHERE user_id = 'user-123' 
    AND tag IN ('rust', 'async-programming')
  GROUP BY highlight_id
  HAVING COUNT(DISTINCT tag) = 2  -- Must have BOTH tags
);

-- Popular tags (autocomplete suggestions)
SELECT tag, COUNT(*) as count
FROM highlight_tags
WHERE user_id = 'user-123'
GROUP BY tag
ORDER BY count DESC
LIMIT 10;
```

### Why Tags Matter

✅ **Flexible organization** (not rigid folders)  
✅ **Multi-dimensional categorization** (one highlight, many tags)  
✅ **Fast search** (indexed lookups)  
✅ **Discoverability** (trending tags, recommendations)  
✅ **Cross-pollination** (find connections across topics)

---

## Question 3: Database Hosting - Beyond Supabase

### Problem Statement

Supabase free tier: 500MB storage ≈ 50,000 highlights (too small for scale)

### Option Analysis

| Option | Free Tier | Storage | RAM | Cost After | Recommendation |
|--------|-----------|---------|-----|------------|----------------|
| **Supabase** | 500MB DB | Unlimited projects | N/A | $25/month (8GB) | ⚠️ Limited |
| **Railway** | $5 credit/month | 1GB DB | 512MB | $0.000231/GB-hour | ✅ Good for dev |
| **Fly.io** | 3 VMs free | Custom (SSD) | 256MB | $0.0000022/GB-sec | ✅ Excellent |
| **Oracle Cloud** | FOREVER FREE | 20GB DB | 1GB | Always free | ✅✅ Best bang |
| **Neon** | 10 projects | 3GB DB | Autoscaling | $19/month | ✅ Modern |
| **PlanetScale** | 5GB DB | 1 billion rows | Serverless | $39/month | ⭐ Scalable |
| **CockroachDB** | 10GB storage | Distributed | N/A | $1/10M RU | ✅ Global |

### Recommended Strategy

#### Phase 1: Development (Month 1-6)
**Use: Railway or Fly.io**
```yaml
Railway:
  Free tier: $5/month credit
  Setup: 
    - Deploy PostgreSQL 16
    - 1GB storage
    - Auto-backup
  Cost projection (1000 users):
    - Database: $5/month (within credit)
    - App server: $5/month
    Total: $10/month (first $5 free)

Fly.io:
  Free tier: 3 VMs × 256MB
  Setup:
    - Postgres cluster (1 primary, 1 replica)
    - 10GB SSD (shared across apps)
  Cost projection (1000 users):
    - Database VM: Free
    - App VM: Free  
    Total: $0/month
```

#### Phase 2: Launch (Month 6-12, <10k users)
**Use: Oracle Cloud Always Free**
```yaml
Oracle Cloud Always Free (FOREVER):
  Compute:
    - 2 AMD VMs (1GB RAM each)
    - 4 Arm VMs (24GB RAM total) ← INSANE
  Storage:
    - 200GB block storage
    - 10GB object storage
  Database:
    - 2 Autonomous Databases (20GB each)
  Network:
    - 10TB outbound/month

Setup for Extension:
  VM 1 (AMD): PostgreSQL 16
    - 20GB storage for events
    - Handles 10M events (~10k users × 1k highlights)
  
  VM 2 (AMD): Application server
    - Node.js + Cloudflare Workers backup
    - Redis cache (in-memory)
  
  VM 3 (Arm): Monitoring + backups
    - Prometheus + Grafana
    - Daily PostgreSQL dumps to object storage

Estimated capacity:
  Users: 50,000
  Highlights: 50 million
  Cost: $0/month FOREVER

Migration from Railway:
  1. Export PostgreSQL dump from Railway
  2. Import to Oracle Cloud Postgres
  3. Update DNS to point to Oracle IP
  4. Test thoroughly
  5. Shut down Railway
```

#### Phase 3: Scale (10k-100k users)
**Use: Neon or PlanetScale**
```yaml
Neon (Recommended for Event Sourcing):
  Features:
    - Serverless Postgres
    - Instant branching (dev/staging/prod)
    - Autoscaling (0 → 4 vCPU)
    - Point-in-time restore
  
  Pricing:
    Free: 3GB storage, 300hr compute
    Pro: $19/month base + usage
      - $0.08/hr for compute
      - $0.16/GB storage
  
  At 25,000 users:
    - Storage: 50GB events = $8/month
    - Compute: ~100hr/month = $8/month
    Total: ~$35/month

PlanetScale (If using MySQL):
  Features:
    - Serverless MySQL
    - Horizontal sharding (built-in)
    - Zero-downtime schema changes
    - 1 billion row capacity
  
  Pricing:
    Free: 5GB storage, 1 billion rows/month
    Scaler: $39/month
      - 25GB storage
      - 100 billion rows/month
  
  At 50,000 users:
    - Within Scaler plan limits
    Total: $39/month
```

### Self-Hosted Setup (Oracle Cloud)

```yaml
Complete Setup Guide:

1. Create Oracle Cloud Account
   - Sign up (credit card required but never charged)
   - Verify email
   - Navigate to "Always Free Resources"

2. Provision Compute Instance
   - Shape: VM.Standard.E2.1.Micro (AMD, 1GB RAM)
   - OS: Ubuntu 22.04 LTS
   - Boot volume: 50GB
   - Network: Create VCN with public subnet
   - SSH: Generate key pair

3. Install PostgreSQL 16
   ssh ubuntu@<oracle-vm-ip>
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Add PostgreSQL repo
   sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
   wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc
   
   # Install PostgreSQL 16
   sudo apt update
   sudo apt install postgresql-16 postgresql-contrib-16 -y
   
   # Configure for remote access
   sudo nano /etc/postgresql/16/main/postgresql.conf
   # Change: listen_addresses = '*'
   
   sudo nano /etc/postgresql/16/main/pg_hba.conf
   # Add: host all all 0.0.0.0/0 md5
   
   sudo systemctl restart postgresql

4. Create Database & User
   sudo -u postgres psql
   
   CREATE DATABASE highlighter;
   CREATE USER highlighter_app WITH PASSWORD 'secure_random_password_here';
   GRANT ALL PRIVILEGES ON DATABASE highlighter TO highlighter_app;
   
   \c highlighter
   GRANT ALL ON SCHEMA public TO highlighter_app;
   
   \q

5. Security Hardening
   # Firewall rules (Oracle Cloud Security List)
   - Allow port 5432 from Cloudflare Workers IPs only
   - Deny all other traffic
   
   # SSL/TLS encryption
   sudo -u postgres psql
   ALTER SYSTEM SET ssl = on;
   SELECT pg_reload_conf();
   
   # Connection pooling (PgBouncer)
   sudo apt install pgbouncer -y
   # Configure for transaction pooling

6. Backups (Automated)
   # Daily dumps to Oracle Object Storage
   
   #!/bin/bash
   # /home/ubuntu/backup.sh
   
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_FILE="/tmp/highlighter_backup_$DATE.sql.gz"
   
   # Dump database
   sudo -u postgres pg_dump highlighter | gzip > $BACKUP_FILE
   
   # Upload to Oracle Object Storage
   oci os object put \
     --bucket-name highlighter-backups \
     --file $BACKUP_FILE \
     --name "backups/$(basename $BACKUP_FILE)"
   
   # Keep last 7 days only
   find /tmp/highlighter_backup_*.sql.gz -mtime +7 -delete
   
   # Cron job (daily at 2am UTC)
   crontab -e
   0 2 * * * /home/ubuntu/backup.sh

7. Monitoring
   # Install Prometheus + Node Exporter
   wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
   tar xvfz node_exporter-*.tar.gz
   sudo mv node_exporter-*/node_exporter /usr/local/bin/
   
   # Install postgres_exporter
   # Monitor query performance, connection pool, etc.

8. Connection String
   postgresql://highlighter_app:PASSWORD@<oracle-vm-public-ip>:5432/highlighter?sslmode=require

Capacity:
  - 50GB storage = 50 million events
  - 1GB RAM = ~100 concurrent connections
  - AMD CPU = ~1000 queries/second
  
  Sufficient for 50,000 active users
```

### Recommendation Summary

```yaml
Start with: Fly.io (free, fast iteration)
Launch with: Oracle Cloud Always Free (zero cost, high capacity)
Scale with: Neon (serverless, auto-scaling, managed)

Timeline:
  Month 1-3 (dev): Fly.io
  Month 4-12 (MVP launch): Oracle Cloud
  Month 13+ (10k+ users): Migrate to Neon if needed

Total cost Year 1: $0 (using free tiers only)
Total cost Year 2: $0-35/month (depending on growth)
```

### Why NOT Supabase for Production?

```yaml
Supabase Limitations:
  ❌ 500MB is tiny (50k highlights max on free tier)
  ❌ $25/month for 8GB (Oracle gives 20GB free)
  ❌ No custom extensions easily
  ❌ Limited control over PostgreSQL config
  ❌ Vendor lock-in (hard to migrate off)

Supabase Advantages:
  ✅ Instant setup (5 minutes)
  ✅ Built-in auth, storage, realtime
  ✅ Great DX (dashboard, logs)
  ✅ Edge functions (like Cloudflare Workers)

Verdict: 
  Use Supabase for prototyping/MVP (first 1000 users)
  Then migrate to Oracle Cloud (free) or Neon (scalable)
```
