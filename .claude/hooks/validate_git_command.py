#!/usr/bin/env python3
import sys, re, json

CONVENTIONAL_COMMIT_PATTERN = (
    r"^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)"
    r"(\([^)]+\))?!?: .{1,60}$"
)

CHECKS = [
    {
        "pattern": r'git\s+commit\s+.*-m\s*["\']([^"\']+)["\']',
        "check": "conventional_commit",
        "extract_group": 1,
    },
]

def check_conventional_commit(message):
    if not re.match(CONVENTIONAL_COMMIT_PATTERN, message):
        return (
            "Commit message doesn't follow Conventional Commits.\n\n"
            "  Format:  <type>(<scope>): <subject>\n"
            "  Types:   feat fix docs style refactor perf test build ci chore revert\n"
            "  Examples:\n"
            "    feat(auth): add OAuth2 login flow\n"
            "    fix(plans): correct weekly mileage calculation\n"
            "    chore(deps): upgrade Next.js to 16.3.0\n\n"
            f'  Your message: "{message[:80]}"'
        )
    return None

def main():
    try:
        data = json.loads(sys.stdin.read())
        command = data.get("command", "")
    except Exception:
        return

    if not command or "git" not in command.lower():
        return

    for check in CHECKS:
        match = re.search(check["pattern"], command, re.IGNORECASE)
        if not match:
            continue
        msg = match.group(check["extract_group"])
        warning = check_conventional_commit(msg)
        if warning:
            print(f"<system-reminder>\n⚠️  Git commit warning:\n\n{warning}\n</system-reminder>")

if __name__ == "__main__":
    main()
