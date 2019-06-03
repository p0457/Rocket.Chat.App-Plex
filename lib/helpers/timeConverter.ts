export function secondsToString(seconds) {
  const numYears = Math.floor(seconds / 31536000);
  const numDays = Math.floor((seconds % 31536000) / 86400);
  const numHours = Math.floor(((seconds % 31536000) % 86400) / 3600);
  const numMinutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
  const numSeconds = (((seconds % 31536000) % 86400) % 3600) % 60;
  let result = '';
  if (numYears > 0) {
    result += numYears + ' years ';
  }
  if (numDays > 0) {
    result += numDays + ' days ';
  }
  if (numHours > 0) {
    result += numHours + ' hours ';
  }
  if (numMinutes > 0) {
    result += numMinutes + ' minutes ';
  }
  if (numSeconds > 0) {
    result += numSeconds + ' seconds ';
  }
  if (!result || result === '')  {
    result = '0 seconds';
  }
  return result.trim();
}
