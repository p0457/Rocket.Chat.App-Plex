import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import { getMediaTypes } from '../lib/helpers/mediaTypes';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

enum Command {
  Help = 'help',
  Login = 'login',
  Servers = 'servers',
  Server = 'server',
  Search = 'search',
  MediaTypes = 'mediatypes',
  OnDeck = 'on-deck',
  Sessions = 'sessions',
  Devices = 'devices',
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
      case Command.Help:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
      case Command.Login:
        await this.processLoginCommand(context, read, modify, http, persis);
        break;
      case Command.Servers:
        await this.processServersCommand(context, read, modify, http, persis);
        break;
      case Command.Server:
        await this.processServerCommand(context, read, modify, http, persis);
        break;
      case Command.Search:
        await this.processSearchCommand(context, read, modify, http, persis);
        break;
      case Command.MediaTypes:
        await this.processMediaTypesCommand(context, read, modify, http, persis);
        break;
      case Command.OnDeck:
        await this.processOnDeckCommand(context, read, modify, http, persis);
        break;
      case Command.Sessions:
        await this.processSessionsCommand(context, read, modify, http, persis);
        break;
      case Command.Devices:
        await this.processDevicesCommand(context, read, modify, http, persis);
        break;
      default:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
    }
  }

  private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Plex App Help Commands',
      },
      text: '`/plex help`\n>Show this help menu\n'
        + '`/plex login [USERNAME] [PASSWORD]`\n>Login to Plex\n'
        + '`/plex servers`\n>Show all Plex Media Servers authorized to your Plex account\n'
        + '`/plex server [SERVER NAME]`\n>Search for a Plex Server authorized to your Plex account by name\n'
        // tslint:disable-next-line:max-line-length
        + '`/plex search [SERVER NAME] (mediatype) [QUERY]`\n>Search for media using the Plex Server name provided (can be a partial name)\n'
        + '`/plex on-deck [SERVER NAME]`\n>Shows what is On Deck using the Plex Server name provided (can be a partial name)\n'
        + '`/plex sessions [SERVER NAME]`\n>Shows what is being played (sessions) using the Plex Server name provided (can be a partial name)\n'
        + '`/plex devices`\n>Shows what devices are associated to your Plex Account\n',
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }

  // tslint:disable-next-line:max-line-length
  private async getDataFromServer(serverName: string, serverEndpoint: string, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence, params?): Promise<any|undefined> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());
    if (!token) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No token detected! Please login first using `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    try {
      let serverChosen;
      let serverFound = false;
      const serversList = JSON.parse(servers);
      if (serversList && Array.isArray(serversList)) {
        serversList.forEach((server) => {
          if (!serverFound && server.name.toLowerCase().indexOf(serverName.toLowerCase()) !== -1) {
            serverChosen = server;
            serverFound = true;
          }
        });

        if (serverFound && serverFound === true) {
          const url = serverChosen.scheme + '://' + serverChosen.address + ':' + serverChosen.port + serverEndpoint;
          const headers = defaultHeaders;
          headers['X-Plex-Token'] = token;
          const response = await http.get(url, {headers, params});
          if (response && response.statusCode === 200 && response.content) {
            return {
              serverChosen,
              content: response.content,
            };
          } else if (response.statusCode === 400) {
            await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom(), persis);
            return;
          }
        } else {
          await msgHelper.sendNotification('Server Name not found for query `' + serverName + '`!', read, modify, context.getSender(), context.getRoom());
          return;
        }
      } else {
        await msgHelper.sendNotification('Server Name not found for query `' + serverName + '`!', read, modify, context.getSender(), context.getRoom());
        return;
      }
    } catch (e) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Error getting Sessions for server!', read, modify, context.getSender(), context.getRoom());
      return;
    }
  }

  private async processMediaTypesCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const mediaTypes = getMediaTypes();
    let text = '';
    mediaTypes.forEach((mediaType) => {
      text += '*' + mediaType.id + '* ' + mediaType.typeString + '\n';
    });
    text = text.substring(0, text.length - 1); // Remove last '\n'
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Media Types',
      },
      text,
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }

  private async processLoginCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, username, password] = context.getArguments();

    if (!username || !password) {
      await msgHelper.sendNotification('Usage: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    let url = 'https://plex.tv/users/sign_in.json?user[login]=' + username + '&user[password]=' + password;

    const headers = defaultHeaders;

    const loginResponse = await http.post(url, {headers});

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
      } else {
        await msgHelper.sendNotificationSingleAttachment({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'Login Failed!',
            link: 'https://app.plex.tv/desktop#!/account',
          },
          text: 'Failed to detect your Plex Token!',
        }, read, modify, context.getSender(), context.getRoom());
      }
    } else {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Login Failed!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Failed login to Plex!',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processServersCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    try {
      const serversList = JSON.parse(servers);
      if (serversList && Array.isArray(serversList)) {
        const userThumbUrl = await persistence.getUserThumb(context.getSender());
        await msgHelper.sendNotificationMultipleServerDetails(serversList, userThumbUrl, read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to parse servers!', e);
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No Servers stored!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Try logging in again: `/plex login [USERNAME] [PASSWORD]`',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processServerCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendNotification('Usage: `/plex server [SERVER NAME]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
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

        if (serverFound && serverFound === true) {
          const userThumbUrl = await persistence.getUserThumb(context.getSender());
          await msgHelper.sendNotificationMultipleServerDetails([serverChosen], userThumbUrl, read, modify, context.getSender(), context.getRoom());
        } else {
          await msgHelper.sendNotificationSingleAttachment({
            collapsed: false,
            color: '#e10000',
            title: {
              value: 'No Servers found!',
              link: 'https://app.plex.tv/desktop#!/account',
            },
            text: 'Could not find a server using the query `' + serverArg + '`!',
          }, read, modify, context.getSender(), context.getRoom());
        }
      }
    } catch (e) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to search for Server!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Error encountered when searching for server!',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processSearchCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const args = context.getArguments();
    if (args.length < 4) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/plex search [SERVER NAME] (mediatype) [QUERY]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const serverArg = args[1];
    const typeArg = args[2].toLowerCase().trim();
    // tslint:disable-next-line:max-line-length
    if (!typeArg) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/plex search [SERVER NAME] (mediatype) [QUERY]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const type = getMediaTypes().find((mediaType) => {
      return mediaType.typeString === typeArg;
    });
    let searchIndex = 3;
    if (!type) {
      // Bad type accepted, search defaults
      searchIndex = 2;
    }

    let searchArg = '';
    // tslint:disable-next-line:prefer-for-of
    for (let x = searchIndex; x < args.length; x++) {
      searchArg += args[x] + ' ';
    }
    searchArg = searchArg.trim();

    if (!serverArg || searchArg === '') {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/plex search [SERVER NAME] (mediatype) [QUERY]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const defaultTypes = '1,2,8,9,11,14'; // movie,show,artist,album,photoAlbum,clip
    const params = {
      query: searchArg,
      type: (type && type.id) ? type.id.toString() : defaultTypes,
    };

    const responseContent = await this.getDataFromServer(serverArg, '/search', context, read, modify, http, persis, params);

    try {
      const queryDisplay = serverArg + ' ' + (type ? typeArg + ' ' : 'all ') + searchArg;
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Metadata;
        if (actualResults && actualResults.length > 0) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, actualResults, queryDisplay, read, modify, context.getSender(), context.getRoom());
        } else {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], queryDisplay, read, modify, context.getSender(), context.getRoom());
        }
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], queryDisplay, read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return search results!', e);
      await msgHelper.sendNotification('Failed to return search results!', read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processOnDeckCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendNotification('Usage: `/plex on-deck [SERVER NAME]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const responseContent = await this.getDataFromServer(serverArg, '/library/onDeck', context, read, modify, http, persis);

    try {
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Metadata;
        if (actualResults && actualResults.length > 0) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, actualResults, serverArg + ' on-deck', read, modify, context.getSender(), context.getRoom());
        } else {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], serverArg + ' on-deck', read, modify, context.getSender(), context.getRoom());
        }
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], serverArg + ' on-deck', read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return On-Deck results!', e);
      await msgHelper.sendNotification('Failed to return On-Deck results!', read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processSessionsCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendNotification('Usage: `/plex sessions [SERVER NAME]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const responseContent = await this.getDataFromServer(serverArg, '/status/sessions', context, read, modify, http, persis);

    try {
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Metadata;
        if (actualResults && actualResults.length > 0) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, actualResults, serverArg + ' sessions', read, modify, context.getSender(), context.getRoom());
        } else {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], serverArg + ' sessions', read, modify, context.getSender(), context.getRoom());
        }
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], serverArg + ' sessions', read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return Session results!', e);
      await msgHelper.sendNotification('Failed to return Session results!', read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processDevicesCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());
    if (!token) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No token detected! Please login first using `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const url = 'https://plex.tv/devices.json';
    const headers = defaultHeaders;
    headers['X-Plex-Token'] = token;
    const response = await http.get(url, {headers});
    if (response && response.statusCode === 200 && response.content) {
      try {
        let devicesJson = JSON.parse(response.content);
        if (!devicesJson || !Array.isArray(devicesJson)) {
          devicesJson = new Array();
        }
        devicesJson.forEach((device) => {
          let lastSeen = device.lastSeenAt;
          if (lastSeen) {
            if (lastSeen.indexOf('Last seen:') !== -1) {
              lastSeen.replace('Last seen:', '');
            }
            lastSeen = lastSeen.trim();
            const lastSeenDate = new Date(Date.parse(lastSeen));
            let lastSeenDateOutput = lastSeenDate.toUTCString();
            if (lastSeenDateOutput.indexOf(' 00:00:00 GMT') !== -1) {
              lastSeenDateOutput = lastSeenDateOutput.replace(' 00:00:00 GMT', '');
            }
            device.lastSeenDate = lastSeenDate;
            device.lastSeenDateDisplay = lastSeenDateOutput;
          }
        });
        // Sort the requests by last seen date desc (newest first)
        devicesJson = devicesJson.sort((a, b) => {
          if (a.lastSeenDate && b.lastSeenDate) {
            if (a.lastSeenDate < b.lastSeenDate) {
              return -1;
            }
            if (a.lastSeenDate > b.lastSeenDate) {
              return 1;
            }
          }
          return 0;
        });
        devicesJson = devicesJson.reverse();
        await msgHelper.sendDevices(devicesJson, read, modify, context.getSender(), context.getRoom());
      } catch (e) {
        console.log('Failed to return Session results!', e);
        await msgHelper.sendNotification('Failed to return Session results!', read, modify, context.getSender(), context.getRoom());
      }
    } else if (response.statusCode === 400) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom(), persis);
    }
  }
}
