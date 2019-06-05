export default {
  login: {
    command: 'plex-login',
    usage: '`/plex-login [USERNAME] [PASSWORD]`',
    description: 'Login to Plex',
  },
  servers: {
    command: 'plex-servers',
    usage: '`/plex-servers`',
    description: 'Show all Plex Media Servers authorized to your Plex account',
  },
  server: {
    command: 'plex-server',
    usage: '`/plex-server [SERVER NAME]`',
    description: 'Search for a Plex Server authorized to your Plex account by name',
  },
  search: {
    command: 'plex-search',
    usage: '`/plex-search [SERVER NAME] [mediatype] [QUERY]`',
    description: 'Search for media using the Plex Server name provided (can be a partial name)',
  },
  ondeck: {
    command: 'plex-ondeck',
    usage: '`/plex-ondeck [SERVER NAME]`',
    description: 'Shows what is On Deck using the Plex Server name provided (can be a partial name)',
  },
  sessions: {
    command: 'plex-sessions',
    usage: '`/plex-sessions [SERVER NAME]`',
    description: 'Shows what is being played (sessions) using the Plex Server name provided (can be a partial name)',
  },
  devices: {
    command: 'plex-devices',
    usage: '`/plex-devices`',
    description: 'Shows what devices are associated to your Plex Account',
  },
  libraries: {
    command: 'plex-libraries',
    usage: '`/plex-libraries [SERVER NAME]`',
    description: 'Shows the libraries for the Plex Server name provided (can be a partial name)',
  },
  scan: {
    command: 'plex-scan',
    usage: '`/plex-scan [SERVER NAME] [LIBRARY KEY|all]`',
    description: 'Scans the library for the Plex Server name provided (can be a partial name)',
  },
  playlists: {
    command: 'plex-playlists',
    usage: '`/plex-playlists [SERVER NAME]`',
    description: 'Shows the playlists for the Plex Server name provided (can be a partial name)',
  },
  resources: {
    command: 'plex-resources',
    usage: '`/plex-resources',
    description: 'Shows the resources for your Plex Account',
  },
};
