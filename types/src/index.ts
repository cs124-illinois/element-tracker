import { Array, Boolean, InstanceOf, Literal, Number, Partial, Record, Static, String, Union, Unknown } from "runtypes"

export interface ElementTree extends Element {
  descendants: ElementTree[]
}

export const ConnectionQuery = Record({
  browserID: String,
  tabID: String,
})
export type ConnectionQuery = Static<typeof ConnectionQuery>

export const ConnectionLocation = Record({
  origin: String,
  browserID: String,
  tabID: String,
})
export type ConnectionLocation = Static<typeof ConnectionLocation>

export const ConnectionSave = Union(
  ConnectionLocation,
  Record({
    type: Union(Literal("connected"), Literal("disconnected")),
    timestamp: InstanceOf(Date),
  }),
)
export type ConnectionSave = Static<typeof ConnectionSave>

export const UpdateMessage = Record({
  type: Literal("update"),
  location: Unknown,
  width: Number,
  height: Number,
  elements: Array(
    Record({
      top: Number,
      bottom: Number,
      tagName: String,
    }).And(Partial({ id: String, text: String })),
  ),
}).And(
  Partial({
    visible: Boolean,
    IPv4: String,
    IPv6: String,
  }),
)
export type UpdateMessage = Static<typeof UpdateMessage>

export const UpdateSave = Union(
  ConnectionLocation,
  UpdateMessage,
  Record({
    timestamp: InstanceOf(Date),
  }),
  Partial({
    email: String,
  }),
)
export type UpdateSave = Static<typeof UpdateSave>

export const LoginMessage = Record({
  type: Literal("login"),
  googleToken: String,
})
export type LoginMessage = Static<typeof LoginMessage>

export const LoginSave = Union(
  ConnectionLocation,
  Record({
    type: Literal("login"),
    timestamp: InstanceOf(Date),
    email: String,
  }),
)
export type LoginSave = Static<typeof LoginSave>
