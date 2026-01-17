# Agent Skills Manager

AgentSkills 多 IDE 管理扩展：用于在 Antigravity、CodeBuddy、Cursor、Qoder、Trae、Windsurf（以及 VS Code）中浏览与安装 skill 仓库，并支持从 https://claude-plugins.dev/ 搜索云端目录（约 58K skills）。

![image](https://raw.githubusercontent.com/lasoons/AgentSkillsManager/refs/heads/main/resources/image.png)

## 功能

- **仓库管理**：添加、删除、切换 skill 仓库分支
- **Skill 安装**：安装到当前 IDE 对应的 skills 目录
- **云端 Skill 搜索（约 58K）**：从 https://claude-plugins.dev/ 的云端目录搜索，一键/回车安装
- **多 IDE 支持**：支持 VSCode、Cursor、Trae、Antigravity、Qoder、Windsurf、CodeBuddy
- **激活目录标识**：在本地 skills 分组上标识当前 IDE 的激活目录

## 使用方法

1. 在 Activity Bar 打开 **Agent Skills** 面板 ![icon](https://raw.githubusercontent.com/lasoons/AgentSkillsManager/refs/heads/main/resources/skills-icon.png)
2. 点击 **+** 添加 skill 仓库（例如 `https://github.com/anthropics/skills`）
3. 展开仓库浏览可用 skills
4. 勾选需要的 skills，点击 **Install**
5. 点击搜索图标搜索云端 skills，然后按 **回车**（或点 **Install**）下载安装

## Skill 仓库推荐

扩展默认内置的预置仓库：

| 仓库 | 说明 |
|------|------|
| [anthropics/skills](https://github.com/anthropics/skills) | Anthropic 官方 skills 集合 |
| [openai/skills](https://github.com/openai/skills) | OpenAI 官方 skills 目录 |
| [skillcreatorai/Ai-Agent-Skills](https://github.com/skillcreatorai/Ai-Agent-Skills) | 社区 skills 集合 |
| [obra/superpowers](https://github.com/obra/superpowers) | Superpowers skills 集合 |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | awesome-claude-skills 精选集合 |

更多仓库可参考 [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)。

## 配置说明

Skills 会安装到工作区内“当前 IDE 激活的 skills 目录”：
- **VSCode**：`.github/skills`
- **Cursor**：`.cursor/skills`
- **Trae**：`.trae/skills`
- **Antigravity**：`.agent/skills`
- **Qoder**：`.qoder/skills`
- **Windsurf**：`.windsurf/skills`
- **CodeBuddy**：`.codebuddy/skills`

仓库扫描会包含隐藏目录中的 skills（例如 `.curated`、`.experimental`）。

## License

MIT
