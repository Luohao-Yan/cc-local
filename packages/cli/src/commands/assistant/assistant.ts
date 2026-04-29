import React from 'react'

export function NewInstallWizard(_props: {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}): React.ReactElement {
  return React.createElement('box')
}

export async function computeDefaultInstallDir(): Promise<string> {
  return ''
}
