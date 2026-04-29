'use strict'

function isNativeAudioAvailable() {
  return false
}

function isNativeRecordingActive() {
  return false
}

function stopNativeRecording() {}

function startNativeRecording(_onData, _onEnd) {
  return false
}

module.exports = {
  isNativeAudioAvailable,
  isNativeRecordingActive,
  startNativeRecording,
  stopNativeRecording,
}
