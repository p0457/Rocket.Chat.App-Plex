import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { AppPersistence } from '../persistence';
import defaultHeaders from './defaultHeaders';
import * as msgHelper from './messageHelper';
import { PlexDTO } from '../PlexDTO';

export async function getServer(args: string[], read: IRead, modify: IModify, http: IHttp, persis: IPersistence, user: IUser, room: IRoom, slashCommand: string): Promise<PlexDTO> {
  const result = new PlexDTO();

  const [serverArg] = args;
  if (!serverArg) {
    result.item = {
      _ServerArg: serverArg,
    };
    result.error = 'noserverid';
    return result;
  }
  const persistence = new AppPersistence(persis, read.getPersistenceReader());
  const servers = await persistence.getUserServers(user);
  if (!servers) {
    result.error = 'noservers';
    return result;
  }
  try {
    let serverChosen;
    let serverFound = false;
    const serversList = JSON.parse(servers);
    if (!serversList || !Array.isArray(serversList)) {
      result.error = 'nonefound';
      return result;
    }
    serversList.forEach((server) => {
      if (!serverFound && server.name.toLowerCase().indexOf(serverArg.toLowerCase()) !== -1) {
        serverChosen = server;
        serverFound = true;
      }
    });
    result.item = {
      _ServerArg: serverArg,
      _ServerChosen: serverChosen,
    };

    if (serverFound && serverFound === true) {
      return result;
    } else {
      result.error = 'nonefound';
      return result;
    }
  } catch (e) {
    result.error = 'failedsearch';
    return result;
  }
}

export async function getAndSendServer(args: string[], read: IRead, modify: IModify, http: IHttp, persis: IPersistence, user: IUser, room: IRoom, slashCommand: string): Promise<void> {
  const serverResult = await getServer(args, read, modify, http, persis, user, room, slashCommand);

  if (serverResult.hasError()) {
    if (serverResult.error === 'noserverid') {
      await msgHelper.sendUsage(read, modify, user, room, slashCommand, 'No server name provided!');
      return;
    }
    if (serverResult.error === 'noservers') {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex-login [USERNAME] [PASSWORD]`', read, modify, user, room);
      return;
    }
    if (serverResult.error === 'failedsearch') {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to search for Server!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Error encountered when searching for server!',
      }, read, modify, user, room);
      return;
    }
    if (serverResult.error === 'nonefound') {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No Servers found!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Could not find a server using the query `' + serverResult.item._ServerArg + '`!',
      }, read, modify, user, room);
      return;
    }
  }

  const persistence = new AppPersistence(persis, read.getPersistenceReader());

  const userThumbUrl = await persistence.getUserThumb(user);
  await msgHelper.sendNotificationMultipleServerDetails([serverResult.item._ServerChosen], userThumbUrl, read, modify, user, room);
}

export async function getServers(read: IRead, modify: IModify, persis: IPersistence, user: IUser, room: IRoom): Promise<PlexDTO> {
  const result = new PlexDTO();

  const persistence = new AppPersistence(persis, read.getPersistenceReader());
  const servers = await persistence.getUserServers(user);
  if (!servers) {
    result.error = 'noservers';
    return result;
  }
  try {
    const serversList = JSON.parse(servers);
    if (serversList && Array.isArray(serversList)) {
      result.item = serversList;
    }
  } catch (e) {
    console.log('Failed to parse servers!', e);
    result.error = 'Failed to parse servers!';
    return result;
  }

  return result;
}

// tslint:disable-next-line:max-line-length
export async function getDataFromServer(serverName: string, serverEndpoint: string, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence, params?): Promise<any|undefined> {
  const persistence = new AppPersistence(persis, read.getPersistenceReader());

  const token = await persistence.getUserToken(context.getSender());
  if (!token) {
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification('No token detected! Please login first using `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
    return;
  }

  const servers = await persistence.getUserServers(context.getSender());
  if (!servers) {
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
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
        if (response && response.statusCode === 200) {
          return {
            serverChosen,
            statusCode: response.statusCode,
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
    console.log('Error getting data for server!', e);
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification('Error getting data for server!', read, modify, context.getSender(), context.getRoom());
    return;
  }
}

export function parseResources(resourcesXmlResponse: string) {
  const resources = new Array();

  let m;

  const resourcesTemp = new Array();
  // Unfortunately, XML only, and no libs available to me b/c of the platform
  const deviceRegex = new RegExp('<Device (.*?)<\/Device>', 'mgs');
  // tslint:disable-next-line:no-conditional-assignment
  while ((m = deviceRegex.exec(resourcesXmlResponse)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === deviceRegex.lastIndex) {
      deviceRegex.lastIndex++;
    }
    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex === 1) {
        resourcesTemp.push(match);
      }
    });
  }

  // Loop through resources
  resourcesTemp.forEach((resourceTemp) => {
    const nameRegex = new RegExp('name=\"(.*?)\"', 'mgs');
    let name = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = nameRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === nameRegex.lastIndex) {
        nameRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          name = match;
        }
      });
    }

    const productRegex = new RegExp('product=\"(.*?)\"', 'mgs');
    let product = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = productRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === productRegex.lastIndex) {
        productRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          product = match;
        }
      });
    }

    const productVersionRegex = new RegExp('productVersion=\"(.*?)\"', 'mgs');
    let productVersion = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = productVersionRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === productVersionRegex.lastIndex) {
        productVersionRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          productVersion = match;
        }
      });
    }

    const platformRegex = new RegExp('platform=\"(.*?)\"', 'mgs');
    let platform = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = platformRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === platformRegex.lastIndex) {
        platformRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          platform = match;
        }
      });
    }

    const platformVersionRegex = new RegExp('platformVersion=\"(.*?)\"', 'mgs');
    let platformVersion = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = platformVersionRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === platformVersionRegex.lastIndex) {
        platformVersionRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          platformVersion = match;
        }
      });
    }

    const device2Regex = new RegExp('device=\"(.*?)\"', 'mgs');
    let device2 = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = device2Regex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === device2Regex.lastIndex) {
        device2Regex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          device2 = match;
        }
      });
    }

    const clientIdentifierRegex = new RegExp('clientIdentifier=\"(.*?)\"', 'mgs');
    let clientIdentifier = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = clientIdentifierRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === clientIdentifierRegex.lastIndex) {
        clientIdentifierRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          clientIdentifier = match;
        }
      });
    }

    const publicAddressRegex = new RegExp('publicAddress=\"(.*?)\"', 'mgs');
    let publicAddress = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = publicAddressRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === publicAddressRegex.lastIndex) {
        publicAddressRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          publicAddress = match;
        }
      });
    }

    const accessTokenRegex = new RegExp('accessToken=\"(.*?)\"', 'mgs');
    let accessToken = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = accessTokenRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === accessTokenRegex.lastIndex) {
        accessTokenRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          accessToken = match;
        }
      });
    }

    const ownedRegex = new RegExp('owned=\"(.*?)\"', 'mgs');
    let owned = false;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = ownedRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === ownedRegex.lastIndex) {
        ownedRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          if (match === '1') {
            owned = true;
          }
        }
      });
    }

    const httpsRequiredRegex = new RegExp('httpsRequired=\"(.*?)\"', 'mgs');
    let httpsRequired = false;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = httpsRequiredRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === httpsRequiredRegex.lastIndex) {
        httpsRequiredRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          if (match === '1') {
            httpsRequired = true;
          }
        }
      });
    }

    const syncedRegex = new RegExp('synced=\"(.*?)\"', 'mgs');
    let synced = false;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = syncedRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === syncedRegex.lastIndex) {
        syncedRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          if (match === '1') {
            synced = true;
          }
        }
      });
    }

    const relayRegex = new RegExp('relay=\"(.*?)\"', 'mgs');
    let relay = false;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = relayRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === relayRegex.lastIndex) {
        relayRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          if (match === '1') {
            relay = true;
          }
        }
      });
    }

    const dnsRebindingProtectionRegex = new RegExp('dnsRebindingProtection=\"(.*?)\"', 'mgs');
    let dnsRebindingProtection = false;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = dnsRebindingProtectionRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === dnsRebindingProtectionRegex.lastIndex) {
        dnsRebindingProtectionRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          if (match === '1') {
            dnsRebindingProtection = true;
          }
        }
      });
    }

    const presenceRegex = new RegExp('presence=\"(.*?)\"', 'mgs');
    let presence = false;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = presenceRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === presenceRegex.lastIndex) {
        presenceRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          if (match === '1') {
            presence = true;
          }
        }
      });
    }

    const resource = {
      name, product, productVersion, platform, platformVersion, device: device2,
      clientIdentifier, publicAddress, accessToken, owned, httpsRequired, synced,
      relay, dnsRebindingProtection, presence, connections: new Array(),
    };

    const connectionsTextArr = new Array();
    const connectionsRegex = new RegExp('<Connection (.*?)\/>', 'mgs');
    // let connectionsText = '';
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = connectionsRegex.exec(resourceTemp)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === connectionsRegex.lastIndex) {
        connectionsRegex.lastIndex++;
      }
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          connectionsTextArr.push(match);
        }
      });
    }

    // Loop through connections for resource
    connectionsTextArr.forEach((connection) => {
      const protocolRegex = new RegExp('protocol=\"(.*?)\"', 'mgs');
      let protocol = '';
      // tslint:disable-next-line:no-conditional-assignment
      while ((m = protocolRegex.exec(connection)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === protocolRegex.lastIndex) {
          protocolRegex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            protocol = match;
          }
        });
      }

      const addressRegex = new RegExp('address=\"(.*?)\"', 'mgs');
      let address = '';
      // tslint:disable-next-line:no-conditional-assignment
      while ((m = addressRegex.exec(connection)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === addressRegex.lastIndex) {
          addressRegex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            address = match;
          }
        });
      }

      const portRegex = new RegExp('port=\"(.*?)\"', 'mgs');
      let port = '';
      // tslint:disable-next-line:no-conditional-assignment
      while ((m = portRegex.exec(connection)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === portRegex.lastIndex) {
          portRegex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            port = match;
          }
        });
      }

      const uriRegex = new RegExp('uri=\"(.*?)\"', 'mgs');
      let uri = '';
      // tslint:disable-next-line:no-conditional-assignment
      while ((m = uriRegex.exec(connection)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === uriRegex.lastIndex) {
          uriRegex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            uri = match;
          }
        });
      }

      const localRegex = new RegExp('local=\"(.*?)\"', 'mgs');
      let local = false;
      // tslint:disable-next-line:no-conditional-assignment
      while ((m = localRegex.exec(connection)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === localRegex.lastIndex) {
          localRegex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            if (match === '1') {
              local = true;
            }
          }
        });
      }

      const relay2Regex = new RegExp('local=\"(.*?)\"', 'mgs');
      let relay2 = false;
      // tslint:disable-next-line:no-conditional-assignment
      while ((m = relay2Regex.exec(connection)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === relay2Regex.lastIndex) {
          relay2Regex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 1) {
            if (match === '1') {
              relay2 = true;
            }
          }
        });
      }

      const connectionObj = {
        protocol, address, port, uri, local, relay: relay2,
      };

      resource.connections.push(connectionObj);
    });

    resources.push(resource);
  });

  return resources;
}

export async function getResources(ignoreOnFailed: boolean, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence) {
  const persistence = new AppPersistence(persis, read.getPersistenceReader());

  const token = await persistence.getUserToken(context.getSender());
  if (!token) {
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification('No token detected! Please login first using `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
    return;
  }
  const url = 'https://plex.tv/api/resources';

  const headers = defaultHeaders;
  headers['X-Plex-Token'] = token;

  const response = await http.get(url, {
    headers,
    params: {
      includeHttps: '1',
      includeRelay: '1',
    },
  });

  try {
    if ((!response || !response.content || response.statusCode !== 200) && ignoreOnFailed === false) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Failed to parse response!', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const xmlResponse = response.content;
    const resources = this.parseResources(xmlResponse);

    if (Array.isArray(resources)) {
      resources.forEach((resource) => {
        const resourceName = resource.name.toLowerCase();
        // Filter out browsers, since they don't do playback properly, apparently
        if (resourceName !== 'chrome' && resourceName !== 'edge' && resourceName !== 'firefox' && resourceName !== 'ie') {
          resource.hasAppropriateConnection = false;
          let appropriateConnections = resource.connections.filter((connection) => {
            return connection.local === false;
          });
          if (appropriateConnections.length > 1) {
            appropriateConnections = appropriateConnections.filter((connection) => {
              return connection.relay === true;
            });
          }
          const appropriateConnection = appropriateConnections[0];
          if (appropriateConnection) {
            resource.hasAppropriateConnection = true;
          }
        } else {
          resource.hasAppropriateConnection = false;
        }
      });
    }

    return resources;
  } catch (e) {
    console.log('Failed to parse response!', e);
    if (ignoreOnFailed === false) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Failed to parse response!', read, modify, context.getSender(), context.getRoom());
      return;
    }
  }
}
