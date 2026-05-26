type TokenProvider = () => string | null
type SigninTrigger = () => Promise<void> | void

let provider: TokenProvider = () => null
let signinTrigger: SigninTrigger = () => {}
let signinRedirectPromise: Promise<void> | null = null

export function setAuthTokenProvider(next: TokenProvider): void {
  provider = next
}

export function getAuthToken(): string | null {
  return provider()
}

export function setSigninRedirect(next: SigninTrigger): void {
  signinTrigger = next
}

export function triggerSigninRedirect(): Promise<void> {
  if (signinRedirectPromise !== null) {
    return signinRedirectPromise
  }

  signinRedirectPromise = Promise.resolve()
    .then(() => signinTrigger())
    .catch((cause: unknown) => {
      console.error("signin redirect threw", cause)
    })
    .finally(() => {
      signinRedirectPromise = null
    })

  return signinRedirectPromise
}
