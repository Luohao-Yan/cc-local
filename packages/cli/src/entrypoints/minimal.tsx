/**
 * Minimal CLI entrypoint for testing
 */

console.log('Starting minimal CLI...')

const React = await import('react')
const { render, Box, Text } = await import('ink')

console.log('Ink imported, rendering...')

const app = render(
  React.createElement(Box, { flexDirection: 'column' }, [
    React.createElement(Text, { key: 1, color: 'cyan', bold: true }, 'CCLocal'),
    React.createElement(Text, { key: 2, color: 'green' }, 'Welcome! Type your message.')
  ])
)

console.log('Rendered. Waiting 5 seconds...')

setTimeout(() => {
  console.log('Unmounting...')
  app.unmount()
  process.exit(0)
}, 5000)
