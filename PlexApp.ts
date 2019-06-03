import {
  IConfigurationExtend, IEnvironmentRead, ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { PlexCommand } from './commands/PlexCommand';
import { PlexDevicesCommand } from './commands/PlexDevicesCommand';
import { PlexLibrariesCommand } from './commands/PlexLibrariesCommand';
import { PlexLoginCommand } from './commands/PlexLoginCommand';
import { PlexOnDeckCommand } from './commands/PlexOnDeckCommand';
import { PlexScanCommand } from './commands/PlexScanCommand';
import { PlexSearchCommand } from './commands/PlexSearchCommand';
import { PlexServerCommand } from './commands/PlexServerCommand';
import { PlexServersCommand } from './commands/PlexServersCommand';
import { PlexSessionsCommand } from './commands/PlexSessionsCommand';

export class PlexApp extends App {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
      await configuration.settings.provideSetting({
        id: 'plex_name',
        type: SettingType.STRING,
        packageValue: 'Plex',
        required: true,
        public: false,
        i18nLabel: 'customize_name',
        i18nDescription: 'customize_name_description',
      });

      await configuration.settings.provideSetting({
        id: 'plex_icon',
        type: SettingType.STRING,
        packageValue: 'https://github.com/tgardner851/Rocket.Chat.App-Plex/raw/master/icon.png',
        required: true,
        public: false,
        i18nLabel: 'customize_icon',
        i18nDescription: 'customize_icon_description',
      });

      await configuration.slashCommands.provideSlashCommand(new PlexCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexLoginCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexServersCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexServerCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexSearchCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexOnDeckCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexSessionsCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexDevicesCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexLibrariesCommand(this));
      await configuration.slashCommands.provideSlashCommand(new PlexScanCommand(this));
    }
}
