export const MONITOR_TOOL_NAME = 'Monitor'

export const MONITOR_TOOL_PROMPT = `Start streaming a background process. Each stdout line generates a notification. Use for watching logs, polling APIs, or monitoring file changes. Prefer this over Bash with sleep patterns.

When to use Monitor vs Bash run_in_background:
- Use Monitor when you want to observe ongoing output (e.g., tailing logs, watching for file changes, polling an endpoint).
- Use Bash with run_in_background when you just need a command to finish and want to be notified of completion.`
