import { Array, Boolean, InstanceOf, Literal, Number, Object, Static, String, Union, Unknown } from "runtypes"

export interface ElementTree extends Element {
  descendants: ElementTree[]
}

export const ConnectionQuery = Object({
  browserID: String,
  tabID: String,
})
export type ConnectionQuery = Static<typeof ConnectionQuery>

export const ConnectionLocation = Object({
  origin: String,
  browserID: String,
  tabID: String,
})
export type ConnectionLocation = Static<typeof ConnectionLocation>

export const ConnectionSave = Union(
  ConnectionLocation,
  Object({
    type: Union(Literal("connected"), Literal("disconnected")),
    timestamp: InstanceOf(Date),
  }),
)
export type ConnectionSave = Static<typeof ConnectionSave>

export const UpdateMessage = Object({
  type: Literal("update"),
  location: Unknown,
  width: Number,
  height: Number,
  elements: Array(
    Object({
      top: Number,
      bottom: Number,
      tagName: String,
      id: String.optional(),
      text: String.optional(),
    }),
  ),
  visible: Boolean.optional(),
  IPv4: String.optional(),
  IPv6: String.optional(),
})
export type UpdateMessage = Static<typeof UpdateMessage>

export const UpdateSave = Union(
  ConnectionLocation,
  UpdateMessage,
  Object({
    timestamp: InstanceOf(Date),
    email: String.optional(),
  }),
)
export type UpdateSave = Static<typeof UpdateSave>

export const LoginMessage = Object({
  type: Literal("login"),
  googleToken: String,
})
export type LoginMessage = Static<typeof LoginMessage>

export const LoginSave = Union(
  ConnectionLocation,
  Object({
    type: Literal("login"),
    timestamp: InstanceOf(Date),
    email: String,
  }),
)
export type LoginSave = Static<typeof LoginSave>
