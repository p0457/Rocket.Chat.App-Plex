import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import {
    IUIKitViewSubmitIncomingInteraction,
} from '@rocket.chat/apps-engine/definition/uikit/UIKitIncomingInteractionTypes';
import { AppPersistence } from '../persistence';
import * as msgHelper from './messageHelper';
import defaultHeaders from './defaultHeaders';

export async function login(data: IUIKitViewSubmitIncomingInteraction, read: IRead, modify: IModify, http: IHttp, persis: IPersistence, uid: string): Promise<void> {
  const { view: { id } } = data;
  const { state }: {
    state?: any;
  } = data.view;

  const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, id);
  const [record] = await read.getPersistenceReader().readByAssociation(association) as Array<{
    room: IRoom;
  }>;
  const user: IUser = await read.getUserReader().getById(uid);
  const room: IRoom = record.room;

  const plexUsername = state.plexlogin.username;
  const plexPassword = state.plexpassword.password;

  let url = `https://plex.tv/users/sign_in.json?user[login]=${plexUsername}&user[password]=${plexPassword}`;

  const headers = defaultHeaders;

  const loginResponse = await http.post(url, {headers});

  let token;
  if (!loginResponse || loginResponse.statusCode !== 201 || !loginResponse.content) {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Login Failed!',
        link: 'https://app.plex.tv/desktop#!/account',
      },
      text: 'Failed login to Plex!',
    }, read, modify, user, room);
    return;
  }

  const content = JSON.parse(loginResponse.content);
  const plexUser = content.user;
  token = plexUser.authToken || plexUser.authentication_token || '';
  const userId = plexUser.id;
  const userUuid = plexUser.uuid;
  const userThumbUrl = plexUser.thumb;
  if (!token || token === '') {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Login Failed!',
        link: 'https://app.plex.tv/desktop#!/account',
      },
      text: 'Failed to detect your Plex Token!',
    }, read, modify, user, room);
    return;
  }

  const persistence = new AppPersistence(persis, read.getPersistenceReader());
  await persistence.setUserToken(token, user);
  await persistence.setUserId(userId, user);
  await persistence.setUserUuid(userUuid, user);
  await persistence.setUserThumb(userThumbUrl, user);
  // Now handle setting servers
  url = 'https://plex.tv/pms/servers';
  headers['X-Plex-Token'] = token;
  const serversResponse = await http.get(url, {headers});

  if (serversResponse) {
    if (serversResponse.statusCode === 401) {
      await msgHelper.sendTokenExpired(read, modify, user, room, persis);
      return;
    }
    if (serversResponse.statusCode === 200 && serversResponse.content) {
      try {
        const serverContent = serversResponse.content;
        const regex = new RegExp('(?<=<Server )(.*?)(?=\/>)', 'gm');

        const servers = new Array<string>();
        let m;
        // tslint:disable-next-line:no-conditional-assignment
        while ((m = regex.exec(serverContent)) !== null) {
          // This is necessary to avoid infinite loops with zero-width matches
          if (m.index === regex.lastIndex) {
            regex.lastIndex++;
          }
          // The result can be accessed through the `m`-variable.
          m.forEach((match, groupIndex) => {
            if (groupIndex === 1) {
              servers.push(match);
            }
          });
        }

        const serversObj = new Array<object>();
        servers.forEach(async (server) => {
          const accessTokenRegex = new RegExp('accessToken="(.*?)"', 'gm');
          const accessTokenResult = accessTokenRegex.exec(server);
          let accessToken;
          if (accessTokenResult && accessTokenResult.length >= 2) {
            accessToken = accessTokenResult[1];
          }

          const nameRegex = new RegExp('name="(.*?)"', 'gm');
          const nameResult = nameRegex.exec(server);
          let name;
          if (nameResult && nameResult.length >= 2) {
            name = nameResult[1];
          }

          const addressRegex = new RegExp('address="(.*?)"', 'gm');
          const addressResult = addressRegex.exec(server);
          let address;
          if (addressResult && addressResult.length >= 2) {
            address = addressResult[1];
          }

          const portRegex = new RegExp('port="(.*?)"', 'gm');
          const portResult = portRegex.exec(server);
          let port;
          if (portResult && portResult.length >= 2) {
            port = portResult[1];
          }

          const versionRegex = new RegExp('version="(.*?)"', 'gm');
          const versionResult = versionRegex.exec(server);
          let version;
          if (versionResult && versionResult.length >= 2) {
            version = versionResult[1];
          }

          const schemeRegex = new RegExp('scheme="(.*?)"', 'gm');
          const schemeResult = schemeRegex.exec(server);
          let scheme;
          if (schemeResult && schemeResult.length >= 2) {
            scheme = schemeResult[1];
          }

          const sourceTitleRegex = new RegExp('sourceTitle="(.*?)"', 'gm');
          const sourceTitleResult = sourceTitleRegex.exec(server);
          let sourceTitle;
          if (sourceTitleResult && sourceTitleResult.length >= 2) {
            sourceTitle = sourceTitleResult[1];
          }

          const ownerIdRegex = new RegExp('ownerId="(.*?)"', 'gm');
          const ownerIdResult = ownerIdRegex.exec(server);
          let ownerId;
          if (ownerIdResult && ownerIdResult.length >= 2) {
            ownerId = ownerIdResult[1];
          }

          const ownedRegex = new RegExp('owned="(.*?)"', 'gm');
          const ownedResult = ownedRegex.exec(server);
          let owned = false;
          if (ownedResult && ownedResult.length >= 2) {
            if (ownedResult[1] === '1') {
              owned = true;
            }
          }

          const machineIdRegex = new RegExp('machineIdentifier="(.*?)"', 'gm');
          const machineIdResult = machineIdRegex.exec(server);
          let machineId;
          if (machineIdResult && machineIdResult.length >= 2) {
            machineId = machineIdResult[1];
          }

          const serverObj = {
            accessToken, name, address, port, version, scheme, sourceTitle, ownerId, owned, machineId,
          };

          serversObj.push(serverObj);
        });
        const jsonServersObj = JSON.stringify(serversObj);

        await persistence.setServers(jsonServersObj, user);

        await msgHelper.sendNotificationSingleAttachment({
          collapsed: false,
          color: '#00CE00',
          thumbnailUrl: userThumbUrl,
          title: {
            value: 'Logged in!',
            link: 'https://app.plex.tv/desktop#!/account',
          },
          actions: [
            {
              type: MessageActionType.BUTTON,
              text: 'View Servers',
              msg: '/plex-servers ',
              msg_in_chat_window: true,
              msg_processing_type: MessageProcessingType.RespondWithMessage,
            },
          ],
          // tslint:disable-next-line:max-line-length
          text: '*Id: *' + userId + '\n*Uuid: *' + userUuid + '\n*Token: *' + token + '\n' + '*Server Count: *' + serversObj.length,
        }, read, modify, user, room);
      } catch (e) {
        console.error('Failed to parse servers!', e);
        await msgHelper.sendNotificationSingleAttachment({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'Failed to set servers!',
            link: 'https://app.plex.tv/desktop#!/account',
          },
          text: 'Logged in, but failed to parse server call from API.',
        }, read, modify, user, room);
      }
    }
  }
}