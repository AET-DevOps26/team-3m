type TokenProvider = () => string | null
type SigninTrigger = () => Promise<void> | void

let provider: TokenProvider = () => null
let signinTrigger: SigninTrigger = () => {}

export function setAuthTokenProvider(next: TokenProvider): void {
  provider = next
}

export function getAuthToken(): string | null {
  return provider()
}

export function setSigninRedirect(next: SigninTrigger): void {
  signinTrigger = next
}

export function triggerSigninRedirect(): void {
  try {
    void signinTrigger()
  } catch (cause) {
    console.error("signin redirect threw", cause)
  }
}
