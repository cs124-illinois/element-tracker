import { ClientIDProvider } from "@cs124/client-id"
import { ElementTracker, ElementTrackerServer, UpdateHash } from "@cs124/element-tracker"

const ElementTrackerDemo: React.FC = () => {
  return (
    <>
      <h1>Testing</h1>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i}>
          <h2 id={`h2_${i}`} data-et={true}>
            {i}
          </h2>
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
      <ElementTrackerServer server={process.env.NEXT_PUBLIC_ET_SERVER as string}>
        <ElementTracker>
          <UpdateHash />
          <h2>Element Tracker Demo</h2>
        </ElementTracker>
        <ElementTrackerDemo />
      </ElementTrackerServer>
    </ClientIDProvider>
  )
}
