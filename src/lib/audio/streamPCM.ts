export async function startStreamPCM(
  ws: WebSocket,
  onAudioStream: (audioContext: AudioContext, processor: ScriptProcessorNode) => void,
  onError: (err: Error) => void
) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBuffer = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        pcmBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(pcmBuffer.buffer);
      }
    };

    onAudioStream(audioContext, processor);

    return () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach(track => track.stop());
      if (audioContext.state !== 'closed') audioContext.close();
    };
  } catch (err: any) {
    onError(err);
  }
}
