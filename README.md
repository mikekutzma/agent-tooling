# Agent Tooling

Skills and extensions for the [Pi](https://buildwithpi.ai/) coding agent.

## Skills

All skill files are in the [`skills`](skills) folder:

* [`/mta-data`](skills/mta-data) - Search, download, and analyze MTA (Metropolitan Transportation Authority) open data from the New York State Open Data portal. Query ridership, stations, accessibility, performance metrics, and analyze trends using DuckDB.

## Installation

These skills work with both [Pi](https://buildwithpi.ai/) and [Claude Code](https://code.claude.com/). You can install them globally, per-project, or use them temporarily.

For more information about skills, see the [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills).

### Pi Installation

```bash
# Global installation (available in all projects)
mkdir -p ~/.pi/agent/skills
ln -s $(pwd)/skills/* ~/.pi/agent/skills/

# Or project-local
mkdir -p .pi/skills
ln -s $(pwd)/skills/* .pi/skills/

# Or use temporarily
pi --skill ./skills/mta-data
```

### Claude Code Installation

```bash
# Global installation (available in all projects)
mkdir -p ~/.config/claude/skills
ln -s $(pwd)/skills/* ~/.config/claude/skills/

# Or project-local (create .claude directory in your project)
mkdir -p .claude/skills
ln -s $(pwd)/skills/* .claude/skills/

# Or use temporarily with --skill flag
claude --skill ./skills/mta-data
```

### Verifying Installation

After symlinking, verify the skills are available:

```bash
# For Pi
pi --list-skills

# For Claude Code
claude --list-skills
```

You should see the skills from this repo listed (e.g., `mta-data`).

## Development

Skills follow the [Agent Skills standard](https://agentskills.io/specification).

Each skill is a directory containing:
- `SKILL.md` - Frontmatter and instructions
- `scripts/` - Helper scripts (optional)
- `references/` - Detailed documentation (optional)
