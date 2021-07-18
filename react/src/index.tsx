import { useClientID } from "@cs124/client-id"
import { ConnectionQuery, ElementTree, LoginMessage, UpdateMessage } from "@cs124/element-tracker-types"
import { PingWS } from "@cs125/pingpongws"
import "intersection-observer"
import queryString from "query-string"
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react"
import ReconnectingWebSocket from "reconnecting-websocket"
import { debounce, throttle } from "throttle-debounce"

interface ElementTrackerServerContext {
  available: boolean
  report: (elements: Element[]) => void
  getElements: () => Element[]
}
const ElementTrackerServerContext = createContext<ElementTrackerServerContext>({
  available: false,
  report: () => {
    throw Error("ElementTrackerServerContext not defined")
  },
  getElements: () => {
    throw Error("ElementTrackerServerContext not defined")
  },
})

export interface ElementTrackerServerProps {
  server?: string
  googleToken?: string
  reportInterval?: number
  elementSelector?: string
  children: ReactNode
}
export const ElementTrackerServer: React.FC<ElementTrackerServerProps> = ({
  server,
  googleToken,
  elementSelector = "h1,h2,h3,h4,h5,h6,[data-et]",
  reportInterval = 1000,
  children,
}) => {
  const [browserID, setBrowserID] = useState<string | undefined>()
  const [tabID, setTabID] = useState<string | undefined>()
  const IPv4 = useRef<string | undefined>()
  const IPv6 = useRef<string | undefined>()
  const clientID = useClientID()
  useEffect(() => {
    setBrowserID(clientID.browserID)
    setTabID(clientID.tabID)
    IPv4.current = clientID.IPv4
    IPv6.current = clientID.IPv6
  }, [clientID])

  const connection = useRef<ReconnectingWebSocket | undefined>(undefined)

  useEffect(() => {
    connection.current?.close()
    if (!server || !browserID || !tabID) {
      connection.current = undefined
      return
    }
    const connectionQuery = ConnectionQuery.check({
      browserID: browserID,
      tabID: tabID,
    })
    connection.current = PingWS(
      new ReconnectingWebSocket(`${server}?${queryString.stringify(connectionQuery)}`, [], { startClosed: true })
    )
    connection.current.reconnect()
    return (): void => {
      connection.current?.close()
      connection.current = undefined
    }
  }, [server, browserID, tabID])

  useEffect(() => {
    if (!googleToken) {
      return
    }
    const login = LoginMessage.check({
      type: "login",
      googleToken,
    })
    connection.current?.send(JSON.stringify(login))
  }, [connection, googleToken])

  // Passing an inline function here does not work.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const report = useCallback(
    throttle(reportInterval, (es: Element[]) => {
      const elements = es.map((element) => {
        const { tagName } = element
        const { top, bottom } = element.getBoundingClientRect()
        const id = element.getAttribute("data-et-id") || element.id
        const text = element.textContent
        return {
          tagName: tagName.toLowerCase(),
          top,
          bottom,
          ...(id && { id }),
          ...(text && { text }),
        }
      })
      const { top, bottom } = window.document.body.getBoundingClientRect()
      const update = UpdateMessage.check({
        type: "update",
        browserID: browserID,
        tabID: tabID,
        location: window.location,
        width: window.innerWidth,
        height: window.innerHeight,
        top,
        bottom,
        elements,
        visible: document.visibilityState === "visible",
        ...(IPv4.current && { IPv4: IPv4.current }),
        ...(IPv6.current && { IPv6: IPv6.current }),
      })
      connection.current?.send(JSON.stringify(update))
    }),
    [reportInterval, browserID, tabID]
  )

  const getElements = useCallback(
    () =>
      (Array.from(document.querySelectorAll(elementSelector)) || []).filter(
        (e) => (e.getAttribute("data-et-id") || e.id).length > 0
      ),
    [elementSelector]
  )

  return (
    <ElementTrackerServerContext.Provider value={{ available: true, report, getElements }}>
      {children}
    </ElementTrackerServerContext.Provider>
  )
}

export interface ElementTrackerContext {
  elements: Element[]
  updateElements?: () => void
  clearElements?: () => void
}
export const ElementTrackerContext = createContext<ElementTrackerContext>({
  elements: [],
})

export interface ElementTrackerProps {
  children: React.ReactNode
}
export const ElementTracker: React.FC<ElementTrackerProps> = ({ children }) => {
  const { report, getElements } = useContext(ElementTrackerServerContext)

  const [tracked, setTracked] = useState<Element[]>([])
  const [elements, setElements] = useState<Element[]>([])

  const elementsCopy = useRef<Element[]>([])
  useEffect(() => {
    elementsCopy.current = elements
  }, [elements])

  const updateElements = useCallback(() => {
    const newElements = getElements()
    setElements(newElements)
    report(newElements)
  }, [report, getElements])

  // Passing an inline function here does not work.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledUpdateElements = useCallback(throttle(100, updateElements), [report])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const delayedUpdateElements = useCallback(debounce(100, updateElements), [report])

  useEffect(() => {
    setTracked(getElements())
    updateElements()
    const mutationObserver = new MutationObserver(() => setTracked(getElements()))
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    return (): void => {
      setElements([])
      mutationObserver.disconnect()
    }
  }, [updateElements, getElements])

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver(throttledUpdateElements)
    tracked.forEach((element) => intersectionObserver.observe(element))
    return (): void => {
      intersectionObserver.disconnect()
    }
  }, [tracked, throttledUpdateElements])

  useEffect(() => {
    window.addEventListener("scroll", delayedUpdateElements)
    window.addEventListener("resize", delayedUpdateElements)
    window.addEventListener("hashchange", delayedUpdateElements)
    return (): void => {
      window.removeEventListener("scroll", delayedUpdateElements)
      window.removeEventListener("resize", delayedUpdateElements)
      window.removeEventListener("hashchange", delayedUpdateElements)
    }
  }, [delayedUpdateElements])

  const clearElements = useCallback(() => setElements([]), [])

  useEffect(() => {
    const listener = () => {
      report(elementsCopy.current)
    }
    document.addEventListener("visibilitychange", listener)
    return () => {
      document.removeEventListener("visibilitychange", listener)
    }
  }, [report])

  return (
    <ElementTrackerContext.Provider value={{ elements, updateElements, clearElements }}>
      {children}
    </ElementTrackerContext.Provider>
  )
}

export const useElementTracker = (): ElementTrackerContext => {
  return useContext(ElementTrackerContext)
}

export const elementListToTree = (elements: Element[]): ElementTree[] => {
  const elementTree: ElementTree[] = []
  let elementLogger: string[] = []
  elements.forEach((e) => {
    const element = { ...e, descendants: [] } as ElementTree
    if (elementTree.length == 0) {
      elementTree.push(element)
    } else {
      let level = elementLogger.indexOf(element.tagName)
      if (level == -1) {
        level = elementLogger.length
      } else {
        elementLogger = elementLogger.slice(0, level)
      }
      const getChildrenArray = (tree: ElementTree[], depth: number): ElementTree[] => {
        if (depth == 0) return tree
        else return getChildrenArray(tree[tree.length - 1].descendants, depth - 1)
      }
      getChildrenArray(elementTree, level).push(element)
    }
    elementLogger.push(element.tagName)
  })
  return elementTree
}

export const atTop = (): boolean => (document.documentElement.scrollTop || document.body.scrollTop) === 0
export function atBottom(): boolean {
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  )
  return (document.documentElement.scrollTop || document.body.scrollTop) + window.innerHeight === documentHeight
}

export function active<T extends Element>(elements: Array<T>, windowTop = 0): T | undefined {
  if (elements.length === 0) {
    return undefined
  } else if (elements.length === 1) {
    return elements[0]
  }

  if (atBottom() && window.location.hash) {
    const lookingFor = window.location.hash.substring(1)
    const hashedComponent = elements.find((e) => e.id === lookingFor || e.getAttribute("data-et-id") === lookingFor)
    if (hashedComponent && hashedComponent.getBoundingClientRect().top >= windowTop) {
      return hashedComponent
    }
  }

  const visible: T[] = []
  const above: T[] = []
  const below: T[] = []
  elements.forEach((e) => {
    const { top, bottom } = e.getBoundingClientRect()
    if (top >= windowTop && top < window.innerHeight && bottom >= windowTop && bottom < window.innerHeight) {
      visible.push(e)
    } else if (top < windowTop) {
      above.push(e)
    } else {
      below.push(e)
    }
  })
  if (visible.length > 0) {
    return visible[0]
  } else if (above.length > 0) {
    return above[above.length - 1]
  } else {
    return below[0]
  }
}

export interface UpdateHashProps {
  filter?: (element: Element) => boolean
  top?: number
}
export const UpdateHash: React.FC<UpdateHashProps> = ({ filter = (): boolean => true, top = 0 }) => {
  const hash = useRef<string>((typeof window !== "undefined" && window.location.hash) || " ")

  const setHash = useCallback((newHash: string) => {
    if (hash.current !== newHash) {
      hash.current = newHash
      window.history.replaceState({}, "", newHash)
    }
  }, [])

  const { elements } = useElementTracker()

  useEffect(() => {
    if (atTop() && atBottom()) {
      return
    }
    if (atTop() && !atBottom()) {
      setHash(" ")
      return
    }
    const activeHash =
      elements &&
      active(
        elements.filter((c) => filter(c)),
        top
      )
    if (!activeHash) {
      setHash(" ")
      return
    }
    const id = activeHash.getAttribute("data-et-id") || activeHash.id
    id && setHash(`#${id}`)
  }, [filter, elements, top, setHash])

  useEffect(() => {
    const hashListener = (): void => {
      hash.current = window.location.hash || " "
    }
    window.addEventListener("hashchange", hashListener)
    return (): void => {
      window.removeEventListener("hashchange", hashListener)
    }
  }, [])

  return null
}
