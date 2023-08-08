import {
  ConnectionLocation,
  ConnectionQuery,
  ConnectionSave,
  LoginMessage,
  LoginSave,
  UpdateMessage,
  UpdateSave,
} from "@cs124/element-tracker-types"
import { PongWS, filterPingPongMessages } from "@cs124/pingpongws-server"
import cors from "@koa/cors"
import Router from "@koa/router"
import hkdf from "@panva/hkdf"
import { OAuth2Client } from "google-auth-library"
import { jwtDecrypt } from "jose"
import Koa from "koa"
import websocket from "koa-easy-ws"
import log4js from "log4js"
import { MongoClient } from "mongodb"
import mongodbUri from "mongodb-uri"
import { String } from "runtypes"
import WebSocket from "ws"

const MONGODB = String.check(process.env.MONGODB)
const MONGODB_COLLECTION = String.check(process.env.MONGODB_COLLECTION || "elementTracker")

const router = new Router<Record<string, unknown>, { ws: () => Promise<WebSocket> }>()

const audience = process.env.GOOGLE_CLIENT_IDS?.split(",").map((s) => s.trim()) ?? []
const googleClient = audience.length > 0 && new OAuth2Client()

const { database } = mongodbUri.parse(MONGODB)
const client = MongoClient.connect(MONGODB)
const _collection = client.then((client) => client.db(database).collection(MONGODB_COLLECTION))

const STATUS = { what: "element-tracker", started: new Date(), heartbeat: undefined as unknown as Date }

export const logger = log4js.getLogger()

const ENCRYPTION_KEY =
  process.env.SECRET && hkdf("sha256", process.env.SECRET, "", "NextAuth.js Generated Encryption Key", 32)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const decryptToken = async (ctx: Koa.Context): Promise<string | undefined> => {
  const encryptionKey = await ENCRYPTION_KEY
  if (encryptionKey === undefined || ctx.email) {
    return
  }
  const cookieName = process.env.SECURE_COOKIE ? "__Secure-next-auth.session-token" : "next-auth.session-token"
  const token = ctx.cookies.get(cookieName)
  if (token) {
    try {
      const encryptionKey = await ENCRYPTION_KEY
      const {
        payload: { email },
      } = await jwtDecrypt(token, encryptionKey as Uint8Array, { clockTolerance: 15 })
      return email as string
    } catch (err) {
      //
    }
  }
  return
}

router.get("/", async (ctx: Koa.Context) => {
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

  let email = await decryptToken(ctx)

  const ws = PongWS(await ctx.ws(), {
    logDisconnects: true,
    logIdentifier: () => email || tabID,
    useOtherMessages: true,
    interval: 32 * 1024,
    timeout: 16 * 1024,
  })
  const collection = await _collection

  await collection.insertOne(
    ConnectionSave.check({ type: "connected", ...connectionLocation, timestamp: new Date(), ...(email && { email }) }),
  )

  STATUS.heartbeat = new Date()
  ws.addEventListener(
    "message",
    filterPingPongMessages(async ({ data }) => {
      const message = JSON.parse(data.toString())
      if (UpdateMessage.guard(message)) {
        STATUS.heartbeat = new Date()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const savedUpdate = UpdateSave.check({
          ...connectionLocation,
          ...message,
          ...(email && { email }),
          timestamp: new Date(),
        })
        await collection.insertOne(savedUpdate)
      } else if (LoginMessage.guard(message)) {
        STATUS.heartbeat = new Date()
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
    }),
  )
  ws.addEventListener("close", async () => {
    await collection.insertOne(
      ConnectionSave.check({ type: "disconnected", ...connectionLocation, timestamp: new Date() }),
    )
  })
  ws.on("error", console.error)
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
    }),
  )
  .use(websocket())
  .use(router.routes())
  .use(router.allowedMethods())

_collection.then(async () => {
  logger.level = process.env.DEVELOPMENT ? "DEBUG" : "INFO"
  logger.info(STATUS)

  const server = app.listen(process.env.ET_PORT ? parseInt(process.env.ET_PORT) : 8888)
  server.requestTimeout = 0
  server.headersTimeout = 0
})

process.on("uncaughtException", (err) => {
  console.error(err)
  process.exit(-1)
})
