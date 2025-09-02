# Coordination Folder

This folder contains all project coordination documentation for Notionally.

## Structure

```
coordination/
├── README.md                 # This file
├── DECISIONS_LOG.md         # Record of all technical decisions
├── ROADMAP.md              # Future development plans
├── tasks/
│   ├── pending/            # Tasks to be done
│   │   ├── TASK-005-phase2-validation.md
│   │   └── TASK-006-duplicate-prevention.md
│   └── completed/          # Finished tasks
│       └── TASK-004-phase1-security.md
├── reviews/
│   ├── security/          # Security review results
│   └── code-quality/      # Code quality reviews
└── solutions/
    └── https-http-fix-options.md  # Solution proposals

```

## Key Documents

### DECISIONS_LOG.md
Chronicles all major technical decisions, their context, and outcomes. Essential reading for understanding why the codebase is the way it is.

### ROADMAP.md
Plans for future development, organized by risk level and testing requirements. Each phase must pass all tests before proceeding.

### Task Format
Each task follows the template:
- Status block (assignee, priority, dates)
- Clear description
- Implementation requirements
- Testing protocol
- Acceptance criteria
- Rollback plan

## Workflow

1. **New Task Creation**
   - Create in `tasks/pending/`
   - Use TASK-XXX numbering
   - Include all required sections

2. **Task Completion**
   - Update status with completion date
   - Move to `tasks/completed/`
   - Update DECISIONS_LOG if significant

3. **Decision Making**
   - Document in DECISIONS_LOG
   - Include context, alternatives considered
   - Record outcome

4. **Reviews**
   - Store results in appropriate subfolder
   - Include date, findings, recommendations

## Principles

1. **Documentation First** - Write the plan before the code
2. **Test Everything** - No task complete without tests
3. **Learn from History** - Read DECISIONS_LOG before making changes
4. **Small Steps** - Break large tasks into phases
5. **Always Have Rollback** - Every change needs an undo plan

## Quick Commands

### Create New Task
```bash
cp coordination/tasks/TEMPLATE.md coordination/tasks/pending/TASK-XXX-name.md
```

### Check Pending Work
```bash
ls coordination/tasks/pending/
```

### Review Decisions
```bash
cat coordination/DECISIONS_LOG.md
```

## Important Notes

- **Never skip testing protocol** - It exists because things broke before
- **Read DECISIONS_LOG** - Learn from past mistakes
- **Follow ROADMAP** - Phases are ordered by risk
- **Update documentation** - Future you will thank present you

## The Prime Directive

Every change must answer: **"Will this break LinkedIn integration or image embedding?"**

If there's any doubt, create a task, plan thoroughly, test extensively.