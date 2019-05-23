export function formatServerText(server, includeNewline = true): string {
  let text = '';
  if (server.name) {
    text += server.name;
  } else {
    text += 'Unknown Name';
  }

  if (server.version) {
    text += ' v' + server.version;
  }

  if (server.sourceTitle && !server.owned) {
    text += ' (owned by ' + server.sourceTitle + ')';
  } else if (server.owned) {
    text += ' (you are the owner)';
  }

  if (server.scheme && server.address && server.port) {
    text += ' (' + server.scheme + '://' + server.address + ':' + server.port + ')';
  } else {
    text += ' (Address unknown)';
  }

  if (includeNewline) {
    text += '\n';
  }
  return text;
}
