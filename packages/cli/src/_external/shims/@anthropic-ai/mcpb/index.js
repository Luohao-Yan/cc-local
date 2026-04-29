'use strict'

const McpbManifestSchema = {
  safeParse(data) {
    return { success: true, data }
  },
}

async function getMcpConfigForManifest(_opts) {
  return null
}

module.exports = {
  McpbManifestSchema,
  getMcpConfigForManifest,
}
