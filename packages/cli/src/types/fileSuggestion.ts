export interface FileSuggestionCommandInput {
  session_id: string
  transcript_path: string
  cwd: string
  query: string
  permission_mode?: string
  agent_id?: string
  agent_type?: string
}
