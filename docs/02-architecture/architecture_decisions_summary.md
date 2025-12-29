# Architecture Decisions - Quick Reference

## User's Approved Choices ✅

### 1. Sync Architecture: Event Sourcing

- **Decision**: Use Event Sourcing (event-driven architecture)
- **Rationale**: Suits this project perfectly
- **When**: Vault Mode implementation (Week 11+)
- **Benefits**: Zero data loss, audit trail, time-travel debugging

### 2. Database Strategy: Supabase → Oracle Cloud

- **Development**: Supabase (PostgreSQL)
  - Fast setup, great DX
  - Free tier sufficient for testing
  - Use for: Dev, testing, first 1,000 users
- **Production**: Oracle Cloud Always Free
  - Zero cost forever
  - 20GB PostgreSQL + 1GB RAM
  - Handles 50,000 users
  - Migrate: Week 14-15 (after Sprint Mode launch)

### 3. Implementation Priority: Sprint Mode First

- **Phase 1** (Week 1-10): Sprint Mode only (in-memory, no DB)
- **Phase 2** (Week 11+): Vault Mode with Event Sourcing + Supabase
- **Phase 3** (Week 14-15): Migrate to Oracle Cloud
- **Phase 4** (Future): Gen Mode (AI features)

## Implementation Plan Updates

✅ Added architectural decisions to Sprint Mode plan  
✅ Added Supabase setup to Sprint 0 (foundation work)  
✅ Added Event Sourcing schema design to Sprint 0  
✅ Documented Oracle Cloud migration path

## Next Steps

1. ✅ Review updated Sprint Mode implementation plan
2. ⏳ Approve plan to begin Sprint 0
3. ⏳ Start development

---

**Status**: Ready to begin implementation  
**Last Updated**: December 26, 2025
