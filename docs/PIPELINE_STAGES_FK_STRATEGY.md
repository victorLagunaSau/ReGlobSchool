# Pipeline Stages Foreign Key Strategy

## Overview
This document explains the foreign key constraints in `pipeline_stages` and related tables to ensure future changes don't break deletion operations.

## Foreign Key Constraints

### 1. stage_outcomes → pipeline_stages

**FK Chain:**
- `stage_outcomes.stage_id` → `pipeline_stages.id` (ON DELETE CASCADE)
  - When a stage is deleted, all its outcomes are deleted
- `stage_outcomes.next_stage_id` → `pipeline_stages.id` (ON DELETE SET NULL)
  - When a target stage is deleted, the outcome's next_stage_id becomes NULL

**Why This Design:**
- `stage_id` uses CASCADE because outcomes belong to a stage; if stage dies, outcomes are orphaned
- `next_stage_id` uses SET NULL because it's just a routing reference, not ownership

### 2. pipeline_stages → pipeline_stages (Self-References)

**FK Chain:**
- `pipeline_stages.siguiente_etapa_id` → `pipeline_stages.id` (ON DELETE SET NULL)
  - Old field, deprecated but kept for compatibility
- `pipeline_stages.continuar_a_id` → `pipeline_stages.id` (ON DELETE SET NULL)
  - When a destination stage is deleted, the success path clears
- `pipeline_stages.regresar_a_id` → `pipeline_stages.id` (ON DELETE SET NULL)
  - When a destination stage is deleted, the failure path clears

**Why ON DELETE SET NULL:**
- These are routing links, not ownership relationships
- Setting to NULL indicates "no routing" rather than cascading deletion
- Allows stages to be deleted without affecting the structure of other stages

## Adding New Stages

When creating a new stage:
1. **Always provide `tipo`** (default: 'contacto')
2. **Optionally set routing:**
   - `continuar_a_id`: Stage ID for success path
   - `regresar_a_id`: Stage ID for failure path
3. Do NOT set `siguiente_etapa_id` (deprecated, use continuar_a_id instead)

## Deleting Stages

Deletion now works cleanly because:
1. ✅ `stage_outcomes` entries are automatically deleted via CASCADE
2. ✅ Outcome routing (`next_stage_id`) is cleared via SET NULL
3. ✅ Stage routing (`continuar_a_id`, `regresar_a_id`) is cleared via SET NULL
4. ✅ No orphaned references remain

**There should be no FK violations when deleting any stage.**

## Migration History

- **Migration 023**: Fixed `stage_outcomes.stage_id` FK → ON DELETE CASCADE
- **Migration 024**: Fixed `stage_outcomes.next_stage_id` FK → ON DELETE CASCADE
- **Migration 025**: Fixed self-references with ON DELETE SET NULL (incomplete)
- **Migration 026**: Comprehensive fix—all FKs corrected in one shot

All stages now delete without issues.
