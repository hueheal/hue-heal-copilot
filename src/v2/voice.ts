import { useCallback, useEffect, useRef, useState } from 'react'

/* Voice in and out through the browser itself: speech recognition
   (Chrome, Edge, Safari) for listening, speech synthesis for reading
   replies aloud. No keys, nothing leaves the browser except the text. */

interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null
  start: () => void; stop: () => void; abort: () => void
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined = typeof window !== 'undefined'
  ? ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)
  : undefined

export const voiceSupported = !!Ctor

/** Listen once. `onFinal` gets the whole utterance when the speaker stops. */
export function useVoice(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const finalText = useRef('')
  const cb = useRef(onFinal)
  cb.current = onFinal

  const stop = useCallback(() => { rec.current?.stop() }, [])
  const start = useCallback(() => {
    if (!Ctor) { setError('Voice needs Chrome, Edge or Safari.'); return }
    window.speechSynthesis?.cancel()
    const r = new Ctor()
    r.lang = 'en-GB'; r.interimResults = true; r.continuous = false
    finalText.current = ''
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText.current += res[0].transcript
        else live += res[0].transcript
      }
      setInterim((finalText.current + ' ' + live).trim())
    }
    r.onerror = (e) => { setError(e.error === 'not-allowed' ? 'Allow the microphone for this site to talk to Copilot.' : e.error === 'no-speech' ? null : 'Voice stopped. Try again.') }
    r.onend = () => {
      setListening(false); setInterim('')
      const t = finalText.current.trim()
      if (t) cb.current(t)
    }
    rec.current = r
    setError(null); setListening(true)
    try { r.start() } catch { setListening(false) }
  }, [])

  useEffect(() => () => rec.current?.abort(), [])
  return { listening, interim, error, start, stop }
}

export function speak(text: string) {
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-GB'; u.rate = 1.02
  const gb = synth.getVoices().find((v) => v.lang === 'en-GB' && /natural|premium|enhanced|serena|kate|daniel|google uk/i.test(v.name)) ?? synth.getVoices().find((v) => v.lang === 'en-GB')
  if (gb) u.voice = gb
  synth.speak(u)
}
