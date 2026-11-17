export const convertDateTimeLocalToEpochMillis = (dateTimeLocal: string): number => {
  const date = new Date(dateTimeLocal)
  return date.getTime()
}

export const convertEpochMillisToDateTimeLocal = (epochMillis: number): string => {
  const date = new Date(epochMillis)
  const pad = (num: number) => num.toString().padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}
