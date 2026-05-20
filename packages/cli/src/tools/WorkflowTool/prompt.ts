import { WORKFLOW_TOOL_NAME } from './constants.js'

export const WORKFLOW_TOOL_PROMPT = `Define a multi-step workflow as a directed acyclic graph (DAG) of agents.

Each step in the workflow runs as a forked agent. Steps that declare dependencies (depends_on) will wait until all their parent steps have completed before starting. Steps with no dependencies start immediately and may run in parallel.

Guidelines:
- Give each step a short, descriptive name (lowercase, hyphenated).
- Write a clear directive for each step — since forked agents inherit your context, the directive should describe *what to do*, not the full background.
- Declare dependencies only when one step truly needs the output of another. Unrelated steps should have no dependency between them so they can run in parallel.
- Keep workflows focused: 3-8 steps is the sweet spot. Break very large workflows into separate invocations.
- Cycles are not allowed. The tool validates the DAG and will reject cyclic dependencies.

Example:

\`\`\`json
{
  "workflow_name": "release-checklist",
  "steps": [
    { "name": "lint", "directive": "Run the linter and fix any errors" },
    { "name": "test", "directive": "Run the full test suite and report failures" },
    { "name": "typecheck", "directive": "Run TypeScript type checking" },
    { "name": "report", "directive": "Summarize the results of lint, test, and typecheck into a single go/no-go recommendation", "depends_on": ["lint", "test", "typecheck"] }
  ]
}
\`\`\`

In this example, lint, test, and typecheck run in parallel. report waits for all three to finish.
`

export { WORKFLOW_TOOL_NAME }
