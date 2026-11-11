import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Local device media helper.
 * Really requests camera / microphone / screen-share where the browser allows
 * it and exposes the local stream. It does NOT transmit media anywhere — there
 * is no signalling or SFU in this frontend phase, and the UI says so.
 */
export default function useLocalMedia() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const screenRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [error, setError] = useState(null)
  const [devices, setDevices] = useState({ cameras: [], microphones: [] })
  const [permissionState, setPermissionState] = useState('idle')

  const attach = useCallback((stream) => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play?.().catch(() => {})
    }
  }, [])

  const stopAll = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (screenRef.current) {
      screenRef.current.getTracks().forEach((track) => track.stop())
      screenRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setMicOn(false)
    setScreenSharing(false)
  }, [])

  useEffect(() => stopAll, [stopAll])

  const requestMedia = useCallback(
    async ({ video = true, audio = true } = {}) => {
      setError(null)
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('This browser does not expose camera or microphone access. The classroom works without local preview.')
        return null
      }
      setPermissionState('requesting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio })
        stopAll()
        streamRef.current = stream
        attach(stream)
        setCameraOn(video && stream.getVideoTracks().length > 0)
        setMicOn(audio && stream.getAudioTracks().length > 0)
        setPermissionState('granted')

        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices()
          setDevices({
            cameras: allDevices.filter((device) => device.kind === 'videoinput'),
            microphones: allDevices.filter((device) => device.kind === 'audioinput'),
          })
        } catch {
          /* enumerateDevices is optional */
        }
        return stream
      } catch (caught) {
        setPermissionState('denied')
        const message =
          caught?.name === 'NotAllowedError'
            ? 'Camera and microphone permission was declined. You can continue with the simulated classroom.'
            : caught?.name === 'NotFoundError'
              ? 'No camera or microphone was found on this device.'
              : 'The device could not be started. You can continue without local preview.'
        setError(message)
        return null
      }
    },
    [attach, stopAll],
  )

  const toggleCamera = useCallback(async () => {
    if (!streamRef.current) {
      await requestMedia({ video: true, audio: micOn })
      return
    }
    const track = streamRef.current.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setCameraOn(track.enabled)
    } else {
      await requestMedia({ video: true, audio: micOn })
    }
  }, [micOn, requestMedia])

  const toggleMic = useCallback(async () => {
    if (!streamRef.current) {
      await requestMedia({ video: cameraOn, audio: true })
      return
    }
    const track = streamRef.current.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setMicOn(track.enabled)
    } else {
      await requestMedia({ video: cameraOn, audio: true })
    }
  }, [cameraOn, requestMedia])

  const startScreenShare = useCallback(async () => {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen sharing is not supported in this browser.')
      return null
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenRef.current = stream
      setScreenSharing(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play?.().catch(() => {})
      }
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setScreenSharing(false)
        if (streamRef.current) attach(streamRef.current)
        else if (videoRef.current) videoRef.current.srcObject = null
      })
      return stream
    } catch (caught) {
      if (caught?.name !== 'NotAllowedError') setError('Screen sharing could not be started.')
      return null
    }
  }, [attach])

  const stopScreenShare = useCallback(() => {
    if (screenRef.current) {
      screenRef.current.getTracks().forEach((track) => track.stop())
      screenRef.current = null
    }
    setScreenSharing(false)
    if (streamRef.current) attach(streamRef.current)
  }, [attach])

  const testAudio = useCallback(async () => {
    if (typeof window === 'undefined' || !window.AudioContext) {
      setError('Audio testing is not available in this browser.')
      return { peak: 0 }
    }
    const stream = streamRef.current || (await requestMedia({ video: false, audio: true }))
    if (!stream) return { peak: 0 }
    const context = new window.AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    let peak = 0
    const start = Date.now()
    return new Promise((resolve) => {
      const sample = () => {
        analyser.getByteTimeDomainData(data)
        let max = 0
        for (let index = 0; index < data.length; index += 1) {
          max = Math.max(max, Math.abs(data[index] - 128))
        }
        peak = Math.max(peak, max)
        if (Date.now() - start < 1400) requestAnimationFrame(sample)
        else {
          context.close?.()
          resolve({ peak: Math.round((peak / 128) * 100) })
        }
      }
      sample()
    })
  }, [requestMedia])

  return {
    videoRef,
    cameraOn,
    micOn,
    screenSharing,
    error,
    devices,
    permissionState,
    requestMedia,
    toggleCamera,
    toggleMic,
    startScreenShare,
    stopScreenShare,
    stopAll,
    testAudio,
    clearError: () => setError(null),
  }
}
