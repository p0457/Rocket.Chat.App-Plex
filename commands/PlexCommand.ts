import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import { sendNotification } from '../lib/helpers/sendNotification';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

enum Command {
  Login = 'login',
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
        persistence.setUserToken(token, context.getSender());
        persistence.setUserId(userId, context.getSender());
        persistence.setUserUuid(userUuid, context.getSender());
        persistence.setUserThumb(userThumbUrl, context.getSender());
        await sendNotification('Successfully logged in and stored your Plex Token!', read, modify, context.getSender(), context.getRoom());
      } else {
        await sendNotification('Failed to detect your Plex Token!', read, modify, context.getSender(), context.getRoom());
      }
    } else {
      await sendNotification('Failed to login to Plex!', read, modify, context.getSender(), context.getRoom());
    }
  }
}
