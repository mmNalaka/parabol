import {GraphQLID, GraphQLNonNull, GraphQLString} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import {CHECKIN} from 'parabol-client/utils/constants'
import convertToTaskContent from 'parabol-client/utils/draftjs/convertToTaskContent'
import {makeCheckinQuestion} from 'parabol-client/utils/makeCheckinGreeting'
import normalizeRawDraftJS from 'parabol-client/validation/normalizeRawDraftJS'
import getRethink from '../../database/rethinkDriver'
import CheckInPhase from '../../database/types/CheckInPhase'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import UpdateNewCheckInQuestionPayload from '../types/UpdateNewCheckInQuestionPayload'

export default {
  type: UpdateNewCheckInQuestionPayload,
  description: "Update a Team's Icebreaker in a new meeting",
  args: {
    meetingId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'ID of the Team which will have its Icebreaker updated'
    },
    checkInQuestion: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The Team's new Icebreaker"
    }
  },
  async resolve(
    _source,
    {meetingId, checkInQuestion},
    {authToken, dataLoader, socketId: mutatorId}
  ) {
    const r = await getRethink()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}
    const now = new Date()
    const viewerId = getUserId(authToken)

    // AUTH
    const meeting = await r
      .table('NewMeeting')
      .get(meetingId)
      .run()
    if (!meeting) return standardError(new Error('Meeting not found'), {userId: viewerId})
    const {phases, teamId} = meeting
    if (!isTeamMember(authToken, teamId)) {
      return standardError(new Error('Team not found'), {userId: viewerId})
    }

    // VALIDATION
    const normalizedCheckInQuestion = checkInQuestion
      ? normalizeRawDraftJS(checkInQuestion)
      : convertToTaskContent(makeCheckinQuestion(Math.floor(Math.random() * 1000), teamId))

    // RESOLUTION
    const checkInPhase = phases.find((phase) => phase.phaseType === CHECKIN) as CheckInPhase

    // mutative
    checkInPhase.checkInQuestion = normalizedCheckInQuestion
    await r
      .table('NewMeeting')
      .get(meetingId)
      .update({
        phases,
        updatedAt: now
      })
      .run()

    const data = {meetingId}
    publish(
      SubscriptionChannel.MEETING,
      meetingId,
      'UpdateNewCheckInQuestionPayload',
      data,
      subOptions
    )
    return data
  }
}
