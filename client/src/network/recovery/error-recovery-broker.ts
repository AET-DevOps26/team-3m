import type { RecoverableError } from "../errors"

type Listener = (error: RecoverableError) => void

const listeners = new Set<Listener>()

export function publishRecoverableError(error: RecoverableError): void {
  for (const listener of listeners) {
    try {
      listener(error)
    } catch (cause) {
      console.error("recoverable error listener threw", cause)
    }
  }
}

export function subscribeToRecoverableErrors(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
