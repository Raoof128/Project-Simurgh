export const privacyConfig = {
  // Forbidden — never collected or stored
  collectScreenPixels: false,
  collectWebcamFrames: false,
  collectAudio: false,
  collectPasteContent: false,
  collectTypedContent: false,
  collectBiometrics: false,

  // Allowed — metadata only
  collectPasteLength: true,
  collectFocusEvents: true,
  collectTypingCadence: true,
  collectHelperStatus: true,
  collectDisplayAffinitySignals: true,

  hashStudentIdentifiers: true,
  retentionDays: 30,
  maxKeyIntervalsStored: 200,
};
