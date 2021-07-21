import { ClientIDProvider } from "@cs124/client-id"
import { ElementTracker, ElementTrackerServer, UpdateHash } from "@cs124/element-tracker"
import { GoogleLoginProvider, useGoogleLogin, WithGoogleTokens } from "@cs124/react-google-login"

const LoginButton: React.FC = () => {
  const { isSignedIn, auth, ready } = useGoogleLogin()
  if (!ready) {
    return null
  }
  return (
    <button onClick={() => (isSignedIn ? auth?.signOut() : auth?.signIn())}>{isSignedIn ? "Signout" : "Signin"}</button>
  )
}
const ElementTrackerDemo: React.FC = () => {
  return (
    <>
      <h1>Testing</h1>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i}>
          <h2 id={`h2_${i}`} data-et={true}>{i}</h2>
          <p>
            {Array.from({ length: 128 }).map((_, i) => (
              <span key={i}>{i} </span>
            ))}
          </p>
        </div>
      ))}
    </>
  )
}

export default function Home() {
  return (
    <ClientIDProvider>
      <GoogleLoginProvider clientConfig={{ client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string }}>
        <WithGoogleTokens>
          {({ idToken }) => (
            <ElementTrackerServer googleToken={idToken} server={process.env.NEXT_PUBLIC_ET_SERVER as string}>
              <ElementTracker>
                <UpdateHash />
                <h2>Element Tracker Demo</h2>
                <div style={{ marginBottom: 8 }}>
                  <LoginButton />
                </div>
              </ElementTracker>
              <ElementTrackerDemo />
            </ElementTrackerServer>
          )}
        </WithGoogleTokens>
      </GoogleLoginProvider>
    </ClientIDProvider>
  )
}
