import {
  ConnectionLocation,
  ConnectionQuery,
  ConnectionSave,
  LoginMessage,
  LoginSave,
  UpdateMessage,
  UpdateSave,
} from "@cs124/element-tracker-types"
import { filterPingPongMessages, PongWS } from "@cs125/pingpongws"
import cors from "@koa/cors"
import Router from "@koa/router"
import { OAuth2Client } from "google-auth-library"
import { createHttpTerminator } from "http-terminator"
import Koa from "koa"
import websocket from "koa-easy-ws"
import { Collection, MongoClient } from "mongodb"
import mongodbUri from "mongodb-uri"
import { String } from "runtypes"
import WebSocket from "ws"

const MONGODB = String.check(process.env.MONGODB)
const MONGODB_COLLECTION = String.check(process.env.MONGODB_COLLECTION || "elementTracker")

const router = new Router<Record<string, unknown>, { ws: () => Promise<WebSocket> }>()

const audience = process.env.GOOGLE_CLIENT_IDS?.split(",").map((s) => s.trim()) ?? []
const googleClient = audience.length > 0 && new OAuth2Client()

const { username, database } = mongodbUri.parse(MONGODB)
const client = MongoClient.connect(MONGODB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ...(username && { authMechanism: "SCRAM-SHA-1" }),
})
const _collection = client.then((client) => client.db(database).collection(MONGODB_COLLECTION))

const STATUS = { audience, started: new Date() }

router.get("/", async (ctx) => {
  if (!ctx.ws) {
    ctx.body = STATUS
    return
  }

  const connectionQuery = ConnectionQuery.check(ctx.request.query)
  const { browserID, tabID } = connectionQuery

  const connectionLocation = ConnectionLocation.check({
    origin: ctx.headers.origin,
    browserID,
    tabID,
  })

  const ws = PongWS(await ctx.ws())
  const collection = await _collection
  await collection.insertOne(ConnectionSave.check({ type: "connected", ...connectionLocation, timestamp: new Date() }))

  let email: string | undefined
  ws.addEventListener(
    "message",
    filterPingPongMessages(async ({ data }) => {
      const message = JSON.parse(data.toString())
      if (UpdateMessage.guard(message)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const savedUpdate = UpdateSave.check({
          ...connectionLocation,
          ...message,
          ...(email && { email }),
          timestamp: new Date(),
        })
        await collection.insertOne(savedUpdate)
      } else if (LoginMessage.guard(message)) {
        if (googleClient) {
          const { googleToken: idToken } = message
          try {
            email = (
              await googleClient.verifyIdToken({
                idToken,
                audience,
              })
            )
              .getPayload()
              ?.email?.toLowerCase()
            const savedLogin = LoginSave.check({
              ...connectionLocation,
              type: "login",
              email,
              timestamp: new Date(),
            })
            await collection.insertOne(savedLogin)
          } catch (err) {}
        }
      } else {
        console.error(`Bad message: ${JSON.stringify(message, null, 2)}`)
      }
    })
  )
  ws.addEventListener("close", async () => {
    await collection.insertOne(
      ConnectionSave.check({ type: "disconnected", ...connectionLocation, timestamp: new Date() })
    )
  })
})

const validDomains = process.env.VALID_DOMAINS?.split(",").map((s) => s.trim())
const app = new Koa({ proxy: true })
  .use(
    cors({
      origin: (ctx) => {
        if (!ctx.headers.origin || (validDomains && !validDomains.includes(ctx.headers.origin))) {
          return ""
        } else {
          return ctx.headers.origin
        }
      },
      maxAge: 86400,
    })
  )
  .use(websocket())
  .use(router.routes())
  .use(router.allowedMethods())

_collection.then(async (collection: Collection) => {
  console.log(STATUS)
  const s = app.listen(process.env.ET_PORT ? parseInt(process.env.ET_PORT) : 8888)
  collection.createIndex({ origin: 1, browserID: 1, tabID: 1, timestamp: 1 })
  const terminator = createHttpTerminator({ server: s })
  process.on("SIGTERM", async () => {
    client.then((c) => c.close())
    await terminator.terminate()
  })
})

process.on("uncaughtException", (err) => {
  console.error(err)
})
