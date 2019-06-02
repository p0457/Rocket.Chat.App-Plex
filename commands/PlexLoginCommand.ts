import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexLoginCommand implements ISlashCommand {
  public command = 'plex-login';
  public i18nParamsExample = 'slashcommand_login_params';
  public i18nDescription = 'slashcommand_login_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [username, password] = context.getArguments();

    if (!username || !password) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Incorrect number of arguments!');
      return;
    }

    let url = 'https://plex.tv/users/sign_in.json?user[login]=' + username + '&user[password]=' + password;

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
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    const content = JSON.parse(loginResponse.content);
    const user = content.user;
    token = user.authToken || user.authentication_token || '';
    const userId = user.id;
    const userUuid = user.uuid;
    const userThumbUrl = user.thumb;
    if (!token || token === '') {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Login Failed!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Failed to detect your Plex Token!',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    await persistence.setUserToken(token, context.getSender());
    await persistence.setUserId(userId, context.getSender());
    await persistence.setUserUuid(userUuid, context.getSender());
    await persistence.setUserThumb(userThumbUrl, context.getSender());
    // Now handle setting servers
    url = 'https://plex.tv/pms/servers';
    headers['X-Plex-Token'] = token;
    const serversResponse = await http.get(url, {headers});

    if (serversResponse) {
      if (serversResponse.statusCode === 401) {
        await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom(), persis);
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

          await persistence.setServers(jsonServersObj, context.getSender());

          await msgHelper.sendNotificationSingleAttachment({
            collapsed: false,
            color: '#00CE00',
            thumbnailUrl: userThumbUrl,
            title: {
              value: 'Logged in!',
              link: 'https://app.plex.tv/desktop#!/account',
            },
            // tslint:disable-next-line:max-line-length
            text: '*Id: *' + userId + '\n*Uuid: *' + userUuid + '\n*Token: *' + token + '\n' + '*Server Count: *' + serversObj.length + '\nTo see servers, run `/plex servers`',
          }, read, modify, context.getSender(), context.getRoom());
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
          }, read, modify, context.getSender(), context.getRoom());
        }
      }
    }
  }
}
