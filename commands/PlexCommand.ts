import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import { sendNotification } from '../lib/helpers/sendNotification';
import { formatServerText } from '../lib/helpers/textFormatting';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

enum Command {
  Login = 'login',
  SetServers = 'set-servers',
  Servers = 'servers',
  Server = 'server',
}

export class PlexCommand implements ISlashCommand {
  public command = 'plex';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [command] = context.getArguments();

    switch (command) {
      case Command.Login:
        await this.processLoginCommand(context, read, modify, http, persis);
        break;
        case Command.SetServers:
          await this.processSetServersCommand(context, read, modify, http, persis);
          break;
          case Command.Servers:
            await this.processServersCommand(context, read, modify, http, persis);
            break;
          case Command.Server:
            await this.processServerCommand(context, read, modify, http, persis);
            break;
    }
  }

  private async processLoginCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, username, password] = context.getArguments();

    if (!username || !password) {
      await sendNotification('Usage: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const url = 'https://plex.tv/users/sign_in.json?user[login]=' + username + '&user[password]=' + password;

    const loginResponse = await http.post(url, {
      headers: defaultHeaders,
    });

    let token;
    if (loginResponse && loginResponse.statusCode === 201 && loginResponse.content) {
      const content = JSON.parse(loginResponse.content);
      const user = content.user;
      token = user.authToken || user.authentication_token || '';
      const userId = user.id;
      const userUuid = user.uuid;
      const userThumbUrl = user.thumb;
      if (token && token !== '') {
        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        await persistence.setUserToken(token, context.getSender());
        await persistence.setUserId(userId, context.getSender());
        await persistence.setUserUuid(userUuid, context.getSender());
        await persistence.setUserThumb(userThumbUrl, context.getSender());
        await sendNotification('Successfully logged in and stored your Plex Token!', read, modify, context.getSender(), context.getRoom());
      } else {
        await sendNotification('Failed to detect your Plex Token!', read, modify, context.getSender(), context.getRoom());
      }
    } else {
      await sendNotification('Failed to login to Plex!', read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processSetServersCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const token = await persistence.getUserToken(context.getSender());
    if (!token) {
      // tslint:disable-next-line:max-line-length
      await sendNotification('No token detected! Please login first using `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
    } else {
      const url = 'https://plex.tv/pms/servers';
      const headers = defaultHeaders;
      headers['X-Plex-Token'] = token;
      const response = await http.get(url, {headers});
      if (response) {
        if (response.statusCode === 401) {
          // tslint:disable-next-line:max-line-length
          await sendNotification('Plex Token has expired! Please login again using `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
        } else if (response.statusCode === 200 && response.content) {
          try {
            const content = response.content;
            // console.log('****1', content);
            const regex = new RegExp('(?<=<Server )(.*?)(?=\/>)', 'gm');

            const servers = new Array<string>();
            let m;
            // tslint:disable-next-line:no-conditional-assignment
            while ((m = regex.exec(content)) !== null) {
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

              const serverObj = {
                accessToken, name, address, port, version, scheme, sourceTitle, ownerId, owned,
              };

              serversObj.push(serverObj);
            });
            const jsonServersObj = JSON.stringify(serversObj);

            await persistence.setServers(jsonServersObj, context.getSender());

            await sendNotification('Successfully set servers. To see servers, run `/plex servers`', read, modify, context.getSender(), context.getRoom());
          } catch (e) {
            console.error('Failed to parse servers!', e);
            await sendNotification('Failed to parse servers!', read, modify, context.getSender(), context.getRoom());
          }
        }
      }
    }
  }

  private async processServersCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await sendNotification('No servers stored! Use the following command to set the servers: `/plex set-servers`', read, modify, context.getSender(), context.getRoom());
    } else {
      try {
        const serversList = JSON.parse(servers);
        if (serversList && Array.isArray(serversList)) {
          let text = '';
          serversList.forEach((server) => {
            text += formatServerText(server);
          });

          // tslint:disable-next-line:max-line-length
          await sendNotification(text, read, modify, context.getSender(), context.getRoom());
        }
      } catch (e) {
        // tslint:disable-next-line:max-line-length
        await sendNotification('No servers stored! Use the following command to set the servers: `/plex set-servers`', read, modify, context.getSender(), context.getRoom());
      }
    }
  }

  private async processServerCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, serverArg] = context.getArguments();
    if (!serverArg) {
      await sendNotification('Usage: `/plex server [SERVER NAME]`', read, modify, context.getSender(), context.getRoom());
    } else {
      const persistence = new AppPersistence(persis, read.getPersistenceReader());
      const servers = await persistence.getUserServers(context.getSender());
      if (!servers) {
        // tslint:disable-next-line:max-line-length
        await sendNotification('No servers stored! Use the following command to set the servers: `/plex set-servers`', read, modify, context.getSender(), context.getRoom());
      } else {
        try {
          let serverChosen;
          let serverFound = false;
          const serversList = JSON.parse(servers);
          if (serversList && Array.isArray(serversList)) {
            serversList.forEach((server) => {
              if (!serverFound && server.name.toLowerCase().indexOf(serverArg.toLowerCase()) !== -1) {
                serverChosen = server;
                serverFound = true;
              }
            });

            let text = '';
            if (serverFound && serverFound === true) {
              text = '*Query:* `' + serverArg + '`\n*Result:* ';
              text += formatServerText(serverChosen, false);
            } else {
              text = 'Server Name not found for query `' + serverArg + '`!';
            }

            await sendNotification(text, read, modify, context.getSender(), context.getRoom());
          }
        } catch (e) {
          // tslint:disable-next-line:max-line-length
          await sendNotification('Error searching for server!', read, modify, context.getSender(), context.getRoom());
        }
      }
    }
  }
}
