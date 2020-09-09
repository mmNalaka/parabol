import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import db from '../../../db'
import {getUserId} from '../../../utils/authorization'
import publish from '../../../utils/publish'
import segmentIo from '../../../utils/segmentIo'
import {GQLContext} from '../../graphql'
import DisconnectSocketPayload from '../../types/DisconnectSocketPayload'
import getRedis from '../../../utils/getRedis'
import {UserPresence} from './connectSocket'
export default {
  name: 'DisconnectSocket',
  description: 'a server-side mutation called when a client disconnects',
  type: DisconnectSocketPayload,
  resolve: async (_source, _args, {authToken, socketId}: GQLContext) => {
    // Note: no server secret means a client could call this themselves & appear disconnected when they aren't!
    const redis = getRedis()

    // AUTH
    if (!socketId) return undefined
    const userId = getUserId(authToken)

    // RESOLUTION
    const user = await db.read('User', userId)
    const {tms} = user
    const userPresence = await redis.lrange(`presence:${userId}`, 0, -1)
    const parsedUserPresence = userPresence.map((socket) => JSON.parse(socket)) as UserPresence[]
    const disconnectingSocket = parsedUserPresence.find((socket) => socket.socketId === socketId)
    if (!disconnectingSocket) {
      throw new Error('Called disconnect without a valid socket')
    }
    await redis.lrem(`presence:${userId}`, 0, JSON.stringify(disconnectingSocket))
    const updatedUserPresence = await redis.lrange(`presence:${userId}`, 0, -1)
    const connectedSockets =
      updatedUserPresence.map((presence) => JSON.parse(presence).socketId) || []
    user.connectedSockets = connectedSockets
    user.lastSeenAtURLs =
      user.lastSeenAtURLs?.filter((url) => url !== disconnectingSocket.lastSeenAtURL) || []

    // If this is the last socket, tell everyone they're offline
    if (connectedSockets.length === 0) {
      const listeningUserIds = new Set()
      for (const teamId of tms) {
        await redis.srem(`team:${teamId}`, userId)
        const teamMembers = await redis.smembers(`team:${teamId}`)
        for (const teamMemberId of teamMembers) {
          listeningUserIds.add(teamMemberId)
        }
      }

      const subOptions = {mutatorId: socketId}
      user.lastSeenAtURLs = null
      const data = {user}
      const listeningUserIdsArr = Array.from(listeningUserIds) as string[]
      listeningUserIdsArr.forEach((onlineUserId) => {
        publish(
          SubscriptionChannel.NOTIFICATION,
          onlineUserId,
          'DisconnectSocketPayload',
          data,
          subOptions
        )
      })
    }
    segmentIo.track({
      userId,
      event: 'Disconnect WebSocket',
      properties: {
        connectedSockets,
        socketId,
        tms
      }
    })
    return {user}
  }
}
