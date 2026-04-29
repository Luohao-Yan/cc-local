'use strict'

const { DEFAULT_GRANT_FLAGS } = require('./types/index.js')

const API_RESIZE_PARAMS = {}

/**
 * @param {number} physW
 * @param {number} physH
 * @param {object} _params
 * @returns {[number, number]}
 */
function targetImageSize(physW, physH, _params) {
  return [physW, physH]
}

function buildComputerUseTools() {
  return []
}

function createComputerUseMcpServer(_adapter, _coordinateMode) {
  return {
    setRequestHandler() {},
    async connect() {},
  }
}

function bindSessionContext(_adapter, _coordinateMode, _ctx) {
  return async function dispatch(_toolName, _args) {
    return {
      content: [{ type: 'text', text: '' }],
      telemetry: undefined,
    }
  }
}

module.exports = {
  API_RESIZE_PARAMS,
  DEFAULT_GRANT_FLAGS,
  bindSessionContext,
  buildComputerUseTools,
  createComputerUseMcpServer,
  targetImageSize,
}
