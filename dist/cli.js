#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";

// src/utils/skills.ts
import { readFileSync, readdirSync, existsSync } from "fs";
import { join as join2 } from "path";

// src/utils/dirs.ts
import { join } from "path";
import { homedir } from "os";
function getSearchDirs() {
  return [
    join(process.cwd(), ".claude/skills"),
    // Project-local first
    join(homedir(), ".claude/skills")
    // Global second
  ];
}

// src/utils/yaml.ts
function extractYamlField(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}
function hasValidFrontmatter(content) {
  return content.trim().startsWith("---");
}

// src/utils/skills.ts
function findAllSkills() {
  const skills = [];
  const dirs = getSearchDirs();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join2(dir, entry.name, "SKILL.md");
        if (existsSync(skillPath)) {
          const content = readFileSync(skillPath, "utf-8");
          const isProjectLocal = dir === join2(process.cwd(), ".claude/skills");
          skills.push({
            name: entry.name,
            description: extractYamlField(content, "description"),
            location: isProjectLocal ? "project" : "global",
            path: join2(dir, entry.name)
          });
        }
      }
    }
  }
  return skills;
}
function findSkill(skillName) {
  const dirs = getSearchDirs();
  for (const dir of dirs) {
    const skillPath = join2(dir, skillName, "SKILL.md");
    if (existsSync(skillPath)) {
      return {
        path: skillPath,
        baseDir: join2(dir, skillName),
        source: dir
      };
    }
  }
  return null;
}

// src/commands/list.ts
function listSkills() {
  console.log("Available Skills:\n");
  const skills = findAllSkills();
  if (skills.length === 0) {
    console.log("No skills installed.\n");
    console.log("Install skills:");
    console.log("  openskills install anthropics/skills              # Global");
    console.log("  openskills install anthropics/skills --project    # Project-local");
    return;
  }
  const projectSkills = skills.filter((s) => s.location === "project");
  const globalSkills = skills.filter((s) => s.location === "global");
  if (projectSkills.length > 0) {
    console.log(".claude/skills/ (project):");
    for (const skill of projectSkills) {
      console.log(`  ${skill.name.padEnd(20)}`);
      console.log(`    ${skill.description}
`);
    }
  }
  if (globalSkills.length > 0) {
    console.log("~/.claude/skills/ (global):");
    for (const skill of globalSkills) {
      console.log(`  ${skill.name.padEnd(20)}`);
      console.log(`    ${skill.description}
`);
    }
  }
  console.log(`Total: ${skills.length} skill(s)`);
}

// src/commands/install.ts
import { readFileSync as readFileSync2, readdirSync as readdirSync2, existsSync as existsSync2, mkdirSync, rmSync, cpSync } from "fs";
import { join as join3, basename } from "path";
import { homedir as homedir2 } from "os";
import { execSync } from "child_process";
function installSkill(source, options) {
  const targetDir = options.project ? join3(process.cwd(), ".claude/skills") : join3(homedir2(), ".claude/skills");
  const location = options.project ? "project (.claude/skills)" : "global (~/.claude/skills)";
  console.log(`Installing from: ${source}`);
  console.log(`Location: ${location}
`);
  let repoUrl;
  let skillSubpath;
  if (source.startsWith("http://") || source.startsWith("https://")) {
    repoUrl = source;
    skillSubpath = "";
  } else {
    const parts = source.split("/");
    if (parts.length === 2) {
      repoUrl = `https://github.com/${source}`;
      skillSubpath = "";
    } else if (parts.length > 2) {
      repoUrl = `https://github.com/${parts[0]}/${parts[1]}`;
      skillSubpath = parts.slice(2).join("/");
    } else {
      console.error("Error: Invalid source format");
      console.error("Expected: owner/repo or owner/repo/skill-name");
      process.exit(1);
    }
  }
  const tempDir = join3(homedir2(), ".openskills-temp");
  mkdirSync(tempDir, { recursive: true });
  try {
    console.log("Cloning repository...");
    execSync(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}/repo"`, {
      stdio: "inherit"
    });
    const repoDir = join3(tempDir, "repo");
    if (skillSubpath) {
      installSpecificSkill(repoDir, skillSubpath, targetDir);
    } else {
      installAllSkills(repoDir, targetDir);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
  console.log("\nLoad skill: openskills load <skill-name>");
}
function installSpecificSkill(repoDir, skillSubpath, targetDir) {
  const skillDir = join3(repoDir, skillSubpath);
  const skillMdPath = join3(skillDir, "SKILL.md");
  if (!existsSync2(skillMdPath)) {
    console.error(`Error: SKILL.md not found at ${skillSubpath}`);
    process.exit(1);
  }
  const content = readFileSync2(skillMdPath, "utf-8");
  if (!hasValidFrontmatter(content)) {
    console.error("Error: Invalid SKILL.md (missing YAML frontmatter)");
    process.exit(1);
  }
  const skillName = basename(skillSubpath);
  const targetPath = join3(targetDir, skillName);
  mkdirSync(targetDir, { recursive: true });
  cpSync(skillDir, targetPath, { recursive: true });
  console.log(`\u2705 Installed: ${skillName}`);
  console.log(`   Location: ${targetPath}`);
}
function installAllSkills(repoDir, targetDir) {
  const findSkills = (dir) => {
    const skills = [];
    const entries = readdirSync2(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join3(dir, entry.name);
      if (entry.isDirectory()) {
        if (existsSync2(join3(fullPath, "SKILL.md"))) {
          skills.push(fullPath);
        } else {
          skills.push(...findSkills(fullPath));
        }
      }
    }
    return skills;
  };
  const skillDirs = findSkills(repoDir);
  if (skillDirs.length === 0) {
    console.error("Error: No SKILL.md files found in repository");
    process.exit(1);
  }
  let installedCount = 0;
  for (const skillDir of skillDirs) {
    const skillMdPath = join3(skillDir, "SKILL.md");
    const content = readFileSync2(skillMdPath, "utf-8");
    if (!hasValidFrontmatter(content)) {
      const skillName2 = basename(skillDir);
      console.warn(`\u26A0\uFE0F  Skipping ${skillName2}: Invalid SKILL.md`);
      continue;
    }
    const skillName = basename(skillDir);
    const targetPath = join3(targetDir, skillName);
    mkdirSync(targetDir, { recursive: true });
    cpSync(skillDir, targetPath, { recursive: true });
    console.log(`\u2705 Installed: ${skillName}`);
    installedCount++;
  }
  console.log(`
\u2705 Installation complete: ${installedCount} skill(s) installed`);
}

// src/commands/load.ts
import { readFileSync as readFileSync3 } from "fs";
function loadSkill(skillName) {
  const skill = findSkill(skillName);
  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    console.error("\nSearched:");
    console.error("  .claude/skills/ (project)");
    console.error("  ~/.claude/skills/ (global)");
    console.error("\nInstall skills: openskills install owner/repo");
    process.exit(1);
  }
  const content = readFileSync3(skill.path, "utf-8");
  console.log(`Loading: ${skillName}`);
  console.log(`Base directory: ${skill.baseDir}`);
  console.log("");
  console.log(content);
  console.log("");
  console.log(`Skill loaded: ${skillName}`);
}

// src/commands/remove.ts
import { rmSync as rmSync2 } from "fs";
import { homedir as homedir3 } from "os";
function removeSkill(skillName) {
  const skill = findSkill(skillName);
  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    process.exit(1);
  }
  rmSync2(skill.baseDir, { recursive: true, force: true });
  const location = skill.source.includes(homedir3()) ? "global" : "project";
  console.log(`\u2705 Removed: ${skillName}`);
  console.log(`   From: ${location} (${skill.source})`);
}

// src/cli.ts
var program = new Command();
program.name("openskills").description("Universal skills loader for AI coding agents").version("1.0.0");
program.command("list").description("List all installed skills").action(listSkills);
program.command("install <source>").description("Install skill from GitHub or Git URL").option("-p, --project", "Install to project .claude/skills/ (default: global ~/.claude/skills/)").action(installSkill);
program.command("load <skill-name>").description("Load skill to stdout (for AI agents)").action(loadSkill);
program.command("remove <skill-name>").alias("rm").description("Remove installed skill").action(removeSkill);
program.parse();
//# sourceMappingURL=cli.js.map